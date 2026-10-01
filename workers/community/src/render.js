import english from '../../../src/_data/i18n/en.json' with { type: 'json' };
import spanish from '../../../src/_data/i18n/es.json' with { type: 'json' };
import { TIMEZONE } from './domain.js';

export function copy(language) { return (language === 'es' ? spanish : english).community; }
export const escape = (value) => String(value ?? '').replace(/[&<>"']/gu, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function timeLabel(event, language) {
  const fmt = new Intl.DateTimeFormat(language, { hour: 'numeric', minute: '2-digit', timeZone: TIMEZONE });
  return `${fmt.format(new Date(event.startsAt))}${event.endTime ? `–${fmt.format(new Date(event.endsAt))}` : ''}`;
}
function dateTile(event, language) {
  const date = new Date(`${event.date}T12:00:00Z`);
  const fmt = options => new Intl.DateTimeFormat(language, { ...options, timeZone: 'UTC' }).format(date);
  return `<time class="community-date" datetime="${event.date}"><span>${escape(fmt({month:'short'}))}</span><strong>${date.getUTCDate()}</strong><small>${escape(fmt({weekday:'short',year:'numeric'}))}</small></time>`;
}
export function renderMeetings(meetings, language) {
  const t = copy(language);
  const rows = meetings.map(e => `<li class="community-meeting">${dateTile(e,language)}<div><h3>${escape(timeLabel(e,language))}${e.status==='cancelled'?` · ${escape(t.cancelled)}`:''}</h3><ol>${e.status==='cancelled'?'':Array.from({length:2},(_,i)=>e.readings[i]?`<li><strong>${escape(e.readings[i].title)}</strong> — ${escape(e.readings[i].author)}</li>`:`<li class="community-open-slot">${escape(t.openSlot)}</li>`).join('')}</ol></div></li>`);
  return `<div class="community-readings"><p class="writers-group-eyebrow">${escape(t.readingEyebrow)}</p><h2 id="readings-heading">${escape(t.upcoming)}</h2><p>${escape(t.timezone)}</p><ol class="community-meetings">${rows.slice(0,6).join('')}</ol>${rows.length>6?`<details><summary>${escape(t.moreDates)}</summary><ol class="community-meetings">${rows.slice(6).join('')}</ol></details>`:''}</div>`;
}
export function unavailableMarkup(language) {
  return `<div class="community-unavailable" role="status"><p>${escape(copy(language).unavailable)}</p></div>`;
}
