import test from 'node:test';
import assert from 'node:assert/strict';
import {Miniflare,convertV4MiniflareOptions} from 'miniflare';
import {createApp} from '../src/app.js';
import {saveUsers} from '../src/users.js';
import {migrateFixture} from './fixtures.mjs';

const origin='http://localhost:8787',prefix='/api/community/v1';
const superUser={name:'Test admin',email:'admin@example.test',role:'super_admin'};
const limited={name:'Limited writer',email:'writer@example.test',role:'limited_admin'};
async function fixture(t,{seedOwner=superUser.email}={}){
 const mf=new Miniflare(convertV4MiniflareOptions({workers:[{name:'community-users-test',modules:true,script:'export default {fetch(){return new Response("fixture")}}',compatibilityDate:'2026-09-07',d1Databases:['COMMUNITY_DB']}]}));
 t.after(()=>mf.dispose());const db=await mf.getD1Database('COMMUNITY_DB');await migrateFixture(db,{adminEmail:seedOwner});
 const messages=[];let emailFails=false;
 const env={SITE_BASE:origin,APP_MODE:'local',LOCAL_CHALLENGE_BYPASS:'true',COMMUNITY_DB:db,LOGIN_FROM:'community@example.test',EMAIL:{async send(message){if(emailFails)throw new Error('provider failed');messages.push(message);return {messageId:'fixture'};}}};
 const app=createApp({card:async()=>'/fixture.png'});
 async function call(path,{user,body,headers={},mode,method=body?'POST':'GET'}={}){
   return app.fetch(new Request(origin+prefix+path,{method,headers:{Origin:origin,...(body?{'Content-Type':'application/json'}:{}),...(user?{Cookie:user.cookie,'x-dustwave-csrf':user.csrfToken}:{}),...headers},...(body?{body:JSON.stringify(body)}:{})}),mode?{...env,APP_MODE:mode}:env);
 }
 async function ok(path,options){const r=await call(path,options),data=await r.json();assert(r.ok,JSON.stringify(data));return data;}
 async function login(address){
   await db.prepare('DELETE FROM community_rate_limits').run();
   const start=await ok('/admin/auth/start',{body:{email:address}});
   assert(start.localLoginUrl);const token=new URL(start.localLoginUrl).hash.slice('#magic-link='.length);
   const response=await call('/admin/auth/exchange',{body:{token}});assert.equal(response.status,200);
   return {...await response.json(),cookie:response.headers.get('set-cookie').split(';')[0]};
 }
 return {db,env,call,ok,login,messages,setEmailFailure(value){emailFails=value;}};
}

test('Community users enforce Store-style roles, validation and self-account protection',async t=>{
 const f=await fixture(t),{ok,call,login}=f,owner=await login(superUser.email);
 assert.equal(owner.user.role,'super_admin');
 assert.equal((await call('/admin/users')).status,401);
 let saved=await ok('/admin/users',{user:owner});assert.equal(saved.users.length,1);
 const save=users=>call('/admin/users',{user:owner,body:{revision:saved.revision,users}});
 for(const [users,error] of [
  [[], 'last_super_admin'],
  [[{...superUser,role:'limited_admin'}],'last_super_admin'],
  [[superUser,{...limited,email:superUser.email.toUpperCase()}],'duplicate_user_email'],
  [[superUser,{...limited,email:'not-email'}],'invalid_user_email'],
  [[superUser,{...limited,role:'owner'}],'invalid_role'],
  [[{...superUser,email:'new@example.test'}],'self_admin_change'],
  [[{...limited,role:'super_admin'}],'self_admin_change']
 ]){const response=await save(users);assert.equal(response.status,422);assert.equal((await response.json()).error,error);assert.deepEqual(await ok('/admin/users',{user:owner}),saved);}
 assert.equal((await call('/admin/users',{user:owner,body:{revision:0,users:[superUser,limited]},headers:{Origin:'https://elsewhere.test'}})).status,403);
 assert.equal((await call('/admin/users',{user:owner,body:{revision:0,users:[superUser,limited]},headers:{'x-dustwave-csrf':'bad'}})).status,403);
 saved=await ok('/admin/users',{user:owner,body:{revision:saved.revision,users:[{...superUser,name:'  My updated name  '},limited]}});
 assert.equal(saved.users[0].name,'My updated name');assert.equal(f.messages.length,0,'local user creation never sends email');
 const writer=await login(limited.email);
 assert.equal(writer.user.role,'limited_admin');
 assert.equal((await call('/admin/users',{user:writer})).status,403);
 assert.equal((await call('/admin/users',{user:writer,body:{revision:saved.revision,users:[{...limited,role:'super_admin'}]}})).status,403);
 const state=await ok('/admin/state',{user:writer});assert.equal(state.currentUser.role,'limited_admin');assert(!('users' in state));
 const action=await ok('/admin/actions',{user:writer,body:{revision:state.revision,kind:'event',action:'create_meeting',fields:{title:'Limited admin reading',description:'A reading.',date:'2026-10-05',time:'19:00',endTime:'21:00'}}});assert(action.ok);
 await assert.rejects(saveUsers(f.db,{revision:saved.revision,users:[{...limited,role:'super_admin'},...saved.users.filter(user=>user.email!==limited.email)]},{...limited,role:'super_admin'}),error=>error.code==='forbidden');
 const publicData=JSON.stringify(await ok('/meetings'));assert(!publicData.includes(superUser.email));assert(!publicData.includes(limited.email));
});

test('editing identity or role and deleting users revoke sessions and pending links immediately',async t=>{
 const {ok,call,login,db}=await fixture(t),owner=await login(superUser.email);
 let saved=await ok('/admin/users',{user:owner,body:{revision:0,users:[superUser,{...limited,role:'super_admin'}]}});
 const other=await login(limited.email);
 await db.prepare('DELETE FROM community_rate_limits').run();
 const pending=await ok('/admin/auth/start',{body:{email:limited.email}}),oldToken=new URL(pending.localLoginUrl).hash.slice('#magic-link='.length);
 saved=await ok('/admin/users',{user:owner,body:{revision:saved.revision,users:[superUser,limited]}});
 assert.equal((await call('/admin/state',{user:other})).status,401);
 assert.equal((await call('/admin/auth/exchange',{body:{token:oldToken}})).status,401);
 const downgraded=await login(limited.email);assert.equal((await call('/admin/users',{user:downgraded})).status,403);
 const renamed={...limited,email:'renamed@example.test'};
 saved=await ok('/admin/users',{user:owner,body:{revision:saved.revision,users:[superUser,renamed]}});
 assert.equal((await call('/admin/state',{user:downgraded})).status,401);
 const renameLogin=await login(renamed.email);
 await ok('/admin/users',{user:owner,body:{revision:saved.revision,users:[superUser]}});
 assert.equal((await call('/admin/state',{user:renameLogin})).status,401);
 assert.equal((await db.prepare('SELECT count(*) AS count FROM community_sessions WHERE email<>?').bind(superUser.email).first()).count,0);
});

test('concurrent user changes are atomic and cannot overwrite a newer directory',async t=>{
 const {ok,call,login,db}=await fixture(t),owner=await login(superUser.email);
 const attempts=await Promise.all(['First','Second'].map(name=>call('/admin/users',{user:owner,body:{revision:0,users:[{...superUser,name},limited]}})));
 assert.deepEqual(attempts.map(r=>r.status).sort(),[200,409]);
 const result=await ok('/admin/users',{user:owner});assert.equal(result.revision,1);assert.equal(result.users.length,2);
 assert.equal((await db.prepare("SELECT count(*) AS count FROM community_audit WHERE action='users:update'").first()).count,1);
});

test('access email failures preserve saved users; retries do not send duplicate invitations',async t=>{
 const f=await fixture(t),{ok,login}=f,owner=await login(superUser.email);
 const one=await ok('/admin/users',{user:owner,mode:'production',body:{revision:0,users:[superUser,limited],preferredLanguage:'es'}});
 assert.deepEqual(one.notifications.sent,[limited.email]);assert.equal(f.messages.length,1);assert(f.messages[0].text.includes('/es/admin/community/#magic-link='));
 const two=await ok('/admin/users',{user:owner,mode:'production',body:{revision:one.revision,users:one.users}});assert.equal(f.messages.length,1);
 f.setEmailFailure(true);
 const three=await ok('/admin/users',{user:owner,mode:'production',body:{revision:two.revision,users:[...two.users,{...limited,email:'failed@example.test'}]}});
 assert.deepEqual(three.notifications.failed,['failed@example.test']);assert.equal(three.users.length,3);
 assert.equal((await f.db.prepare('SELECT count(*) AS count FROM community_auth_tokens WHERE email=?').bind('failed@example.test').first()).count,0,'a rejected email cannot leave a usable token');
});

test('Community ignores legacy allowlists and other applications; migration seeds the requested Super-admin',async t=>{
 const f=await fixture(t,{seedOwner:null}),{env,ok,call,db}=f;env.COMMUNITY_ADMIN_EMAILS='alonso@hey.com,outsider@example.test';
 const unknown=await ok('/admin/auth/start',{body:{email:'alonso@hey.com'}});assert.equal(unknown.localLoginUrl,undefined);
 await db.prepare('DELETE FROM community_rate_limits').run();
 assert.equal((await ok('/admin/auth/start',{body:{email:'outsider@example.test'}})).localLoginUrl,undefined);
 const owner=await f.login('alonso@dustwave.xyz');
 assert.equal(owner.user.role,'super_admin');
 assert.equal((await call('/admin/users',{headers:{Cookie:owner.cookie.replace('dw_community_session','store_admin_session')}})).status,401);
 assert.deepEqual((await ok('/admin/users',{user:owner})).users,[{name:'',email:'alonso@dustwave.xyz',role:'super_admin'}]);
});
