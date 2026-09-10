import {client,copy,language,errorText,el,button} from './common.js';

export function mountUsers(form,{field,confirmDiscard,onUnauthorized}) {
  const list=form.querySelector('[data-users-list]'),status=form.querySelector('[data-users-status]'),save=form.querySelector('[data-users-save]'),add=form.querySelector('[data-user-add]'),discard=form.querySelector('[data-users-discard]');
  let currentUser=null,snapshot=null,draft=[],selfDraft=null,loading=null,saving=false,generation=0;
  const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  const dirty=()=>Boolean(snapshot&&!equal(draft,snapshot.users));
  const sync=()=>{save.disabled=saving||Boolean(loading)||!dirty();add.disabled=saving||Boolean(loading)||!snapshot||draft.length>=100;discard.hidden=!dirty();discard.disabled=saving||Boolean(loading);};
  function setSnapshot(value){
    if(snapshot&&!dirty()&&equal(snapshot.users,value.users)){snapshot.revision=value.revision;sync();return;}
    const active=document.activeElement,row=active.closest('[data-user-card]'),address=row?.querySelector('[name=email]').value,key=active.name;
    snapshot={revision:value.revision,users:value.users};draft=structuredClone(value.users);selfDraft=draft.find(user=>user.email===currentUser.email);render();
    if(address&&key)[...list.children].find(card=>card.querySelector('[name=email]').value===address)?.querySelector(`[name="${CSS.escape(key)}"]`)?.focus({preventScroll:true});
  }
  function render(){
    list.replaceChildren(...draft.map((user,index)=>{
      const self=user===selfDraft,card=el('section','',{class:'community-admin-card community-user','data-user-card':''});
      card.append(el('h3',user.email||copy.newUser));
      if(self)card.append(el('p',copy.currentUserHelp,{class:'community-form__help'}));
      card.append(field('name',copy.userName,user.name,{required:false}),field('email',copy.userEmail,user.email,{type:'email',max:254}),field('role',copy.userRole,user.role,{options:[['limited_admin',copy.limitedAdmin],['super_admin',copy.superAdmin]]}));
      card.querySelector('[name=email]').readOnly=self;card.querySelector('[name=role]').disabled=self;
      const remove=button(copy.deleteUser,()=>{draft.splice(index,1);render();},{class:'community-admin__danger','aria-label':`${copy.deleteUser}: ${user.email||copy.newUser}`});
      remove.disabled=self;if(self)remove.title=copy.currentUserHelp;card.append(remove);
      const edit=()=>{for(const key of ['name','email','role'])user[key]=card.querySelector(`[name=${key}]`).value;sync();};
      card.addEventListener('input',edit);card.addEventListener('change',edit);return card;
    }));sync();
  }
  async function load(revision,{force=false}={}){
    if(!currentUser||loading||saving||(!force&&(dirty()||snapshot?.revision===revision)))return loading;
    const ownGeneration=generation,baseline=snapshot;status.textContent=copy.loading;if(force)list.inert=true;
    loading=(async()=>{
      try{
        const result=await client.request('/admin/users');
        if(ownGeneration!==generation||!currentUser)return;
        if(saving||snapshot!==baseline||result.revision<snapshot?.revision)return;
        if(dirty()&&!force){status.textContent='';return;}
        setSnapshot(result);status.textContent='';
      }catch(error){if(ownGeneration===generation&&!onUnauthorized(error))status.textContent=errorText(error);}
    })().finally(()=>{loading=null;list.inert=saving;sync();});sync();return loading;
  }
  add.addEventListener('click',()=>{if(!snapshot||loading||saving||draft.length>=100)return;draft.unshift({name:'',email:'',role:'limited_admin'});render();list.querySelector('[name=name]').focus();});
  discard.addEventListener('click',async()=>{if(saving||loading||!confirmDiscard())return;await load(undefined,{force:true});});
  form.addEventListener('submit',async event=>{
    event.preventDefault();if(saving||loading||!dirty()||!form.reportValidity())return;
    const users=draft.map(user=>({...user,name:user.name.normalize('NFC').replace(/\s+/gu,' ').trim(),email:user.email.trim().toLowerCase()}));
    const ownGeneration=generation;saving=true;sync();list.inert=true;status.textContent=copy.saving;
    try{
      let result;
      try{result=await client.request('/admin/users',{method:'POST',body:{users,revision:snapshot.revision,preferredLanguage:language}});}
      catch(error){
        if(!error.status||error.status>=500||error.code==='users_changed'){
          const current=await client.request('/admin/users').catch(readError=>{onUnauthorized(readError);return null;});
          if(current&&equal(current.users,users))result=current;
        }
        if(!result)throw error;
      }
      if(ownGeneration!==generation)return;
      setSnapshot(result);
      status.textContent=result.notifications?.failed?.length?`${copy.usersSaved} ${copy.userEmailFailed} ${result.notifications.failed.join(', ')}`:copy.usersSaved;
    }catch(error){if(ownGeneration===generation&&!onUnauthorized(error))status.textContent=errorText(error);}
    finally{saving=false;list.inert=false;sync();}
  });
  sync();
  return {
    dirty, saving:()=>saving,load,
    setUser(user){currentUser=user?.role==='super_admin'?user:null;if(!currentUser){generation++;snapshot=null;draft=[];selfDraft=null;list.replaceChildren();status.textContent='';sync();}}
  };
}
