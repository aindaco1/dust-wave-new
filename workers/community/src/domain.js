import { dateAtTimeInTimeZone, getTimeZoneDateKey, getTimeZoneParts } from '@dustwave/worker-core/date-time';

export const TIMEZONE = 'America/Denver';
export const FIRST_MEETING = '2026-09-21';
export const MEETING_DEFAULTS = Object.freeze({ title: 'Writers Group', description: 'An open evening of script readings and feedback.', time: '19:00', endTime: '21:00' });
export const API = '/api/community/v1';
export const PUBLIC_STATES = new Set(['published', 'cancelled']);
export class CommunityError extends Error {
  constructor(code, status = 400) { super(code); this.code = code; this.status = status; }
}
export const fail = (code, status) => { throw new CommunityError(code, status); };
export const id = () => crypto.randomUUID();
export const locale = (value) => value === 'es' ? 'es' : 'en';
export function plain(value, max, required = true) {
  if (typeof value !== 'string') { if (!required && value == null) return ''; fail('invalid_fields'); }
  const text = value.normalize('NFC').replace(/\s+/gu, ' ').trim();
  if ((required && !text) || text.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(text)) fail('invalid_fields');
  return text;
}
export function email(value) {
  const result = plain(value, 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(result)) fail('invalid_email');
  return result;
}
export function dateKey(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/u.test(value)) fail('invalid_date');
  const parsed = new Date(`${value}T12:00:00Z`);
  if (!Number.isFinite(+parsed) || parsed.toISOString().slice(0, 10) !== value || value < '1900-01-01' || value > '2199-12-31') fail('invalid_date');
  return value;
}
export function monthKey(value) {
  if (typeof value !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/u.test(value)) fail('invalid_month');
  if(value<'1900-01'||value>'2199-12')fail('invalid_month');
  return value;
}
export function addDays(date, days) {
  const d = new Date(`${dateKey(date)}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
export function addMonths(month, count) {
  const [year, m] = monthKey(month).split('-').map(Number);
  return new Date(Date.UTC(year, m - 1 + count, 1, 12)).toISOString().slice(0, 7);
}
export function currentMonth(now = new Date()) { return getTimeZoneDateKey(now, TIMEZONE).slice(0, 7); }
export function instant(date, time) {
  dateKey(date);
  if (!/^([01]\d|2[0-3]):[0-5]\d$/u.test(time || '')) fail('invalid_time');
  const [hour, minute] = time.split(':').map(Number);
  const d = dateAtTimeInTimeZone(date, TIMEZONE, hour, minute);
  const parts = getTimeZoneParts(d, TIMEZONE);
  if (getTimeZoneDateKey(d, TIMEZONE) !== date || parts.hour !== hour || parts.minute !== minute) fail('invalid_time');
  // The repeated fall-back hour is ambiguous; require a different explicit local start.
  if (getTimeZoneDateKey(new Date(+d + 3600000), TIMEZONE) === date) {
    const later = getTimeZoneParts(new Date(+d + 3600000), TIMEZONE);
    if (later.hour === hour && later.minute === minute) fail('ambiguous_time');
  }
  return d.toISOString();
}
export function eventFields(input) {
  const date = dateKey(input.date);
  const time = plain(input.time, 5);
  const startsAt = instant(date, time);
  const endTime = plain(input.endTime, 5, false);
  const endsAt = endTime ? instant(date, endTime) : startsAt;
  if (endTime && endsAt <= startsAt) fail('invalid_end_time');
  return { title: plain(input.title, 100), description: plain(input.description, 240), date, time, endTime, startsAt, endsAt };
}
export function scriptFields(input) {
  return { title: plain(input.title, 100), author: plain(input.author, 100) };
}
export function newEvent(input, upload, now = new Date()) {
  return { id: id(), kind: 'event', ...eventFields(input), imageId: upload.id,
    contactName: plain(input.contactName, 100), email: email(input.email), status: 'pending',
    createdAt: now.toISOString(), everPublished: false, readings: [] };
}
export function scriptContactFields(input, { required = true } = {}) {
  const address = plain(input.email, 254, required);
  return { contactName: plain(input.contactName, 100, required), email: address ? email(address) : '' };
}
export function pdfFilename(value) {
  // Match the shared download helper's portable filename policy, retaining
  // Unicode letters and draft/version markers while removing paths and controls.
  const stem = String(value || '').normalize('NFC').split(/[\\/]/u).pop()
    .replace(/\.pdf$/iu, '').replace(/[^\p{L}\p{N} ._-]/gu, ' ')
    .replace(/\.{2,}/gu, '.').replace(/\s+/gu, ' ').replace(/^[^\p{L}\p{N}]+/u, '')
    .slice(0, 120).replace(/[\uD800-\uDBFF]$/u, '').replace(/[.\s]+$/u, '');
  return `${stem || 'writers-group-script'}.pdf`;
}
export function scriptPdfFields(upload) {
  return { pdfId: upload.id, pages: upload.pages, fileName: upload.fileName || '' };
}
export function newScript(input, upload, now = new Date(), { admin = false } = {}) {
  if (!admin && (input.local !== true || input.consent !== true)) fail('consent_required');
  return { id: id(), ...scriptFields(input), ...scriptContactFields(input, { required: !admin }),
    ...scriptPdfFields(upload), status: 'pending', createdAt: now.toISOString(), approvedAt: '', position: 0 };
}
export function emptyState() { return { revision: 0, events: [], scripts: [] }; }
export function ensureMeetings(state, now = new Date()) {
  const activeCount = state.scripts.filter(s => s.status === 'approved').length;
  const horizon = `${addMonths(currentMonth(now), 6)}-01`;
  let date = FIRST_MEETING;
  const byId = new Map(state.events.map(e => [e.id, e]));
  let future = 0;
  for (let index = 0; index < 2000; index++, date = addDays(date, 14)) {
    const key = `writers-${date}`;
    if (!byId.has(key)) {
      const fields = eventFields({ ...MEETING_DEFAULTS, date });
      const meeting = { id: key, kind: 'meeting', ...fields, imageId: '', status: 'published', everPublished: true, readings: [], createdAt: now.toISOString() };
      state.events.push(meeting); byId.set(key, meeting);
    }
    const meeting = byId.get(key);
    if (meeting.startsAt > now.toISOString() && meeting.status === 'published' && !meeting.agendaLocked) future++;
    if (date >= horizon && future >= Math.ceil(activeCount / 2) + 1) break;
    if (index === 1999) fail('schedule_limit', 409);
  }
  return state;
}
export function activeQueue(state, now = new Date()) {
  const locked = new Set(state.events.filter(e => e.kind === 'meeting' && (e.agendaLocked || e.startsAt <= now.toISOString())).flatMap(e => e.readings || []));
  return state.scripts.filter(s => s.status === 'approved' && !locked.has(s.id))
    .sort((a, b) => a.position - b.position || a.approvedAt.localeCompare(b.approvedAt) || a.id.localeCompare(b.id));
}
export function allocate(state, now = new Date()) {
  ensureMeetings(state, now);
  const queue = activeQueue(state, now);
  const meetings = state.events.filter(e => e.kind === 'meeting' && !e.agendaLocked && e.startsAt > now.toISOString()).sort((a,b) => a.startsAt.localeCompare(b.startsAt) || a.id.localeCompare(b.id));
  let offset = 0;
  for (const meeting of meetings) {
    meeting.readings = meeting.status === 'published' ? queue.slice(offset, offset + 2).map(s => s.id) : [];
    meeting.agenda = meeting.readings.map(key => { const s = queue.find(s => s.id === key); return { title: s.title, author: s.author }; });
    if (meeting.status === 'published') offset += 2;
  }
  return state;
}
export function reorder(state, ids, now = new Date()) {
  const queue = activeQueue(state, now);
  if (!Array.isArray(ids) || ids.length !== queue.length || new Set(ids).size !== ids.length || ids.some(key => !queue.some(s => s.id === key))) fail('queue_changed', 409);
  const positions = new Map(ids.map((key, index) => [key, index]));
  for (const s of state.scripts) if (positions.has(s.id)) s.position = positions.get(s.id);
  return allocate(state, now);
}
export function publicEvent(event, state, language = 'en') {
  const lang = locale(language);
  const scripts = new Map(state.scripts.map(s => [s.id, s]));
  return { id: event.id, kind: event.kind, title: event.kind === 'meeting' && event.title === MEETING_DEFAULTS.title ? (lang === 'es' ? 'Grupo de Guion' : MEETING_DEFAULTS.title) : event.title,
    description: event.kind === 'meeting' && event.description === MEETING_DEFAULTS.description ? (lang === 'es' ? 'Una noche abierta de lectura de guiones y comentarios.' : MEETING_DEFAULTS.description) : event.description,
    date: event.date, time: event.time, endTime: event.endTime, startsAt: event.startsAt, endsAt: event.endsAt,
    status: event.status, image: event.imageId ? `${API}/images/${event.imageId}/320.webp` : '/img/newsletter/meetup-03.jpg',
    readings: event.agenda || (event.readings || []).map(key => scripts.get(key)).filter(Boolean).map(s => ({ title: s.title, author: s.author })) };
}
export function monthView(state, month, language = 'en', now = new Date()) {
  const current = currentMonth(now);
  const last = addMonths(current, 2);
  const historical = state.events.filter(e => e.everPublished && e.status !== 'deleted').map(e => e.date.slice(0,7)).sort()[0];
  const first = historical && historical < current ? historical : current;
  const selected = month == null ? current : monthKey(month);
  if (selected < first || selected > last) fail('month_unavailable', 404);
  const days = new Date(Date.UTC(Number(selected.slice(0,4)), Number(selected.slice(5)), 0)).getUTCDate();
  const offset = (new Date(`${selected}-01T12:00:00Z`).getUTCDay() + 6) % 7;
  return { month: selected, current, first, last, days, offset, language: locale(language),
    events: state.events.filter(e => PUBLIC_STATES.has(e.status) && e.date.startsWith(selected)).map(e => publicEvent(e, state, language))
      .sort((a,b) => a.startsAt.localeCompare(b.startsAt) || a.id.localeCompare(b.id)) };
}
export function upcoming(state, language = 'en', now = new Date()) {
  return state.events.filter(e => e.kind === 'meeting' && PUBLIC_STATES.has(e.status) && e.endsAt > now.toISOString())
    .sort((a,b) => a.startsAt.localeCompare(b.startsAt) || a.id.localeCompare(b.id)).map(e => publicEvent(e, state, language));
}
export function applyAction(state, input, now = new Date()) {
  const next = structuredClone(state);
  if (input.action === 'reorder') return reorder(next, input.ids, now);
  if (input.action === 'extend') return allocate(next, now);
  const collection = input.kind === 'script' ? next.scripts : next.events;
  let item = collection.find(e => e.id === input.id);
  if (['create_event', 'create_meeting'].includes(input.action)) {
    if(input.kind!=='event') fail('invalid_action');
    const meeting = input.action === 'create_meeting';
    item = { id: id(), kind: meeting ? 'meeting' : 'event', ...eventFields(input.fields), imageId: '', status: meeting ? 'published' : 'draft', everPublished: meeting, createdAt: now.toISOString(), readings: [] };
    next.events.push(item); return allocate(next, now);
  }
  if (!item || item.status === 'deleted') fail('not_found', 404);
  const allowed = input.kind === 'script' ? ['edit','approve','reject','withdraw','read','requeue'] : ['edit','approve','reject','cancel','delete'];
  if (!allowed.includes(input.action)) fail('invalid_action');
  // Editing or deleting a past meeting must not put already-read scripts back
  // in the queue, even if its date is subsequently moved into the future.
  if (item.kind === 'meeting' && item.startsAt <= now.toISOString()) item.agendaLocked = true;
  if (input.action === 'edit') {
    if (input.kind === 'script') Object.assign(item, scriptFields(input.fields));
    else {
      const fields=eventFields(input.fields);
      Object.assign(item, fields);
    }
  } else if (input.action === 'approve') {
    item.status = input.kind === 'script' ? 'approved' : 'published';
    if (input.kind === 'script') {
      if (!item.approvedAt) { item.approvedAt = now.toISOString(); item.position = Math.max(-1, ...next.scripts.map(s => s.position)) + 1; }
    } else item.everPublished = true;
  } else if (['reject', 'cancel', 'withdraw', 'read', 'delete'].includes(input.action)) {
    item.status = ({ reject: 'rejected', cancel: 'cancelled', withdraw: 'withdrawn', read: 'read', delete: 'deleted' })[input.action];
    // Retain the record ID so recurrence generation cannot recreate a deletion.
    if (input.action === 'delete') item.deletedAt = now.toISOString();
  } else if (input.action === 'requeue' && input.kind === 'script') {
    for (const e of next.events) {
      if ((e.readings || []).includes(item.id)) {
        // Preserve the historical title/author as a separate immutable read record.
        const historyId = `${item.id}-history-${id()}`;
        next.scripts.push({ ...item, id: historyId, status: 'read' });
        e.readings = e.readings.map(key => key === item.id ? historyId : key);
      }
    }
    item.status = 'approved'; item.position = Math.max(-1, ...next.scripts.map(s => s.position)) + 1;
  } else fail('invalid_action');
  return allocate(next, now);
}
