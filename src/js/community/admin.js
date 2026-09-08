import { PasswordlessAdminSession } from '../dust-wave-admin-shell/passwordless-session.js';
import { mountAccessibleTabs } from '../dust-wave-admin-shell/tabs.js';
import { mountConfirmationDialog } from '../dust-wave-admin-shell/confirmation-dialog.js';
import { mountUnsavedChangesGuard } from '../dust-wave-admin-shell/unsaved-changes.js';
import { setDirtyButtonState } from '../dust-wave-admin-shell/dirty-controls.js';
import { requestCredentialedBlob, triggerBlobDownload } from '../dust-wave-admin-shell/credentialed-download.js';
import { API, client, copy, language, errorText, el, button, mountChallenge, uploadFile } from './common.js';

const $=selector=>document.querySelector(selector);
const login=$('[data-admin-login]'), workspace=$('[data-admin-workspace]'), status=$('[data-admin-status]');
const editor=$('[data-admin-editor]'), editorForm=$('[data-admin-editor-form]'), previewButton=$('[data-admin-preview]'), saveQueue=$('[data-admin-save-queue]');
const session=new PasswordlessAdminSession({client,endpoints:{start:'/admin/auth/start',exchange:'/admin/auth/exchange',session:'/admin/session',logout:'/admin/logout'}});
const confirmation=mountConfirmationDialog(document.body,{cancelLabel:copy.cancel,confirmLabel:copy.confirm});
let state,queueIds=[],challenge,editorDirty=false,editing=null,dragId='',previewRevision=null,busy=false;
const queueDirty=()=>Boolean(state&&JSON.stringify(queueIds)!==JSON.stringify(state.queue));
const guard=mountUnsavedChangesGuard({hasUnsavedChanges:()=>editorDirty||queueDirty()});
const discard=()=>guard.confirmTransition(copy.unsaved);
mountAccessibleTabs($('[data-admin-tabs]'),{initialTab:'events'});

function report(error){status.textContent=errorText(error);status.focus();}
function formatDate(date){return new Intl.DateTimeFormat(language,{dateStyle:'full',timeZone:'America/Denver'}).format(new Date(date));}
function statusLabel(value){return value==='read'?copy.readStatus:copy[value]||value;}
function showSession(active){login.hidden=active;workspace.hidden=!active;$('[data-admin-logout]').hidden=!active;}
function updateDirty(){
  setDirtyButtonState(previewButton,queueDirty(),copy.preview,copy.preview);
  saveQueue.hidden=true;previewRevision=null;$('[data-admin-preview-result]').replaceChildren();
}
async function refresh({force=false}={}){
  if(!force&&!discard())return;
  state=await client.request('/admin/state');queueIds=[...state.queue];editorDirty=false;
  render();showSession(true);
}
function render(){
  const eventRoot=$('[data-admin-events]'),scriptRoot=$('[data-admin-scripts]'),meetingRoot=$('[data-admin-meetings]');
  const events=state.events.filter(e=>e.kind==='event').sort((a,b)=>a.date.localeCompare(b.date));
  eventRoot.replaceChildren(...events.map(e=>recordCard(e,'event')));
  if(!events.length)eventRoot.append(el('p',copy.noSubmissions));
  const inactive=state.scripts.filter(s=>!state.queue.includes(s.id)).sort((a,b)=>a.status==='pending'?-1:b.status==='pending'?1:0);
  scriptRoot.replaceChildren(...inactive.map(s=>recordCard(s,'script')));
  if(!inactive.length)scriptRoot.append(el('p',copy.noSubmissions));
  meetingRoot.replaceChildren(...state.events.filter(e=>e.kind==='meeting').sort((a,b)=>a.startsAt.localeCompare(b.startsAt)).map(e=>recordCard(e,'event')));
  renderQueue();updateDirty();
}
function recordCard(item,kind){
  const card=el('article','',{class:'community-admin-card'});
  const heading=el('h3',`${item.title}${kind==='script'?` — ${item.author}`:''}`);card.append(heading);
  const meta=[statusLabel(item.status)];
  if(item.date)meta.push(`${formatDate(item.startsAt)} · ${item.time}${item.endTime?'–'+item.endTime:''}`);
  if(item.pages)meta.push(`${item.pages} ${copy.pages}`);card.append(el('p',meta.join(' · '),{class:'community-admin-card__meta'}));
  if(item.description)card.append(el('p',item.description));
  if(item.imageId){card.append(el('img','',{src:`${API}/admin/images/${item.imageId}`,alt:'',width:80,height:80}));}
  if(item.agenda?.length){const list=el('ol');for(const s of item.agenda)list.append(el('li',`${s.title} — ${s.author}`));card.append(list);}
  const actions=el('div','',{class:'community-admin__actions'});
  const started=item.kind==='meeting'&&item.startsAt<=new Date().toISOString();
  if(!started)actions.append(button(copy.edit,()=>openEditor(item,kind)));
  if(kind==='script'){
    actions.append(...scriptFileButtons(item));
    if(['pending','rejected','withdrawn'].includes(item.status))actions.append(button(copy.approve,()=>mutate(item,kind,'approve')));
    if(item.status==='pending')actions.append(button(copy.reject,()=>mutate(item,kind,'reject')));
    if(item.status==='approved')actions.append(button(copy.withdraw,()=>mutate(item,kind,'withdraw')),button(copy.read,()=>mutate(item,kind,'read')));
    if(['read','withdrawn'].includes(item.status))actions.append(button(copy.requeue,()=>mutate(item,kind,'requeue')));
  }else if(!started){
    if(item.kind==='event')actions.append(button(copy.image,()=>replaceFile(item,kind)));
    if(item.status!=='published')actions.append(button(item.status==='cancelled'?copy.restore:copy.approve,()=>mutate(item,kind,'approve')));
    if(item.status==='pending')actions.append(button(copy.reject,()=>mutate(item,kind,'reject')));
    if(item.status==='published')actions.append(button(copy.cancelEvent,()=>mutate(item,kind,'cancel')));
  }
  card.append(actions);
  if(item.email){const details=el('details'),summary=el('summary',copy.privateDetails);details.append(summary,el('p',`${item.contactName||''} · ${item.email}`));card.append(details);}
  return card;
}
function scriptFileButtons(item){
  return [button(copy.download,async()=>{
    try{triggerBlobDownload(await requestCredentialedBlob(`${API}/admin/scripts/${item.id}/pdf`,{allowedContentTypes:['application/pdf'],maximumBytes:10*1024*1024}),'writers-group-script.pdf');}catch(error){report(error);}
  }),button(copy.replacePdf,()=>replaceFile(item,'script'))];
}
async function mutate(item,kind,action){
  if(busy||!discard())return;
  const result=await confirmation.open({title:copy.confirmAction,description:item.title,confirmLabel:copy.confirm});
  if(!result.confirmed)return;
  busy=true;
  try{await client.request('/admin/actions',{method:'POST',body:{revision:state.revision,id:item.id,kind,action}});await refresh({force:true});status.textContent=copy.actionDone;}
  catch(error){report(error);}finally{busy=false;}
}
function renderQueue(focusId=''){
  const root=$('[data-admin-queue]');
  root.replaceChildren(...queueIds.map((id,index)=>{
    const item=state.scripts.find(s=>s.id===id);const row=el('li','',{class:'community-admin-queue__item',draggable:'true','data-queue-id':id});
    const position=el('span',String(index+1),{class:'community-admin-queue__position'});
    const text=el('div');text.append(el('strong',item.title),el('p',`${item.author} · ${item.pages} ${copy.pages}`));
    const meeting=state.events.find(e=>e.readings?.includes(id));if(meeting)text.append(el('small',`${copy.scheduledFor}: ${formatDate(meeting.startsAt)}`));
    const actions=el('div','',{class:'community-admin__actions'});
    const move=(direction)=>{const target=index+direction;if(target<0||target>=queueIds.length)return;[queueIds[index],queueIds[target]]=[queueIds[target],queueIds[index]];renderQueue(id);updateDirty();status.textContent=`${item.title}: ${copy.position} ${target+1}`;};
    const up=button('↑',()=>move(-1),{'aria-label':`${copy.moveUp}: ${item.title}`});up.disabled=index===0;
    const down=button('↓',()=>move(1),{'aria-label':`${copy.moveDown}: ${item.title}`});down.disabled=index===queueIds.length-1;
    actions.append(up,down,...scriptFileButtons(item),button(copy.edit,()=>openEditor(item,'script')),button(copy.withdraw,()=>mutate(item,'script','withdraw')));
    row.append(position,text,actions);
    row.addEventListener('dragstart',event=>{dragId=id;event.dataTransfer.effectAllowed='move';event.dataTransfer.setData('text/plain',id);});
    row.addEventListener('dragover',event=>{if(dragId)event.preventDefault();});
    row.addEventListener('drop',event=>{event.preventDefault();if(!dragId||dragId===id)return;const old=queueIds.indexOf(dragId);if(old<0)return;queueIds.splice(old,1);queueIds.splice(index,0,dragId);renderQueue(dragId);updateDirty();dragId='';});
    row.addEventListener('dragend',()=>{dragId='';});return row;
  }));
  if(!queueIds.length)root.append(el('li',copy.noQueue));
  if(focusId)root.querySelector(`[data-queue-id="${CSS.escape(focusId)}"] button:not(:disabled)`)?.focus();
}
previewButton.addEventListener('click',async()=>{
  previewButton.disabled=true;
  const revision=state.revision, ids=[...queueIds];
  try{
    const result=await client.request('/admin/actions',{method:'POST',body:{kind:'script',action:'reorder',revision,ids,preview:true,language}});
    if(state.revision!==revision||JSON.stringify(queueIds)!==JSON.stringify(ids))return;
    const root=$('[data-admin-preview-result]');root.replaceChildren(el('h3',copy.previewTitle),el('p',copy.previewIntro));
    for(const meeting of result.meetings.filter(m=>m.readings.length))root.append(el('p',`${formatDate(meeting.startsAt)}: ${meeting.readings.map(s=>`${s.title} — ${s.author}`).join(' / ')}`));
    previewRevision=result.revision;saveQueue.hidden=false;
  }catch(error){report(error);}finally{previewButton.disabled=false;}
});
saveQueue.addEventListener('click',async()=>{
  if(previewRevision!==state.revision)return;
  saveQueue.disabled=true;
  try{await client.request('/admin/actions',{method:'POST',body:{kind:'script',action:'reorder',revision:previewRevision,ids:queueIds}});await refresh({force:true});status.textContent=copy.actionDone;}catch(error){report(error);}finally{saveQueue.disabled=false;}
});
function field(name,label,value='',{type='text',required=true,max=100}={}){
  const wrapper=el('label',label),input=el(name==='description'?'textarea':'input','',{name,...(name==='description'?{rows:2}:{type})});
  input.value=value||'';input.required=required;input.maxLength=max;wrapper.append(input);return wrapper;
}
function openEditor(item,kind){
  if(!discard())return;
  if(queueDirty()){queueIds=[...state.queue];renderQueue();updateDirty();}
  editing={id:item?.id,kind,revision:state.revision};editorDirty=false;
  const root=$('[data-editor-fields]');root.replaceChildren(field('title',kind==='script'?copy.scriptTitle:copy.eventName,item?.title));
  if(kind==='script')root.append(field('author',copy.author,item?.author));
  else root.append(field('description',copy.description,item?.description,{max:240}),field('date',copy.date,item?.date,{type:'date'}),field('time',copy.time,item?.time,{type:'time'}),field('endTime',copy.endTime,item?.endTime,{type:'time',required:false}));
  if(item?.email)root.append(field('contactName',copy.contactName,item.contactName),field('email',copy.email,item.email,{type:'email',max:254}));
  editorForm.querySelector('[type=submit]').textContent=item?.status==='published'?copy.savePublish:copy.save;
  $('[data-editor-status]').textContent='';editor.showModal();
}
editorForm.addEventListener('input',()=>{editorDirty=true;});
function closeEditor(){if(!guard.confirmTransition(copy.unsaved,()=>editorDirty))return;editorDirty=false;editor.close();}
$('[data-editor-close]').addEventListener('click',closeEditor);
editor.addEventListener('cancel',event=>{event.preventDefault();closeEditor();});
editorForm.addEventListener('submit',async event=>{
  event.preventDefault();if(!editorForm.reportValidity())return;
  const submit=editorForm.querySelector('[type=submit]');submit.disabled=true;
  try{await client.request('/admin/actions',{method:'POST',body:{...editing,action:editing.id?'edit':'create_event',fields:Object.fromEntries(new FormData(editorForm))}});editorDirty=false;editor.close();await refresh({force:true});status.textContent=copy.actionDone;}
  catch(error){$('[data-editor-status]').textContent=errorText(error);}finally{submit.disabled=false;}
});
function replaceFile(item,kind){
  if(!discard())return;
  const input=el('input','',{type:'file',accept:kind==='script'?'application/pdf,.pdf':'image/jpeg,image/png,image/webp'});
  input.addEventListener('change',async()=>{
    if(!input.files[0])return;status.textContent=copy.sending;
    const revision=state.revision;
    try{const upload=await uploadFile(input.files[0],kind==='script'?'pdf':'image','',{admin:true});await client.request('/admin/attach',{method:'POST',body:{revision,id:item.id,kind,uploadId:upload.id,uploadToken:upload.token}});await refresh({force:true});status.textContent=copy.actionDone;}
    catch(error){report(error);}finally{input.remove();}
  });input.hidden=true;document.body.append(input);input.click();
}
$('[data-admin-refresh]').addEventListener('click',()=>refresh().catch(report));
$('[data-admin-create]').addEventListener('click',()=>openEditor(null,'event'));
$('[data-admin-logout]').addEventListener('click',async()=>{if(!discard())return;try{await session.logout();state=null;queueIds=[];showSession(false);}catch(error){report(error);}});
login.addEventListener('submit',async event=>{
  event.preventDefault();const submit=login.querySelector('[type=submit]');submit.disabled=true;
  try{
    if(!challenge)throw new Error('challenge_required');
    const result=await session.start({email:login.elements.email.value,turnstileToken:challenge.token(),preferredLanguage:language});
    const message=$('[data-login-status]');message.textContent=copy.loginSent;
    if(result.localLoginUrl)message.append(el('a',copy.localLogin,{href:result.localLoginUrl,target:'_blank',rel:'noopener'}));
  }catch(error){$('[data-login-status]').textContent=errorText(error);}finally{submit.disabled=false;challenge?.reset();}
});
async function initialize(){
  try{const token=session.tokenFromFragment();if(token){session.clearFragment();await session.exchange(token);}else await session.restore();await refresh({force:true});}
  catch(error){showSession(false);if(error.status!==401)report(error);}
  try{challenge=await mountChallenge(login.querySelector('[data-community-challenge]'),await client.request('/config',{csrf:false}),'community_login');}
  catch(error){if(!login.hidden)$('[data-login-status]').textContent=errorText(error);}
}
initialize();
