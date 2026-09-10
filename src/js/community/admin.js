import { PasswordlessAdminSession } from '../dust-wave-admin-shell/passwordless-session.js';
import { mountAccessibleTabs } from '../dust-wave-admin-shell/tabs.js';
import { mountConfirmationDialog } from '../dust-wave-admin-shell/confirmation-dialog.js';
import { mountUnsavedChangesGuard } from '../dust-wave-admin-shell/unsaved-changes.js';
import { requestCredentialedBlob, triggerBlobDownload } from '../dust-wave-admin-shell/credentialed-download.js';
import { API, client, copy, language, errorText, el, button, mountChallenge, uploadFile } from './common.js';
import { mountUsers } from './users.js';

const $=selector=>document.querySelector(selector);
const login=$('[data-admin-login]'), workspace=$('[data-admin-workspace]'), status=$('[data-admin-status]');
const editor=$('[data-admin-editor]'), editorForm=$('[data-admin-editor-form]'), queueStatus=$('[data-queue-status]'), queueRetry=$('[data-queue-retry]'),queueDiscard=$('[data-queue-discard]'),syncStatus=$('[data-sync-status]');
const session=new PasswordlessAdminSession({client,endpoints:{start:'/admin/auth/start',exchange:'/admin/auth/exchange',session:'/admin/session',logout:'/admin/logout'}});
const confirmation=mountConfirmationDialog(document.body,{cancelLabel:copy.cancel,confirmLabel:copy.confirm});
let state,queueIds=[],challenge,editorDirty=false,editing=null,editorUpload=null,dragId='',busy=false,queueSaving=false,queueUncertain=false,editorSavePromise=null,editorTimer,editorError=false,editorUncertain=false,syncPromise=null,authenticated=false;
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const queueDirty=()=>Boolean(state&&(queueUncertain||!equal(queueIds,state.queue)));
const guard=mountUnsavedChangesGuard({hasUnsavedChanges:()=>editorDirty||queueDirty()||queueSaving||Boolean(editorSavePromise)||users.dirty()||users.saving()});
const discard=()=>guard.confirmTransition(copy.unsaved,()=>editorDirty||queueDirty()||queueSaving||Boolean(editorSavePromise));
const userPanel=$('#community-users');
const users=mountUsers($('[data-admin-users-form]'),{field,confirmDiscard:()=>guard.confirmTransition(copy.unsaved,()=>users.dirty()),onUnauthorized:unauthorized});
let tabsRole='';
function renderTabs(){
  users.setUser(state.currentUser);
  const role=state.currentUser.role;if(role===tabsRole)return;
  tabsRole=role;
  const root=$('[data-admin-tabs]'),list=el('div','',{role:'tablist','aria-label':copy.title});
  for(const name of ['events','queue','meetings',...(role==='super_admin'?['users']:[])])list.append(el('button',copy[name],{type:'button',id:`community-tab-${name}`,role:'tab','data-tab':name,'aria-controls':`community-${name}`}));
  root.querySelector('[role=tablist]').replaceWith(list);root.querySelector('.community-admin__mobile-tabs')?.remove();
  if(role==='super_admin')root.append(userPanel);else userPanel.remove();
  mountAccessibleTabs(root,{
    storageKey:'community:admin-tab',
    storage:{getItem(key){try{return sessionStorage.getItem(key);}catch{return null;}},setItem(key,value){try{sessionStorage.setItem(key,value);}catch{}}},
    responsiveSelect:{label:copy.dashboardSection,wrapperClass:'community-admin__mobile-tabs',labelClass:'',selectClass:''},
    onSelect:name=>{void syncAdmin();if(name==='users')void users.load(state?.usersRevision);}
  });
}
function unauthorized(error){if(error.status!==401&&error.code!=='forbidden')return false;showSession(false);status.textContent=copy.sessionExpired;return true;}

function report(error){if(!unauthorized(error))status.textContent=errorText(error);status.focus();}
function formatDate(date){return new Intl.DateTimeFormat(language,{dateStyle:'full',timeZone:'America/Denver'}).format(new Date(date));}
function statusLabel(value){return value==='read'?copy.readStatus:copy[value]||value;}
function showSession(active){
  authenticated=active;login.hidden=active;workspace.hidden=!active;workspace.inert=active&&!state;workspace.setAttribute('aria-busy',String(active&&!state));$('[data-admin-logout]').hidden=!active;
  if(!active){state=null;queueIds=[];editorDirty=false;clearTimeout(editorTimer);editor.close();editorUpload=null;editing=null;users.setUser(null);client.clearCsrfToken();for(const root of document.querySelectorAll('[data-admin-events],[data-admin-scripts],[data-admin-meetings],[data-admin-queue],[data-editor-fields]'))root.replaceChildren();}
}
async function refresh({force=false}={}){
  if(busy&&!force)return;
  if(!force&&!discard())return;
  state=await client.request('/admin/state');queueIds=[...state.queue];editorDirty=false;
  queueUncertain=false;queueStatus.textContent='';queueRetry.hidden=true;queueDiscard.hidden=true;syncStatus.textContent='';
  render();showSession(true);
}
function syncBlocked(){return !authenticated||document.hidden||busy||editor.open||editorDirty||queueDirty()||users.dirty()||users.saving()||Boolean(dragId)||Boolean(document.querySelector('.dw-admin-dialog[open]'));}
async function syncAdmin(){
  if(syncPromise||syncBlocked())return;
  const baseline=state;
  syncPromise=(async()=>{
    try{
      const current=await client.request('/admin/state');
      // A read begun before an edit or save cannot replace newer local work.
      if(syncBlocked()||state!==baseline)return;
      syncStatus.textContent='';
      if(current.revision!==state?.revision||current.usersRevision!==state?.usersRevision){
        const focus=document.activeElement,row=focus.closest('[data-queue-id],[data-record-id]');
        const selector=row?.hasAttribute('data-queue-id')?`[data-queue-id="${CSS.escape(row.dataset.queueId)}"]`:row?`[data-record-id="${CSS.escape(row.dataset.recordId)}"]`:'';
        const label=focus.textContent,control=focus.dataset.queueControl,scroll=window.scrollY;
        state=current;queueIds=[...current.queue];render();showSession(true);
        const updated=selector?document.querySelector(selector):null;
        const target=control?updated?.querySelector(`[data-queue-control="${CSS.escape(control)}"]`):[...(updated?.querySelectorAll('button')||[])].find(button=>button.textContent===label);
        target?.focus({preventScroll:true});window.scrollTo({top:scroll,behavior:'instant'});
      }
      if(tabsRole==='super_admin'&&!userPanel.hidden)void users.load(current.usersRevision);
      if(!baseline)status.textContent='';
      else if(status.textContent===copy.savedRefreshFailed)status.textContent=copy.actionDone;
    }catch(error){
      if(syncBlocked()||state!==baseline)return;
      if(unauthorized(error))return;
      syncStatus.textContent=copy.syncFailed;
    }
  })().finally(()=>{syncPromise=null;});
  return syncPromise;
}
window.addEventListener('focus',()=>void syncAdmin());
window.addEventListener('online',()=>void syncAdmin());
document.addEventListener('visibilitychange',()=>void syncAdmin());
window.addEventListener('pageshow',()=>void syncAdmin());
setInterval(()=>void syncAdmin(),30000);
editor.addEventListener('close',()=>void syncAdmin());
function render(focusId='',focusControl=''){
  renderTabs();
  const eventRoot=$('[data-admin-events]'),scriptRoot=$('[data-admin-scripts]'),meetingRoot=$('[data-admin-meetings]');
  const events=state.events.filter(e=>e.kind==='event').sort((a,b)=>a.date.localeCompare(b.date));
  eventRoot.replaceChildren(...events.map(e=>recordCard(e,'event')));
  if(!events.length)eventRoot.append(el('p',copy.noSubmissions));
  const inactive=state.scripts.filter(s=>!state.queue.includes(s.id)).sort((a,b)=>a.status==='pending'?-1:b.status==='pending'?1:0);
  scriptRoot.replaceChildren(...inactive.map(s=>recordCard(s,'script')));
  if(!inactive.length)scriptRoot.append(el('p',copy.noSubmissions));
  meetingRoot.replaceChildren(...state.events.filter(e=>e.kind==='meeting').sort((a,b)=>a.startsAt.localeCompare(b.startsAt)).map(e=>recordCard(e,'event')));
  renderQueue(focusId,focusControl);
}
function recordCard(item,kind){
  const card=el('article','',{class:'community-admin-card','data-record-id':item.id});
  const heading=el('h3',`${item.title}${kind==='script'?` — ${item.author}`:''}`);card.append(heading);
  card.append(el('span',statusLabel(item.status),{class:'community-admin-card__status','data-status':item.status}));
  const meta=[];
  if(item.date)meta.push(`${formatDate(item.startsAt)} · ${item.time}${item.endTime?'–'+item.endTime:''}`);
  if(item.pages)meta.push(`${item.pages} ${copy.pages}`);card.append(el('p',meta.join(' · '),{class:'community-admin-card__meta'}));
  if(kind==='script'&&item.fileName)card.append(fileNameLabel(item));
  if(item.description)card.append(el('p',item.description));
  if(item.imageId){card.append(el('img','',{src:`${API}/admin/images/${item.imageId}`,alt:'',width:80,height:80}));}
  if(item.agenda?.length){const list=el('ol');for(const s of item.agenda)list.append(el('li',`${s.title} — ${s.author}`));card.append(list);}
  const actions=el('div','',{class:'community-admin__actions'});
  actions.append(button(copy.edit,()=>openEditor(item,kind)));
  if(kind==='script'){
    actions.append(...scriptFileButtons(item));
    if(['pending','rejected','withdrawn'].includes(item.status))actions.append(button(copy.approve,()=>mutate(item,kind,'approve')));
    if(item.status==='pending')actions.append(button(copy.reject,()=>mutate(item,kind,'reject')));
    if(item.status==='approved')actions.append(button(copy.withdraw,()=>mutate(item,kind,'withdraw')),button(copy.read,()=>mutate(item,kind,'read')));
    if(['read','withdrawn'].includes(item.status))actions.append(button(copy.requeue,()=>mutate(item,kind,'requeue')));
  }else{
    if(item.kind==='event')actions.append(button(copy.image,()=>replaceFile(item,kind)));
    if(item.status!=='published')actions.append(button(item.status==='cancelled'?copy.restore:copy.approve,()=>mutate(item,kind,'approve')));
    if(item.status==='pending')actions.append(button(copy.reject,()=>mutate(item,kind,'reject')));
    if(item.status==='published')actions.append(button(copy.cancelEvent,()=>mutate(item,kind,'cancel')));
    actions.append(button(copy.deleteEvent,()=>mutate(item,kind,'delete'),{class:'community-admin__danger'}));
  }
  card.append(actions);
  if(item.email||item.contactName){const details=el('details'),summary=el('summary',copy.privateDetails);details.append(summary,el('p',[item.contactName,item.email].filter(Boolean).join(' · ')));card.append(details);}
  return card;
}
function fileNameLabel(item){return el('p',item.fileName,{class:'community-admin-card__meta','data-script-filename':''});}
function scriptFileButtons(item){
  return [button(copy.download,async()=>{
    try{triggerBlobDownload(await requestCredentialedBlob(`${API}/admin/scripts/${item.id}/pdf`,{allowedContentTypes:['application/pdf'],maximumBytes:10*1024*1024}),'writers-group-script.pdf');}catch(error){report(error);}
  }),button(copy.replacePdf,()=>replaceFile(item,'script'))];
}
async function mutate(item,kind,action){
  if(busy||!discard())return;
  const deleting=action==='delete';
  const result=await confirmation.open({title:deleting?copy.deleteEventTitle:copy.confirmAction,description:deleting?`${item.title}. ${copy.deleteEventDescription}`:item.title,confirmLabel:deleting?copy.deleteEvent:copy.confirm});
  if(!result.confirmed)return;
  busy=true;
  try{await client.request('/admin/actions',{method:'POST',body:{revision:state.revision,id:item.id,kind,action}});await refresh({force:true});status.textContent=copy.actionDone;}
  catch(error){report(error);}finally{busy=false;}
}
function clearDrag(){
  dragId='';
  for(const row of document.querySelectorAll('[data-queue-id]')){row.classList.remove('is-dragging');delete row.dataset.drop;}
}
function renderQueue(focusId='',focusControl=''){
  const root=$('[data-admin-queue]');
  root.replaceChildren(...queueIds.map((id,index)=>{
    const item=state.scripts.find(s=>s.id===id);const row=el('li','',{class:'community-admin-queue__item','data-queue-id':id});
    const position=el('span',String(index+1),{class:'community-admin-queue__position'});
    const text=el('div');text.append(el('strong',item.title),el('p',`${item.author} · ${item.pages} ${copy.pages}`));
    if(item.fileName)text.append(fileNameLabel(item));
    const meeting=state.events.find(e=>e.readings?.includes(id));if(meeting)text.append(el('small',`${copy.scheduledFor}: ${formatDate(meeting.startsAt)}`));
    const actions=el('div','',{class:'community-admin__actions'});
    const move=(direction)=>{const target=index+direction;if((busy&&!queueSaving)||target<0||target>=queueIds.length)return;const control=document.activeElement.dataset.queueControl;[queueIds[index],queueIds[target]]=[queueIds[target],queueIds[index]];renderQueue(id,control);void saveQueueOrder();};
    const grip=button('',()=>{}, {class:'community-admin-queue__grip',draggable:'true','data-queue-drag':'','data-queue-control':'drag','aria-label':`${copy.dragScript}: ${item.title}`,'aria-describedby':'community-queue-instructions',title:copy.dragScript});
    grip.append(el('span','⠿',{'aria-hidden':'true'}));position.prepend(grip);
    grip.addEventListener('keydown',event=>{if(['ArrowUp','ArrowDown'].includes(event.key)){event.preventDefault();move(event.key==='ArrowUp'?-1:1);}});
    const up=button(`↑ ${copy.moveUp}`,()=>move(-1),{'aria-label':`${copy.moveUp}: ${item.title}`,'data-queue-control':'up'});up.disabled=index===0;
    const down=button(`↓ ${copy.moveDown}`,()=>move(1),{'aria-label':`${copy.moveDown}: ${item.title}`,'data-queue-control':'down'});down.disabled=index===queueIds.length-1;
    actions.append(up,down,...scriptFileButtons(item),button(copy.edit,()=>openEditor(item,'script')),button(copy.withdraw,()=>mutate(item,'script','withdraw')));
    row.append(position,text,actions);
    grip.addEventListener('dragstart',event=>{
      if(busy&&!queueSaving){event.preventDefault();return;}dragId=id;row.classList.add('is-dragging');
      event.dataTransfer.effectAllowed='move';event.dataTransfer.setData('text/plain',id);event.dataTransfer.setDragImage(row,20,20);
    });
    const dropSide=event=>event.clientY<row.getBoundingClientRect().top+row.getBoundingClientRect().height/2?'before':'after';
    row.addEventListener('dragover',event=>{
      if(!dragId||dragId===id)return;event.preventDefault();event.dataTransfer.dropEffect='move';
      for(const sibling of root.children)delete sibling.dataset.drop;
      row.dataset.drop=dropSide(event);
    });
    row.addEventListener('dragleave',event=>{if(!row.contains(event.relatedTarget))delete row.dataset.drop;});
    row.addEventListener('drop',event=>{
      event.preventDefault();if((busy&&!queueSaving)||!dragId||dragId===id){clearDrag();return;}
      const moved=dragId,ids=queueIds.filter(key=>key!==moved);ids.splice(ids.indexOf(id)+(dropSide(event)==='after'?1:0),0,moved);
      clearDrag();queueIds=ids;renderQueue(moved,'drag');void saveQueueOrder();
    });
    grip.addEventListener('dragend',()=>{clearDrag();renderQueue(id,'drag');});return row;
  }));
  if(!queueIds.length)root.append(el('li',copy.noQueue));
  if(focusId){
    const row=root.querySelector(`[data-queue-id="${CSS.escape(focusId)}"]`);
    (row?.querySelector(`[data-queue-control="${CSS.escape(focusControl||'up')}"]:not(:disabled)`)||row?.querySelector('[data-queue-control="up"]:not(:disabled),[data-queue-control="down"]:not(:disabled)'))?.focus();
  }
}
async function saveScriptAction(body,matches){
  try{
    const result=await client.request('/admin/actions',{method:'POST',body:{...body,returnState:true}});
    const current=result.state||await client.request('/admin/state');
    if(!matches(current))throw Object.assign(new Error('queue_changed'),{code:'queue_changed',status:409});
    return current;
  }catch(error){
    // A lost response may follow a committed write. Read back only to confirm
    // this exact change; never rebase over another admin's conflicting edits.
    if(!error.status||error.status>=500||error.code==='queue_changed'){
      const current=await client.request('/admin/state').catch(()=>null);
      if(current&&matches(current))return current;
    }
    throw error;
  }
}
async function saveQueueOrder(){
  if(busy||!queueDirty())return;
  busy=true;queueSaving=true;queueRetry.hidden=true;queueDiscard.hidden=true;queueStatus.textContent=copy.saving;
  try{
    // Keep accepting moves while a request is in flight, then save the latest
    // order against the revision acknowledged by the preceding write.
    while(queueDirty()){
      const ids=[...queueIds];
      state=await saveScriptAction({kind:'script',action:'reorder',revision:state.revision,ids},current=>equal(current.queue,ids));
      queueUncertain=false;
      const focus=document.activeElement,focusId=focus.closest('[data-queue-id]')?.dataset.queueId;
      if(!dragId)render(focusId,focus.dataset.queueControl);
    }
    queueStatus.textContent=copy.actionDone;
  }catch(error){queueUncertain=true;queueStatus.textContent=`${copy.autosaveFailed} ${errorText(error)}`;queueRetry.hidden=false;queueDiscard.hidden=false;}
  finally{busy=false;queueSaving=false;}
}
queueRetry.addEventListener('click',()=>void saveQueueOrder());
queueDiscard.addEventListener('click',async()=>{
  if(busy||!discard())return;
  busy=true;
  try{await refresh({force:true});}catch(error){report(error);}finally{busy=false;}
});
function field(name,label,value='',{type='text',required=true,max=100,options}={}){
  const wrapper=el('label',label),input=el(options?'select':name==='description'?'textarea':'input','',{name,...(options?{}:name==='description'?{rows:2}:{type})});
  if(options)for(const [key,text]of options)input.append(el('option',text,{value:key}));
  input.value=value||'';input.required=required;input.maxLength=max;wrapper.append(input);return wrapper;
}
function openEditor(item,kind,{meeting=false}={}){
  if(busy||!discard())return;
  if(queueDirty()){queueIds=[...state.queue];queueUncertain=false;renderQueue();queueStatus.textContent='';queueRetry.hidden=true;queueDiscard.hidden=true;}
  clearTimeout(editorTimer);
  editing={id:item?.id,kind,revision:state.revision,submissionKey:crypto.randomUUID(),createAction:meeting?'create_meeting':'create_event'};editorDirty=false;editorUpload=null;editorError=false;editorUncertain=false;
  const addingScript=kind==='script'&&!item;
  $('#community-editor-heading').textContent=item?copy.edit:addingScript?copy.addScript:meeting?copy.addMeeting:copy.addEvent;
  if(meeting&&!item)item={...state.meetingDefaults};
  const root=$('[data-editor-fields]');root.replaceChildren(field('title',kind==='script'?copy.scriptTitle:copy.eventName,item?.title));
  if(kind==='script'&&item)root.prepend(el('p',copy.autosaveIntro));
  if(kind==='script'){
    root.append(field('author',copy.author,item?.author));
    if(addingScript){
      root.prepend(el('p',copy.addScriptIntro));
      const label=el('label',copy.pdf),input=el('input','',{type:'file',name:'file',accept:'application/pdf,.pdf',required:'','aria-describedby':'admin-script-pdf-help'});
      input.addEventListener('change',()=>{editorUpload=null;editing.submissionKey=crypto.randomUUID();});
      label.append(input);root.append(label,el('p',copy.pdfHelp,{id:'admin-script-pdf-help',class:'community-form__help'}));
    }
    root.append(field('contactName',copy.adminContactName,item?.contactName,{required:false}),field('email',copy.adminContactEmail,item?.email,{type:'email',required:false,max:254}));
  }
  else {
    const schedule=el('div','',{class:'community-editor__schedule'});
    schedule.append(field('date',copy.date,item?.date,{type:'date'}),field('time',copy.time,item?.time,{type:'time'}),field('endTime',copy.endTime,item?.endTime,{type:'time',required:false}));
    root.append(field('description',copy.description,item?.description,{max:240}),schedule);
  }
  if(kind!=='script'&&item?.email)root.append(field('contactName',copy.contactName,item.contactName),field('email',copy.email,item.email,{type:'email',max:254}));
  editorForm.querySelector('[type=submit]').textContent=addingScript?copy.addToQueue:meeting?copy.addMeeting:item?.status==='published'?copy.savePublish:copy.save;
  editorForm.querySelector('[type=submit]').hidden=Boolean(kind==='script'&&item);
  $('[data-editor-close]').textContent=kind==='script'&&item?copy.close:copy.cancel;
  $('[data-editor-refresh]').textContent=copy.useSavedVersion;
  $('[data-editor-status]').textContent='';$('[data-editor-refresh]').hidden=true;$('[data-editor-retry]').hidden=true;editor.showModal();
}
const editingScript=()=>editing?.kind==='script'&&Boolean(editing.id);
function scriptEditorFields(){
  const fields=Object.fromEntries(new FormData(editorForm));
  for(const key of Object.keys(fields))fields[key]=fields[key].normalize('NFC').replace(/\s+/gu,' ').trim();
  fields.email=fields.email.toLowerCase();return fields;
}
function scriptMatches(current,fields){
  const item=current.scripts.find(script=>script.id===editing.id);
  return item&&Object.entries(fields).every(([key,value])=>(item[key]||'')===value);
}
editorForm.addEventListener('input',()=>{
  editorDirty=true;
  if(!editingScript())return;
  editorDirty=editorUncertain||!scriptMatches(state,scriptEditorFields());editorError=false;
  clearTimeout(editorTimer);
  $('[data-editor-status]').textContent=editorDirty?copy.saving:copy.actionDone;
  $('[data-editor-retry]').hidden=true;
  editorTimer=setTimeout(()=>void saveScriptDetails(),600);
});
function saveScriptDetails(){
  clearTimeout(editorTimer);
  if(editorSavePromise)return editorSavePromise;
  if(!editingScript()||busy)return Promise.resolve(false);
  if(!editorDirty)return Promise.resolve(true);
  busy=true;editorError=false;$('[data-editor-retry]').hidden=true;$('[data-editor-refresh]').hidden=true;
  editorSavePromise=(async()=>{
    try{
      while(editorDirty){
        if(!editorForm.checkValidity()){$('[data-editor-status]').textContent=copy.autosaveInvalid;return false;}
        const fields=scriptEditorFields();$('[data-editor-status]').textContent=copy.saving;
        state=await saveScriptAction({kind:'script',id:editing.id,revision:editing.revision,action:'edit',fields},current=>scriptMatches(current,fields));
        editorUncertain=false;
        editing.revision=state.revision;queueIds=[...state.queue];
        editorDirty=!scriptMatches(state,scriptEditorFields());render();
      }
      $('[data-editor-status]').textContent=copy.actionDone;return true;
    }catch(error){
      editorError=true;editorUncertain=true;editorDirty=true;$('[data-editor-status]').textContent=`${copy.autosaveFailed} ${errorText(error)}`;
      $('[data-editor-retry]').hidden=false;$('[data-editor-refresh]').hidden=error.code!=='queue_changed';return false;
    }
  })().finally(()=>{busy=false;editorSavePromise=null;});
  return editorSavePromise;
}
$('[data-editor-retry]').addEventListener('click',()=>void saveScriptDetails());
async function closeEditor(){
  if(editingScript()){
    if(editorSavePromise&&!await editorSavePromise)return;
    if(editorDirty&&!editorError&&editorForm.checkValidity()&&!await saveScriptDetails())return;
  }
  if(busy||!guard.confirmTransition(copy.unsaved,()=>editorDirty))return;
  clearTimeout(editorTimer);editorDirty=false;editor.close();
}
$('[data-editor-close]').addEventListener('click',closeEditor);
editor.addEventListener('cancel',event=>{event.preventDefault();closeEditor();});
async function appendAtLatestRevision(create){
  try{return await create();}catch(error){
    if(error.code!=='queue_changed')throw error;
    // Appending a new record can safely use the latest queue. Editing an
    // existing record or order still requires an explicit conflict choice.
    state=await client.request('/admin/state');queueIds=[...state.queue];editing.revision=state.revision;render();
    return create();
  }
}
editorForm.addEventListener('submit',async event=>{
  event.preventDefault();if(editingScript()){void saveScriptDetails();return;}if(busy||!editorForm.reportValidity())return;
  const fields=Object.fromEntries(new FormData(editorForm)),file=fields.file;delete fields.file;
  const addingScript=editing.kind==='script'&&!editing.id;
  let saved=false;
  const controls=[...editorForm.elements];busy=true;controls.forEach(control=>{control.disabled=true;});
  $('[data-editor-status]').textContent=copy.sending;$('[data-editor-refresh]').hidden=true;
  try{
    if(addingScript){
      editorUpload ||= await uploadFile(file,'pdf','',{admin:true});
      const create=()=>client.request('/admin/scripts',{method:'POST',body:{...fields,revision:editing.revision,submissionKey:editing.submissionKey,uploadId:editorUpload.id,uploadToken:editorUpload.token}});
      await appendAtLatestRevision(create);
    }else{
      const save=()=>client.request('/admin/actions',{method:'POST',body:{...editing,action:editing.id?'edit':editing.createAction,fields}});
      await(editing.id?save():appendAtLatestRevision(save));
    }
    saved=true;editorDirty=false;editor.close();await refresh({force:true});status.textContent=addingScript?copy.scriptAdded:copy.actionDone;
  }
  catch(error){
    if(saved){status.textContent=copy.savedRefreshFailed;status.focus();return;}
    $('[data-editor-status]').textContent=errorText(error);
    $('[data-editor-refresh]').hidden=!editing.id||error.code!=='queue_changed';
    if(['upload_expired','upload_not_ready','upload_already_used'].includes(error.code||error.message))editorUpload=null;
  }finally{busy=false;controls.forEach(control=>{control.disabled=false;});}
});
$('[data-editor-refresh]').addEventListener('click',async()=>{
  if(busy||!editing?.id||!guard.confirmTransition(copy.unsaved,()=>editorDirty))return;
  clearTimeout(editorTimer);
  busy=true;
  try{
    state=await client.request('/admin/state');queueIds=[...state.queue];editing.revision=state.revision;render();
    const item=(editing.kind==='script'?state.scripts:state.events).find(record=>record.id===editing.id);
    if(!item)throw new Error('not_found');
    editorDirty=false;busy=false;openEditor(item,editing.kind);
  }catch(error){$('[data-editor-status]').textContent=errorText(error);}finally{busy=false;}
});
function replaceFile(item,kind){
  if(busy||!discard())return;
  const input=el('input','',{type:'file',accept:kind==='script'?'application/pdf,.pdf':'image/jpeg,image/png,image/webp'});
  input.addEventListener('change',async()=>{
    if(!input.files[0]||busy)return;busy=true;status.textContent=copy.sending;
    const revision=state.revision;
    try{const upload=await uploadFile(input.files[0],kind==='script'?'pdf':'image','',{admin:true});await client.request('/admin/attach',{method:'POST',body:{revision,id:item.id,kind,uploadId:upload.id,uploadToken:upload.token}});await refresh({force:true});status.textContent=copy.actionDone;}
    catch(error){report(error);}finally{busy=false;input.remove();}
  });input.hidden=true;document.body.append(input);input.click();
}
$('[data-admin-create]').addEventListener('click',()=>openEditor(null,'event'));
$('[data-admin-add-script]').addEventListener('click',()=>openEditor(null,'script'));
$('[data-admin-add-meeting]').addEventListener('click',()=>openEditor(null,'event',{meeting:true}));
$('[data-admin-logout]').addEventListener('click',async()=>{if(busy||!guard.confirmTransition(copy.unsaved))return;try{await session.logout();state=null;queueIds=[];showSession(false);}catch(error){report(error);}});
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
  try{const token=session.tokenFromFragment();if(token){session.clearFragment();await session.exchange(token);}else await session.restore();busy=true;showSession(true);status.textContent=copy.loading;await refresh({force:true});status.textContent='';}
  catch(error){if(error.status===401)showSession(false);else report(error);}
  finally{busy=false;}
  try{challenge=await mountChallenge(login.querySelector('[data-community-challenge]'),await client.request('/config',{csrf:false}),'community_login');}
  catch(error){if(!login.hidden)$('[data-login-status]').textContent=errorText(error);}
}
initialize();
