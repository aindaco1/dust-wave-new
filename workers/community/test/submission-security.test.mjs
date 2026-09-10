import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import {Miniflare,convertV4MiniflareOptions} from 'miniflare';
import {PDFDocument} from 'pdf-lib';

test('public script uploads require server-verified Turnstile even if a production binding requests local bypass',async t=>{
  const origin='https://community-security.test';
  const bundle=await build({stdin:{contents:`
    import {createApp} from './src/app.js';
    const used=new Set();
    globalThis.fetch=async(url,options)=>{
      if(url!=='https://challenges.cloudflare.com/turnstile/v0/siteverify')throw new Error('Unexpected external request');
      const data=JSON.parse(options.body);
      if(data.secret!=='fixture-secret')throw new Error('Wrong provider configuration');
      const success=['accepted-fixture','wrong-action-fixture'].includes(data.response)&&!used.has(data.response);
      used.add(data.response);
      return Response.json({success,action:data.response==='wrong-action-fixture'?'community_login':'community_submit'});
    };
    export default createApp({});`,resolveDir:fileURLToPath(new URL('../',import.meta.url))},bundle:true,write:false,format:'esm',platform:'browser',target:'es2022'});
  const mf=new Miniflare(convertV4MiniflareOptions({workers:[{name:'challenge-security',modules:true,script:bundle.outputFiles[0].text,compatibilityDate:'2026-09-07',d1Databases:['COMMUNITY_DB'],r2Buckets:['COMMUNITY_FILES'],bindings:{SITE_BASE:origin,APP_MODE:'production',LOCAL_CHALLENGE_BYPASS:'true',TURNSTILE_SITE_KEY:'fixture-site',TURNSTILE_SECRET_KEY:'fixture-secret'}}]}));
  t.after(()=>mf.dispose());
  const db=await mf.getD1Database('COMMUNITY_DB');
  const sql=(await readFile(new URL('../migrations/0001_community.sql',import.meta.url),'utf8')).replace(/^--.*$/gm,'');
  await db.batch(sql.split(';').map(s=>s.trim()).filter(Boolean).map(s=>db.prepare(s)));
  const api=(path,body)=>mf.dispatchFetch(origin+'/api/community/v1'+path,{method:body?'POST':'GET',headers:{Origin:origin,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
  const config=await(await api('/config')).json();assert.equal(config.local,false);assert.equal(config.siteKey,'fixture-site');
  for(const token of ['', 'invalid-fixture','wrong-action-fixture']){
    const response=await api('/uploads',{kind:'pdf',turnstileToken:token,local:true});
    assert.equal(response.status,400);
    assert.equal((await db.prepare('SELECT COUNT(*) AS count FROM community_uploads').first()).count,0,'failed verification cannot issue an upload grant');
  }
  const grantResponse=await api('/uploads',{kind:'pdf',turnstileToken:'accepted-fixture',fileName:'Private script.pdf'});
  assert.equal(grantResponse.status,201);const grant=await grantResponse.json();
  assert.equal((await api('/uploads',{kind:'pdf',turnstileToken:'accepted-fixture'})).status,400,'a consumed token cannot request another upload');
  const pdf=await PDFDocument.create();pdf.addPage();
  assert.equal((await mf.dispatchFetch(origin+grant.url,{method:'PUT',headers:{Origin:origin,'x-upload-token':grant.token},body:await pdf.save()})).status,200);
  const fields={title:'Protected script',author:'Writer',contactName:'Test',email:'test@example.test',local:true,consent:true,submissionKey:crypto.randomUUID(),uploadId:grant.id,uploadToken:grant.token};
  assert.equal((await api('/scripts',{...fields,uploadToken:'unverified'})).status,403);
  const response=await api('/scripts',fields);assert.equal(response.status,201);assert.equal((await response.json()).pending,true);
});
