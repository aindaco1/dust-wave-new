import { sha256Hex } from '@dustwave/worker-core/crypto';
import { API, MEETING_DEFAULTS, CommunityError, fail, locale, newScript, scriptContactFields, scriptPdfFields, pdfFilename, applyAction, allocate, upcoming, activeQueue } from './domain.js';
import { loadState, commitState, getUpload } from './repository.js';
import { json, headers, bodyJson, verifyOrigin, requireAdmin, authRoute, requestLimit, localMode, sendLogin } from './security.js';
import { loadUsers, saveUsers, publicAdmin, requireSuperAdmin } from './users.js';
import { uploadRoute, authorizeUpload } from './uploads.js';
import { renderMeetings, unavailableMarkup } from './render.js';
import { microcinemaUrl, retiredMicrocinema } from './retired-microcinema.js';
import { scriptEmailStatements, deliverScriptEmails, EMAIL_CRON } from './script-emails.js';

function checkRevision(data, state) {
  if (!Number.isSafeInteger(data.revision) || data.revision !== state.revision) fail('queue_changed', 409);
}
const attachmentCondition = upload => ({sql:"EXISTS (SELECT 1 FROM community_uploads WHERE id=? AND state='ready' AND expires_at>?)", args:[upload.id,Date.now()]});
const attachStatement = (db,upload) => ({guard,revision,mutation}) => db.prepare(`UPDATE community_uploads SET state='attached' WHERE id=? AND ${guard}`).bind(upload.id,revision,mutation);
const adminState = (state,session) => ({...state,events:state.events.filter(e=>e.kind==='meeting'&&e.status!=='deleted'),queue:activeQueue(state).map(s=>s.id),meetingDefaults:MEETING_DEFAULTS,currentUser:publicAdmin(session),usersRevision:session.usersRevision});
async function submit(request, env, session = null) {
  verifyOrigin(request,env); await requestLimit(request,env,'submit',20,3600);
  const data=await bodyJson(request);
  if (!/^[a-f0-9-]{36}$/u.test(data.submissionKey || '')) fail('invalid_fields');
  const keyHash=await sha256Hex(data.submissionKey);
  const payloadHash=await sha256Hex(JSON.stringify(data));
  const previous=await env.COMMUNITY_DB.prepare('SELECT * FROM community_receipts WHERE key_hash=?').bind(keyHash).first();
  if (previous) {
    if(previous.payload_hash!==payloadHash) fail('duplicate_submission',409);
    return json({ok:true,id:previous.record_id,pending:!session});
  }
  const upload=await authorizeUpload(env.COMMUNITY_DB,data.uploadId,data.uploadToken,{ready:true});
  if(upload.kind!=='pdf') fail('invalid_upload');
  const before=await loadState(env.COMMUNITY_DB); let after=structuredClone(before);
  if(session)checkRevision(data,before);
  const record=newScript(data,upload,new Date(),{admin:Boolean(session)});
  after.scripts.push(record);
  if(session)after=applyAction(after,{kind:'script',action:'approve',id:record.id});
  const emails=!session
    ? [...await scriptEmailStatements(env,'received',record),...await scriptEmailStatements(env,'admin',record)] : [];
  await commitState(env.COMMUNITY_DB,before,after,{actor:session?.email||'public',action:session?'script:create':'submit_script',precondition:attachmentCondition(upload),extra:[
    attachStatement(env.COMMUNITY_DB,upload),
    ({guard,revision,mutation})=>env.COMMUNITY_DB.prepare(`INSERT INTO community_receipts(key_hash,payload_hash,record_id,created_at) SELECT ?,?,?,? WHERE ${guard}`).bind(keyHash,payloadHash,record.id,Date.now(),revision,mutation),
    ...emails
  ]});
  return json({ok:true,id:record.id,pending:!session},201);
}
async function adminRoute(request,env,route) {
  if(!route.startsWith('/admin/'))return null;
  const session=await requireAdmin(request,env);
  if(route==='/admin/users') {
    requireSuperAdmin(session);
    if(request.method==='GET')return json(await loadUsers(env.COMMUNITY_DB));
    if(request.method==='POST'){
      await requestLimit(request,env,'users',30,900);
      const data=await bodyJson(request,65536),saved=await saveUsers(env.COMMUNITY_DB,data,session);
      const notifications={sent:[],failed:[]};
      for(const user of saved.added){
        // Local setup/tests never deliver email or expose another user's token.
        if(localMode(env))continue;
        try{await sendLogin(env,user.email,locale(data.preferredLanguage),{invitation:true});notifications.sent.push(user.email);}
        catch{notifications.failed.push(user.email);}
      }
      return json({revision:saved.revision,users:saved.users,notifications});
    }
    fail('not_found',404);
  }
  if(route==='/admin/scripts'&&request.method==='POST')return submit(request,env,session);
  if(route==='/admin/state'&&request.method==='GET') {
    const state=await loadState(env.COMMUNITY_DB);
    return json(adminState(state,session));
  }
  if(route==='/admin/actions'&&request.method==='POST') {
    const data=await bodyJson(request,128*1024); const before=await loadState(env.COMMUNITY_DB);checkRevision(data,before);
    if(data.kind!=='script'&&data.kind!=='event') fail('invalid_fields');
    if(data.kind==='event'&&(data.action==='create_event'||before.events.some(e=>e.id===data.id&&e.kind!=='meeting')))return retiredMicrocinema();
    const after=applyAction(before,data);
    if(data.action==='edit') {
      const item=(data.kind==='script'?after.scripts:after.events).find(r=>r.id===data.id);
      if(data.kind==='script')Object.assign(item,scriptContactFields({...item,...data.fields},{required:false}));
    }
    if(data.preview===true) return json({revision:before.revision,meetings:upcoming(after,data.language),queue:activeQueue(after).map(s=>s.id)});
    const firstApproval=data.kind==='script'&&data.action==='approve'&&!before.scripts.find(s=>s.id===data.id)?.approvedAt;
    const emails=firstApproval?await scriptEmailStatements(env,'approved',after.scripts.find(s=>s.id===data.id)):[];
    await commitState(env.COMMUNITY_DB,before,after,{actor:session.email,action:`${data.kind}:${data.action}`,extra:emails});
    return json({ok:true,revision:after.revision,...(data.returnState===true?{state:adminState(after,session)}:{})});
  }
  if(route==='/admin/attach'&&request.method==='POST') {
    const data=await bodyJson(request);
    if(data.kind!=='script')return retiredMicrocinema();
    const before=await loadState(env.COMMUNITY_DB);checkRevision(data,before);
    const upload=await authorizeUpload(env.COMMUNITY_DB,data.uploadId,data.uploadToken,{ready:true});
    const after=structuredClone(before); const item=after.scripts.find(e=>e.id===data.id);
    if(!item||item.status==='deleted')fail('not_found',404);
    if(data.kind==='script'&&upload.kind==='pdf')Object.assign(item,scriptPdfFields(upload));
    else fail('invalid_upload');
    await commitState(env.COMMUNITY_DB,before,after,{actor:session.email,action:'replace_upload',precondition:attachmentCondition(upload),extra:[attachStatement(env.COMMUNITY_DB,upload)]});
    return json({ok:true,revision:after.revision});
  }
  const download=route.match(/^\/admin\/scripts\/([^/]+)\/pdf$/u);
  if(download&&request.method==='GET') {
    const state=await loadState(env.COMMUNITY_DB); const script=state.scripts.find(s=>s.id===download[1]);
    const upload=script?await getUpload(env.COMMUNITY_DB,script.pdfId):null;
    if(!upload?.fileKey)fail('not_found',404);
    const file=await env.COMMUNITY_FILES.get(upload.fileKey);
    if(!file)fail('not_found',404);
    const filename=upload.fileName || pdfFilename(`${script.title} - ${script.author}`);
    return new Response(file.body,{headers:headers({'Content-Type':'application/pdf','Content-Length':String(file.size),'Content-Disposition':`attachment; filename="writers-group-script.pdf"; filename*=UTF-8''${encodeURIComponent(filename)}`})});
  }
  return null;
}
async function originResponse(request,env) {
  if(env.SITE_ASSETS) {
    const url=new URL(request.url);
    if(url.pathname.endsWith('/'))url.pathname+='index.html';
    const result=await env.SITE_ASSETS.fetch(new Request(url,request));
    return result;
  }
  if(env.SHELL_ORIGIN) {
    const url=new URL(request.url);const target=new URL(url.pathname+url.search,env.SHELL_ORIGIN);
    return fetch(new Request(target,{method:request.method,headers:{Accept:request.headers.get('Accept')||'*/*'}}));
  }
  // On a production Worker route, fetch forwards to the Pages origin.
  return fetch(request);
}
async function composePage(request,env) {
  const language=new URL(request.url).pathname.startsWith('/es/')?'es':'en';
  let markup,pageStatus=200;
  try { markup=renderMeetings(upcoming(await loadState(env.COMMUNITY_DB),language),language); }
  catch { pageStatus=503;markup=unavailableMarkup(language);console.error('community_page_failed','data'); }
  const source=await originResponse(request,env);
  if(!source.ok||!source.headers.get('Content-Type')?.includes('text/html'))return source;
  const result=new Response(source.body,{status:pageStatus,headers:source.headers});
  result.headers.set('Cache-Control','no-store');result.headers.delete('Content-Length');result.headers.delete('ETag');
  if(env.APP_MODE==='staging')result.headers.set('X-Robots-Tag','noindex, nofollow, noarchive');
  return new HTMLRewriter().on('[data-community-slot="1"]',{element(element){element.setInnerContent(markup,{html:true});}}).transform(result);
}
export function createApp() {
  const app = {
    async fetch(request,env) {
      const url=new URL(request.url);
      try {
        if(/^\/(es\/)?microcinema\.html$/u.test(url.pathname)&&request.method==='GET')return new Response(null,{status:301,headers:{Location:microcinemaUrl(url.pathname.startsWith('/es/')?'es':'en'),'Cache-Control':'public, max-age=3600'}});
        if(url.pathname.startsWith(API)) {
          const route=url.pathname.slice(API.length);
          if(['/events','/calendar'].includes(route)||/^\/(images|cards|admin\/images)(\/|$)/u.test(route))return retiredMicrocinema();
          if(route==='/config'&&request.method==='GET')return json({siteKey:localMode(env)&&env.LOCAL_CHALLENGE_BYPASS==='true'?'1x00000000000000000000AA':env.TURNSTILE_SITE_KEY||'',local:localMode(env),timezone:'America/Denver'});
          const auth=await authRoute(request,env,route);if(auth)return auth;
          const upload=await uploadRoute(request,env,route);if(upload)return upload;
          const admin=await adminRoute(request,env,route);if(admin)return admin;
          if(route==='/scripts'&&request.method==='POST')return await submit(request,env);
          if(route==='/meetings'&&request.method==='GET')return json({meetings:upcoming(await loadState(env.COMMUNITY_DB),locale(url.searchParams.get('language')))});
          fail('not_found',404);
        }
        if(/^\/(es\/)?writers-group\.html$/u.test(url.pathname)&&request.method==='GET')return await composePage(request,env);
        const response=await originResponse(request,env);
        if(/^\/(es\/)?admin\/community\/?$/u.test(url.pathname)||env.APP_MODE==='staging'){
          const safe=new Response(response.body,response);
          safe.headers.set('Cache-Control','private, no-store');
          safe.headers.set('X-Robots-Tag','noindex, nofollow, noarchive');
          safe.headers.set('X-Frame-Options','DENY');
          safe.headers.set('Referrer-Policy','no-referrer');
          return safe;
        }
        return response;
      } catch(error) {
        if(!(error instanceof CommunityError))console.error('community_request_failed',url.pathname.startsWith(API+'/admin/')?'admin':'public');
        return json({error:error instanceof CommunityError?error.code:'request_failed'},error instanceof CommunityError?error.status:500);
      }
    },
    async scheduled(_event,env) {
      await deliverScriptEmails(env);
      if(_event.cron===EMAIL_CRON)return;
      for(let attempt=0;attempt<3;attempt++) {
        const before=await loadState(env.COMMUNITY_DB);const after=allocate(structuredClone(before));
        if(JSON.stringify(before)!==JSON.stringify(after)) {
          try{await commitState(env.COMMUNITY_DB,before,after,{actor:'schedule',action:'extend'});}catch(error){if(error.code==='queue_changed'&&attempt<2)continue;throw error;}
        }
        break;
      }
      const db=env.COMMUNITY_DB;
      const expired=await db.prepare("SELECT * FROM community_uploads WHERE state!='attached' AND expires_at<? LIMIT 100").bind(Date.now()-82800000).all();
      for(const row of expired.results) {
        // Prefix cleanup also catches partially written and competing uploads.
        for(const prefix of [`private/${row.id}/`,`images/${row.id}/`]) {
          let cursor;
          do {
            const listing=await env.COMMUNITY_FILES.list({prefix,cursor,limit:1000});
            if(listing.objects.length)await env.COMMUNITY_FILES.delete(listing.objects.map(o=>o.key));
            cursor=listing.truncated?listing.cursor:undefined;
          }while(cursor);
        }
        await db.prepare("DELETE FROM community_uploads WHERE id=? AND state!='attached'").bind(row.id).run();
      }
      await db.batch(['community_auth_tokens','community_sessions','community_rate_limits'].map(table=>db.prepare(`DELETE FROM ${table} WHERE expires_at<?`).bind(Date.now())));
    }
  };
  return {
    scheduled: app.scheduled,
    async fetch(request,env,ctx) {
      const head=request.method==='HEAD';
      const response=await app.fetch(head?new Request(request,{method:'GET'}):request,env);
      if(response.ok&&request.method==='POST'&&ctx?.waitUntil&&[`${API}/scripts`,`${API}/admin/actions`].includes(new URL(request.url).pathname)) {
        ctx.waitUntil(deliverScriptEmails(env));
      }
      return head?new Response(null,response):response;
    }
  };
}
