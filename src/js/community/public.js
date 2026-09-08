import {client,copy,errorText,mountChallenge,uploadFile} from './common.js';
import {shareLink,copyLink} from '../share-actions.js';

document.querySelectorAll('[data-calendar-view]').forEach(button=>{
  button.hidden=false;
  button.addEventListener('click',()=>{
    const calendar=button.closest('[data-community-calendar]');
    const list=calendar.classList.toggle('community-calendar--list');
    button.setAttribute('aria-pressed',String(list));button.textContent=list?copy.gridView:copy.listView;
  });
});
document.querySelectorAll('[data-community-share]').forEach(root=>{
  const data={url:root.dataset.shareUrl,title:root.dataset.shareTitle,text:root.dataset.shareTitle};
  const status=root.querySelector('[data-share-status]');
  root.querySelector('[data-community-copy]').addEventListener('click',async()=>{
    try{await copyLink(data.url);status.textContent=copy.copied;}catch{status.textContent=`${copy.shareFallback} ${data.url}`;}
  });
  root.querySelector('[data-community-share-native]').addEventListener('click',async()=>{
    try{if(!await shareLink(data)){await copyLink(data.url);status.textContent=copy.copied;}}catch{status.textContent=`${copy.shareFallback} ${data.url}`;}
  });
});

const form=document.querySelector('[data-community-form]');
if(form){
  const kind=form.dataset.communityForm, status=form.querySelector('[data-form-status]'),fieldset=form.querySelector('fieldset'),submit=form.querySelector('[type=submit]');
  let challenge,mounting=false,upload,submissionKey=crypto.randomUUID(),previewUrl='';
  const fileInput=form.elements.file;
  fileInput.addEventListener('change',()=>{
    upload=null;submissionKey=crypto.randomUUID();
    if(previewUrl)URL.revokeObjectURL(previewUrl);
    const preview=form.querySelector('[data-image-preview]');
    if(preview){preview.hidden=!fileInput.files[0];if(fileInput.files[0]){previewUrl=URL.createObjectURL(fileInput.files[0]);preview.src=previewUrl;}}
  });
  async function initialize(){
    try{
      const config=await client.request('/config',{csrf:false});
      // Render challenges after the disclosure opens, so the responsive primitive
      // can measure its available width and the widget is not hidden from users.
      fieldset.disabled=false;
      const details=form.closest('details');
      const mount=async()=>{if(challenge||mounting||!details.open)return;mounting=true;try{challenge=await mountChallenge(form.querySelector('[data-community-challenge]'),config,'community_submit');}catch(e){status.textContent=errorText(e);}finally{mounting=false;}};
      details.addEventListener('toggle',mount);await mount();
    }catch(error){status.textContent=errorText(error);}
  }
  form.addEventListener('submit',async event=>{
    event.preventDefault();if(!form.reportValidity())return;
    submit.disabled=true;status.textContent=copy.sending;fieldset.setAttribute('aria-busy','true');
    try{
      if(!challenge)throw new Error('challenge_required');
      upload ||= await uploadFile(fileInput.files[0],kind==='script'?'pdf':'image',challenge.token());
      const fields=Object.fromEntries(new FormData(form));delete fields.file;
      fields.local=form.elements.local?.checked===true;fields.consent=form.elements.consent?.checked===true;
      const receipt=await client.request(kind==='script'?'/scripts':'/events',{method:'POST',csrf:false,body:{...fields,uploadId:upload.id,uploadToken:upload.token,submissionKey}});
      fieldset.hidden=true;status.textContent=`${copy.success} ${copy.receipt}: ${receipt.id}`;status.focus();
    }catch(error){status.textContent=errorText(error);status.focus();if(!upload)challenge?.reset();}
    finally{submit.disabled=false;fieldset.removeAttribute('aria-busy');}
  });
  initialize();
}
