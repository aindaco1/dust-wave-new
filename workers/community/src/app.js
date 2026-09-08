import { sha256Hex } from '@dustwave/worker-core/crypto';
import { API, CommunityError, fail, locale, newEvent, newScript, applyAction, allocate, monthView, upcoming, activeQueue, email, plain } from './domain.js';
import { loadState, commitState, getUpload } from './repository.js';
import { json, headers, bodyJson, verifyOrigin, requireAdmin, authRoute, requestLimit, siteOrigin, localMode } from './security.js';
import { uploadRoute, authorizeUpload } from './uploads.js';
import { renderCalendar, renderMeetings, unavailableMarkup, monthLabel, monthUrl, copy } from './render.js';

function checkRevision(data, state) {
  if (!Number.isSafeInteger(data.revision) || data.revision !== state.revision) fail('queue_changed', 409);
}
const attachmentCondition = upload => ({sql:"EXISTS (SELECT 1 FROM community_uploads WHERE id=? AND state='ready' AND expires_at>?)", args:[upload.id,Date.now()]});
const attachStatement = (db,upload) => ({guard,revision,mutation}) => db.prepare(`UPDATE community_uploads SET state='attached' WHERE id=? AND ${guard}`).bind(upload.id,revision,mutation);
async function submit(request, env, kind) {
  verifyOrigin(request,env); await requestLimit(request,env,'submit',20,3600);
  const data=await bodyJson(request);
  if (!/^[a-f0-9-]{36}$/u.test(data.submissionKey || '')) fail('invalid_fields');
  const keyHash=await sha256Hex(data.submissionKey);
  const payloadHash=await sha256Hex(JSON.stringify(data));
  const previous=await env.COMMUNITY_DB.prepare('SELECT * FROM community_receipts WHERE key_hash=?').bind(keyHash).first();
  if (previous) {
    if(previous.payload_hash!==payloadHash) fail('duplicate_submission',409);
    return json({ok:true,id:previous.record_id,pending:true});
  }
  const upload=await authorizeUpload(env.COMMUNITY_DB,data.uploadId,data.uploadToken,{ready:true});
  if(upload.kind!==(kind==='script'?'pdf':'image')) fail('invalid_upload');
  const before=await loadState(env.COMMUNITY_DB); const after=structuredClone(before);
  const record=kind==='script'?newScript(data,upload):newEvent(data,upload);
  after[kind==='script'?'scripts':'events'].push(record);
  await commitState(env.COMMUNITY_DB,before,after,{actor:'public',action:`submit_${kind}`,precondition:attachmentCondition(upload),extra:[
    attachStatement(env.COMMUNITY_DB,upload),
    ({guard,revision,mutation})=>env.COMMUNITY_DB.prepare(`INSERT INTO community_receipts(key_hash,payload_hash,record_id,created_at) SELECT ?,?,?,? WHERE ${guard}`).bind(keyHash,payloadHash,record.id,Date.now(),revision,mutation)
  ]});
  return json({ok:true,id:record.id,pending:true},201);
}
async function adminRoute(request,env,route) {
  if(!route.startsWith('/admin/'))return null;
  const session=await requireAdmin(request,env);
  if(route==='/admin/state'&&request.method==='GET') {
    const state=await loadState(env.COMMUNITY_DB);
    return json({...state,queue:activeQueue(state).map(s=>s.id)});
  }
  if(route==='/admin/actions'&&request.method==='POST') {
    const data=await bodyJson(request,128*1024); const before=await loadState(env.COMMUNITY_DB);checkRevision(data,before);
    if(data.kind!=='script'&&data.kind!=='event') fail('invalid_fields');
    if(data.action==='approve'&&data.kind==='event') {
      const event=before.events.find(e=>e.id===data.id);
      if(event?.kind==='event'&&!event.imageId) fail('invalid_image');
    }
    const after=applyAction(before,data);
    if(data.action==='edit') {
      const item=(data.kind==='script'?after.scripts:after.events).find(r=>r.id===data.id);
      if(data.fields.email!==undefined)item.email=email(data.fields.email);
      if(data.fields.contactName!==undefined)item.contactName=plain(data.fields.contactName,100);
    }
    if(data.preview===true) return json({revision:before.revision,meetings:upcoming(after,data.language),queue:activeQueue(after).map(s=>s.id)});
    await commitState(env.COMMUNITY_DB,before,after,{actor:session.email,action:`${data.kind}:${data.action}`});
    return json({ok:true,revision:after.revision});
  }
  if(route==='/admin/attach'&&request.method==='POST') {
    const data=await bodyJson(request); const before=await loadState(env.COMMUNITY_DB);checkRevision(data,before);
    const upload=await authorizeUpload(env.COMMUNITY_DB,data.uploadId,data.uploadToken,{ready:true});
    const after=structuredClone(before); const item=(data.kind==='script'?after.scripts:after.events).find(e=>e.id===data.id);
    if(!item)fail('not_found',404);
    if(data.kind==='script'&&upload.kind==='pdf'){item.pdfId=upload.id;item.pages=upload.pages;}
    else if(data.kind==='event'&&upload.kind==='image')item.imageId=upload.id;
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
    return new Response(file.body,{headers:headers({'Content-Type':'application/pdf','Content-Length':String(file.size),'Content-Disposition':'attachment; filename="writers-group-script.pdf"'})});
  }
  const preview=route.match(/^\/admin\/images\/([^/]+)$/u);
  if(preview&&request.method==='GET') {
    const upload=await getUpload(env.COMMUNITY_DB,preview[1]);
    const file=upload?.imagePrefix?await env.COMMUNITY_FILES.get(`${upload.imagePrefix}/320.webp`):null;
    if(!file)fail('not_found',404);
    return new Response(file.body,{headers:headers({'Content-Type':'image/webp'})});
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
async function composePage(request,env,card) {
  const url=new URL(request.url); const language=url.pathname.startsWith('/es/')?'es':'en';
  const isCalendar=url.pathname.endsWith('/microcinema.html');
  let markup,view,imageUrl,invalid=false,pageStatus=200;
  try {
    const state=await loadState(env.COMMUNITY_DB);
    if(isCalendar) {
      if(url.searchParams.getAll('month').length>1)fail('invalid_month');
      view=monthView(state,url.searchParams.get('month'),language);
      markup=renderCalendar(view,siteOrigin(env));
      imageUrl=await card(view,env);
    } else markup=renderMeetings(upcoming(state,language),language);
  } catch(error) {
    invalid=['invalid_month','month_unavailable'].includes(error.code);
    pageStatus=invalid?error.status:markup?200:503;
    if(!invalid)console.error('community_page_failed',markup?'card':'data');
    // Image generation failure must not take down a readable calendar.
    if(!markup)markup=unavailableMarkup(language,invalid);
  }
  const source=await originResponse(request,env);
  if(!source.ok||!source.headers.get('Content-Type')?.includes('text/html'))return source;
  const result=new Response(source.body,{...source,status:pageStatus,headers:source.headers});
  result.headers.set('Cache-Control','no-store');result.headers.delete('Content-Length');result.headers.delete('ETag');
  if(invalid||env.APP_MODE==='staging')result.headers.set('X-Robots-Tag','noindex, nofollow, noarchive');
  const rewriter=new HTMLRewriter().on('[data-community-slot="1"]',{element(element){element.setInnerContent(markup,{html:true});}});
  if(isCalendar&&view) {
    const title=`${monthLabel(view.month,language)} · Dust Wave Microcinema`;
    const canonical=monthUrl(view.month,language,siteOrigin(env));
    const description=`${copy(language).calendarTitle} · ${monthLabel(view.month,language)} · Albuquerque`;
    rewriter.on('title',{element(e){e.setInnerContent(title);}})
      .on('meta[property="og:title"],meta[name="twitter:title"]',{element(e){e.setAttribute('content',title);}})
      .on('meta[name="description"],meta[property="og:description"],meta[name="twitter:description"]',{element(e){e.setAttribute('content',description);}})
      .on('meta[property="og:url"]',{element(e){e.setAttribute('content',canonical);}})
      .on('link[rel="canonical"]',{element(e){e.setAttribute('href',canonical);}})
      .on('link[rel="alternate"][hreflang]',{element(e){const lang=e.getAttribute('hreflang')==='es'?'es':'en';e.setAttribute('href',monthUrl(view.month,lang,siteOrigin(env)));}})
      .on('[data-lang-switcher-link]',{element(e){const href=e.getAttribute('href')||'';e.setAttribute('href',monthUrl(view.month,href.includes('/es/')?'es':'en'));}});
    if(imageUrl) {
      rewriter.on('meta[property="og:image"],meta[property="og:image:secure_url"],meta[name="twitter:image"]',{element(e){e.setAttribute('content',new URL(imageUrl,siteOrigin(env)).href);}})
        .on('meta[property="og:image:alt"],meta[name="twitter:image:alt"]',{element(e){e.setAttribute('content',title);}})
        .on('meta[property="og:image:type"]',{element(e){e.setAttribute('content','image/png');}})
        .on('meta[property="og:image:width"]',{element(e){e.setAttribute('content','1200');}})
        .on('meta[property="og:image:height"]',{element(e){e.setAttribute('content','630');}});
    }
  }
  return rewriter.transform(result);
}
export function createApp({card}) {
  const app = {
    async fetch(request,env) {
      const url=new URL(request.url);
      try {
        if(url.pathname.startsWith(API)) {
          const route=url.pathname.slice(API.length);
          if(route==='/config'&&request.method==='GET')return json({siteKey:env.TURNSTILE_SITE_KEY||'',local:localMode(env),timezone:'America/Denver'});
          const auth=await authRoute(request,env,route);if(auth)return auth;
          const upload=await uploadRoute(request,env,route);if(upload)return upload;
          const admin=await adminRoute(request,env,route);if(admin)return admin;
          if(['/events','/scripts'].includes(route)&&request.method==='POST')return await submit(request,env,route==='/scripts'?'script':'event');
          if(route==='/calendar'&&request.method==='GET') {
            if(url.searchParams.getAll('month').length>1)fail('invalid_month');
            return json(monthView(await loadState(env.COMMUNITY_DB),url.searchParams.get('month'),locale(url.searchParams.get('language'))));
          }
          if(route==='/meetings'&&request.method==='GET')return json({meetings:upcoming(await loadState(env.COMMUNITY_DB),locale(url.searchParams.get('language')))});
          const image=route.match(/^\/images\/([a-f0-9-]{36})\/(320|640)\.webp$/u);
          if(image&&request.method==='GET') {
            const state=await loadState(env.COMMUNITY_DB);
            if(!state.events.some(e=>e.imageId===image[1]&&['published','cancelled'].includes(e.status)))fail('not_found',404);
            const upload=await getUpload(env.COMMUNITY_DB,image[1]);
            const file=upload?.imagePrefix?await env.COMMUNITY_FILES.get(`${upload.imagePrefix}/${image[2]}.webp`):null;
            if(!file)fail('not_found',404);
            return new Response(file.body,{headers:headers({'Content-Type':'image/webp','Cache-Control':'public, max-age=300'})});
          }
          if(/^\/cards\/(en|es)\/\d{4}-\d{2}\/[a-f0-9]{24}\.png$/u.test(route)&&request.method==='GET') {
            const file=await env.COMMUNITY_FILES.get(route.slice(1));if(!file)fail('not_found',404);
            return new Response(file.body,{headers:headers({'Content-Type':'image/png','Cache-Control':'public, max-age=31536000, immutable'})});
          }
          fail('not_found',404);
        }
        if(/^\/(es\/)?(microcinema|writers-group)\.html$/u.test(url.pathname)&&request.method==='GET')return await composePage(request,env,card);
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
    async fetch(request,env) {
      const head=request.method==='HEAD';
      const response=await app.fetch(head?new Request(request,{method:'GET'}):request,env);
      return head?new Response(null,response):response;
    }
  };
}
