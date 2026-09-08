import { AdminApiClient } from '../dust-wave-admin-shell/api-client.js';
import { responsiveTurnstileSize } from '../dust-wave-admin-shell/turnstile.js';

export const API='/api/community/v1';
export const language=document.documentElement.lang==='es'?'es':'en';
export const copy=JSON.parse(document.getElementById('community-copy').textContent);
export const client=new AdminApiClient({baseUrl:API});
export function errorText(error){return copy.errors[error?.code]||copy.errors[error?.message]||(error instanceof TypeError?copy.errors.network_error:copy.errors.request_failed);}
export function el(tag,text='',attributes={}){
  const node=document.createElement(tag);if(text)node.textContent=text;
  for(const [key,value] of Object.entries(attributes))node.setAttribute(key,String(value));
  return node;
}
export function button(text,handler,attributes={}){
  const node=el('button',text,{type:'button',...attributes});
  node.addEventListener('click',handler);return node;
}
let turnstileScript;
export async function mountChallenge(root,config,action){
  if(config.local)return {token:()=>'',reset:()=>{}};
  if(!config.siteKey)throw new Error('challenge_not_configured');
  turnstileScript ||= new Promise((resolve,reject)=>{
    if(globalThis.turnstile){resolve();return;}
    const script=el('script','',{src:'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'});
    script.onload=resolve;script.onerror=()=>reject(new Error('challenge_unavailable'));document.head.append(script);
  });
  await turnstileScript;
  let token='',widget,size;
  const render=()=>{
    if(root.getBoundingClientRect().width<=0)return;
    const nextSize=responsiveTurnstileSize(root);
    if(nextSize===size)return;
    // Flexible widgets have a minimum width. Recreate only when crossing the
    // shared compact threshold, including after rotation or resizing a window.
    token='';
    if(widget!==undefined)globalThis.turnstile.remove(widget);
    size=nextSize;
    widget=globalThis.turnstile.render(root,{sitekey:config.siteKey,action,theme:'auto',size,language,
      callback:value=>{token=value;},'expired-callback':()=>{token='';},'error-callback':()=>{token='';}});
  };
  render();
  new ResizeObserver(render).observe(root);
  return {token(){if(!token)throw new Error('challenge_required');return token;},reset(){token='';globalThis.turnstile.reset(widget);}};
}
export async function uploadFile(file,kind,token,{admin=false}={}){
  if(!file||file.size>(kind==='pdf'?10:5)*1024*1024)throw new Error('file_too_large');
  const grant=await client.request(admin?'/admin/uploads':'/uploads',{method:'POST',body:{kind,turnstileToken:token},csrf:admin});
  const response=await fetch(grant.url,{method:'PUT',headers:{'Content-Type':file.type||'application/octet-stream','x-upload-token':grant.token},body:file,credentials:'same-origin'});
  const result=await response.json();if(!response.ok)throw new Error(result.error||'request_failed');
  return {id:grant.id,token:grant.token,pages:result.pages};
}
