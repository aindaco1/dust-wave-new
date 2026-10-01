import {client,copy,errorText,mountChallenge,uploadFile,language} from './common.js';

const form=document.querySelector('[data-community-form]');
if(form){
  const status=form.querySelector('[data-form-status]'),fieldset=form.querySelector('fieldset'),submit=form.querySelector('[type=submit]');
  let challenge,upload,submissionKey=crypto.randomUUID();
  const fileInput=form.elements.file;
  fileInput.addEventListener('change',()=>{
    upload=null;submissionKey=crypto.randomUUID();
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
      upload ||= await uploadFile(fileInput.files[0],'pdf',challenge.token());
      const fields=Object.fromEntries(new FormData(form));delete fields.file;
      fields.local=form.elements.local?.checked===true;fields.consent=form.elements.consent?.checked===true;
      const receipt=await client.request('/scripts',{method:'POST',csrf:false,body:{...fields,language,uploadId:upload.id,uploadToken:upload.token,submissionKey}});
      challenge.destroy();fieldset.hidden=true;status.textContent=`${copy.success} ${copy.receipt}: ${receipt.id}`;status.focus();
    }catch(error){status.textContent=errorText(error);status.focus();if(!upload)challenge?.reset();}
    finally{submit.disabled=false;fieldset.removeAttribute('aria-busy');}
  });
  initialize();
}
