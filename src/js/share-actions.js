// Shared native-share/copy behavior for the existing share panel and calendars.
export async function shareLink({title,text,url}){
  if(!navigator.share)return false;
  try{await navigator.share({title,text,url});return true;}catch(error){if(error.name==='AbortError')return true;throw error;}
}
export async function copyLink(url){await navigator.clipboard.writeText(url);}
