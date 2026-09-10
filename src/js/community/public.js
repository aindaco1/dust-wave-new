import {client,copy,errorText,mountChallenge,uploadFile} from './common.js';
import {mountCalendar} from './calendar-navigation.js';

mountCalendar(document.querySelector('[data-community-slot="1"]'),copy);

const form=document.querySelector('[data-community-form]');
if(form){
  const kind=form.dataset.communityForm, status=form.querySelector('[data-form-status]'),fieldset=form.querySelector('fieldset'),submit=form.querySelector('[type=submit]');
  let challenge,upload,submissionKey=crypto.randomUUID(),previewUrl='';
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
      fieldset.disabled=false;
      challenge=await mountChallenge(form.querySelector('[data-community-challenge]'),config,'community_submit');
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
      challenge.destroy();fieldset.hidden=true;status.textContent=`${copy.success} ${copy.receipt}: ${receipt.id}`;status.focus();
    }catch(error){status.textContent=errorText(error);status.focus();if(!upload)challenge?.reset();}
    finally{submit.disabled=false;fieldset.removeAttribute('aria-busy');}
  });
  initialize();
}
