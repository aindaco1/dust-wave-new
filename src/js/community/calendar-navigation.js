import {shareLink,copyLink} from '../share-actions.js';

const calendarSelector='[data-community-calendar]';
const metadataSelector='meta[name="description"],meta[property^="og:"],meta[name^="twitter:"],link[rel="canonical"],link[rel="alternate"][hreflang]';

// Fetch the existing server-rendered month so calendar markup and share metadata
// continue to have one owner. The submission form lives outside this slot.
export function mountCalendar(slot,copy){
  if(!slot?.querySelector(calendarSelector))return;
  const status=document.createElement('p');
  status.setAttribute('role','status');status.className='visually-hidden';slot.after(status);
  let pending,displayedUrl=new URL(location.href);
  const restoration=history.scrollRestoration;
  history.scrollRestoration='manual';
  window.addEventListener('pagehide',()=>{history.scrollRestoration=restoration;});
  window.addEventListener('pageshow',()=>{history.scrollRestoration='manual';});

  function enhance(calendar,list=false){
    calendar.classList.toggle('community-calendar--list',list);
    const toggle=calendar.querySelector('[data-calendar-view]');
    toggle.hidden=false;toggle.setAttribute('aria-pressed',String(list));
    toggle.textContent=list?copy.gridView:copy.listView;
  }
  enhance(slot.querySelector(calendarSelector));

  function monthUrl(value){
    const url=new URL(value,location.href);
    return url.origin===location.origin&&url.pathname===displayedUrl.pathname&&/^\d{4}-\d{2}$/.test(url.searchParams.get('month')||'')?url:null;
  }
  function focusTarget(calendar){
    const active=document.activeElement;
    if(!calendar.contains(active))return null;
    const nav=active.closest('.community-calendar__nav > a');
    if(nav)return `.community-calendar__nav > :nth-child(${[...nav.parentElement.children].indexOf(nav)+1}):not([aria-disabled])`;
    if(active.matches('select'))return '#community-month';
    if(active.matches('button[type="submit"]'))return '.community-calendar__tools button[type="submit"]';
    return '#calendar-heading';
  }
  function syncMetadata(nextDocument){
    document.title=nextDocument.title;
    document.head.querySelectorAll(metadataSelector).forEach(node=>node.remove());
    nextDocument.head.querySelectorAll(metadataSelector).forEach(node=>document.head.append(document.importNode(node,true)));
    const links=[...nextDocument.querySelectorAll('[data-lang-switcher-link]')];
    document.querySelectorAll('[data-lang-switcher-link]').forEach((link,index)=>{
      if(links[index])link.setAttribute('href',links[index].getAttribute('href'));
    });
  }
  async function navigate(url,{fromHistory=false}={}){
    pending?.abort();
    const controller=new AbortController();pending=controller;
    const timeout=setTimeout(()=>controller.abort(),15000);
    slot.setAttribute('aria-busy','true');status.className='visually-hidden';status.textContent=copy.loading;
    try{
      const response=await fetch(url.href,{signal:controller.signal,headers:{Accept:'text/html'},credentials:'same-origin'});
      if(!response.ok)throw new Error('calendar_unavailable');
      const nextDocument=new DOMParser().parseFromString(await response.text(),'text/html');
      const nextCalendar=nextDocument.querySelector(`[data-community-slot="1"] ${calendarSelector}`);
      if(!nextCalendar)throw new Error('calendar_unavailable');
      if(pending!==controller)return;
      const calendar=slot.querySelector(calendarSelector);
      const focus=focusTarget(calendar),position={left:scrollX,top:scrollY,behavior:'instant'};
      enhance(nextCalendar,calendar.classList.contains('community-calendar--list'));
      calendar.replaceWith(document.importNode(nextCalendar,true));
      syncMetadata(nextDocument);
      if(!fromHistory&&url.href!==location.href)history.pushState(null,'',url);
      displayedUrl=new URL(url);
      if(focus){
        const target=slot.querySelector(focus)||slot.querySelector('#calendar-heading');
        if(target.id==='calendar-heading')target.tabIndex=-1;
        target.focus({preventScroll:true});
      }
      window.scrollTo(position);
      status.textContent=slot.querySelector('#calendar-heading').textContent;
    }catch(error){
      if(pending!==controller)return;
      // Keep the readable month and entered proposal intact on connection errors.
      if(fromHistory)history.replaceState(null,'',displayedUrl);
      status.className='';status.textContent=copy.unavailable;
    }finally{
      clearTimeout(timeout);
      if(pending===controller){pending=null;slot.removeAttribute('aria-busy');}
    }
  }
  slot.addEventListener('click',async event=>{
    const target=event.target.closest('a,button');if(!target)return;
    if(target.matches('[data-calendar-view]')){
      const calendar=slot.querySelector(calendarSelector);
      enhance(calendar,!calendar.classList.contains('community-calendar--list'));return;
    }
    if(target.matches('[data-community-copy],[data-community-share-native]')){
      const root=target.closest('[data-community-share]'),feedback=root.querySelector('[data-share-status]');
      const data={url:root.dataset.shareUrl,title:root.dataset.shareTitle,text:root.dataset.shareTitle};
      try{
        if(target.matches('[data-community-copy]')||!await shareLink(data)){await copyLink(data.url);feedback.textContent=copy.copied;}
      }catch{feedback.textContent=`${copy.shareFallback} ${data.url}`;}
      return;
    }
    if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||target.target||target.hasAttribute('download'))return;
    if(!target.matches('.community-calendar__nav a,[data-community-share] a'))return;
    const url=monthUrl(target.href);if(!url)return;
    event.preventDefault();navigate(url);
  });
  slot.addEventListener('submit',event=>{
    if(!event.target.matches('.community-calendar__tools form'))return;
    const url=new URL(event.target.action);url.search=new URLSearchParams(new FormData(event.target)).toString();
    if(!monthUrl(url))return;
    event.preventDefault();navigate(url);
  });
  window.addEventListener('popstate',()=>{
    const url=new URL(location.href);
    if(url.pathname===displayedUrl.pathname&&(pending||url.search!==displayedUrl.search))navigate(url,{fromHistory:true});
  });
}
