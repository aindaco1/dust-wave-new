import english from '../../../src/_data/i18n/en.json' with { type: 'json' };
import spanish from '../../../src/_data/i18n/es.json' with { type: 'json' };
import { addMonths, TIMEZONE } from './domain.js';

export function copy(language) { return (language === 'es' ? spanish : english).community; }
export const escape = (value) => String(value ?? '').replace(/[&<>"']/gu, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function monthLabel(month, language) {
  return new Intl.DateTimeFormat(language, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${month}-01T12:00:00Z`));
}
export function weekdayLabels(language) {
  return Array.from({ length: 7 }, (_, i) => new Intl.DateTimeFormat(language, { weekday: 'short', timeZone: 'UTC' }).format(new Date(Date.UTC(2026, 8, 7 + i, 12))));
}
export function monthUrl(month, language, origin = '') {
  return `${origin}${language === 'es' ? '/es' : ''}/microcinema.html?month=${month}`;
}
export function timeLabel(event, language) {
  const fmt = new Intl.DateTimeFormat(language, { hour: 'numeric', minute: '2-digit', timeZone: TIMEZONE });
  return `${fmt.format(new Date(event.startsAt))}${event.endTime ? `–${fmt.format(new Date(event.endsAt))}` : ''}`;
}
function dateTile(event, language) {
  const date = new Date(`${event.date}T12:00:00Z`);
  const fmt = options => new Intl.DateTimeFormat(language, { ...options, timeZone: 'UTC' }).format(date);
  return `<time class="community-date" datetime="${event.date}"><span>${escape(fmt({month:'short'}))}</span><strong>${date.getUTCDate()}</strong><small>${escape(fmt({weekday:'short',year:'numeric'}))}</small></time>`;
}
function eventMarkup(event, language) {
  const t = copy(language);
  return `<article class="community-event${event.status === 'cancelled' ? ' community-event--cancelled' : ''}">
    <img src="${escape(event.image)}" alt="" width="80" height="80" loading="lazy" decoding="async">
    <div><h3>${escape(event.title)}</h3><p class="community-event__time"><time datetime="${event.startsAt}">${escape(timeLabel(event,language))}</time>${event.status === 'cancelled' ? ` · ${escape(t.cancelled)}` : ''}</p>
    <p>${escape(event.description)}</p>${event.kind === 'meeting' ? `<a href="${language === 'es' ? '/es' : ''}/writers-group.html#readings">${escape(t.upcoming)} →</a>` : ''}</div></article>`;
}
export function renderCalendar(view, origin = '') {
  const t = copy(view.language); const lang = view.language;
  const href = m => `${monthUrl(m,lang)}#calendar`;
  const months = []; for (let m = view.first; m <= view.last; m = addMonths(m,1)) months.push(m);
  const nav = (month, label, enabled) => enabled ? `<a class="community-button" href="${href(month)}">${escape(label)}</a>` : `<span class="community-button" aria-disabled="true">${escape(label)}</span>`;
  const groups = new Map(Array.from({length: view.days}, (_,i) => [`${view.month}-${String(i+1).padStart(2,'0')}`, []]));
  for (const e of view.events) groups.get(e.date)?.push(e);
  const blanks = Array.from({length:view.offset}, () => '<li class="community-calendar__blank" aria-hidden="true"></li>').join('');
  const trailing = Array.from({length:(7-(view.offset+view.days)%7)%7},()=>'<li class="community-calendar__blank" aria-hidden="true"></li>').join('');
  const days = [...groups].map(([date,events]) => `<li class="community-calendar__day${events.length ? ' has-events' : ''}"><time class="community-calendar__number" datetime="${date}">${Number(date.slice(-2))}</time>${events.map(e => eventMarkup(e,lang)).join('')}</li>`).join('');
  return `<div class="community-calendar" data-community-calendar>
    <div class="community-calendar__masthead"><p>${escape(t.eyebrow)}</p><h2 id="calendar-heading">${escape(monthLabel(view.month,lang))}</h2><span>DUST WAVE<br>MICROCINEMA</span></div>
    <nav class="community-calendar__nav" aria-label="${escape(t.chooseMonth)}">${nav(addMonths(view.month,-1),t.previous,view.month>view.first)}<a href="${href(view.current)}">${escape(t.current)}</a>${nav(addMonths(view.month,1),t.next,view.month<view.last)}</nav>
    <div class="community-calendar__tools"><form method="get" action="${lang === 'es' ? '/es' : ''}/microcinema.html#calendar"><label for="community-month">${escape(t.chooseMonth)}</label><select id="community-month" name="month">${months.map(m => `<option value="${m}"${m===view.month?' selected':''}>${escape(monthLabel(m,lang))}</option>`).join('')}</select><button type="submit">${escape(t.go)}</button></form><button type="button" data-calendar-view aria-pressed="false" hidden>${escape(t.listView)}</button></div>
    <div class="community-calendar__weekdays" aria-hidden="true">${weekdayLabels(lang).map(d => `<span>${escape(d)}</span>`).join('')}</div>
    <ol class="community-calendar__grid">${blanks}${days}${trailing}</ol>
    ${view.events.length ? '' : `<p class="community-calendar__empty">${escape(t.emptyMonth)}</p>`}
    <div class="community-calendar__footer"><p>${escape(t.atHQ)}<br>${escape(t.timezone)}</p><div class="community-share" data-community-share data-share-url="${escape(monthUrl(view.month,lang,origin))}" data-share-title="${escape(monthLabel(view.month,lang))} · Dust Wave Microcinema"><button type="button" data-community-share-native>${escape(t.shareMonth)}</button><button type="button" data-community-copy>${escape(t.copyLink)}</button><a href="${escape(monthUrl(view.month,lang))}">${escape(monthLabel(view.month,lang))}</a><span role="status" data-share-status></span></div></div>
  </div>`;
}
export function renderMeetings(meetings, language) {
  const t = copy(language);
  const rows = meetings.map(e => `<li class="community-meeting">${dateTile(e,language)}<div><h3>${escape(timeLabel(e,language))}${e.status==='cancelled'?` · ${escape(t.cancelled)}`:''}</h3><ol>${e.status==='cancelled'?'':Array.from({length:2},(_,i)=>e.readings[i]?`<li><strong>${escape(e.readings[i].title)}</strong> — ${escape(e.readings[i].author)}</li>`:`<li class="community-open-slot">${escape(t.openSlot)}</li>`).join('')}</ol></div></li>`);
  return `<div class="community-readings"><p class="writers-group-eyebrow">${escape(t.readingEyebrow)}</p><h2 id="readings-heading">${escape(t.upcoming)}</h2><p>${escape(t.timezone)}</p><ol class="community-meetings">${rows.slice(0,6).join('')}</ol>${rows.length>6?`<details><summary>${escape(t.moreDates)}</summary><ol class="community-meetings">${rows.slice(6).join('')}</ol></details>`:''}</div>`;
}
export function unavailableMarkup(language, invalid = false) {
  const t = copy(language);
  return `<div class="community-unavailable" role="status"><p>${escape(invalid ? t.invalidMonth : t.unavailable)}</p>${invalid?`<a href="${language==='es'?'/es':''}/microcinema.html#calendar">${escape(t.backCurrent)}</a>`:''}</div>`;
}
