import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyState, allocate, reorder, activeQueue, applyAction, monthView, instant, eventFields, publicEvent, upcoming } from '../src/domain.js';

const now=new Date('2026-09-08T18:00:00Z');
const script=i=>({id:`s${i}`,title:`Script ${i}`,author:`Writer ${i}`,status:'approved',position:i,approvedAt:now.toISOString(),email:'private@example.org',pdfId:'private-file',pages:10});
const initial=()=>allocate({...emptyState(),scripts:Array.from({length:6},(_,i)=>script(i+1))},now);
test('two scripts per meeting using the confirmed local recurrence',()=>{
  const state=initial();
  assert.deepEqual(state.events.slice(0,3).map(e=>[e.date,e.time,e.readings]),[
    ['2026-09-21','19:00',['s1','s2']],['2026-10-05','19:00',['s3','s4']],['2026-10-19','19:00',['s5','s6']]
  ]);
  assert.equal(state.events.find(e=>e.date==='2026-11-02').startsAt,'2026-11-03T02:00:00.000Z');
  assert.deepEqual(allocate(structuredClone(state),now),state);
});
test('pending and rejected scripts never occupy slots',()=>{
  const state=initial();state.scripts[0].status='pending';state.scripts[1].status='rejected';allocate(state,now);
  assert.deepEqual(state.events[0].readings,['s3','s4']);
});
test('queue reorder previews deterministically and rejects stale or duplicate IDs',()=>{
  const state=initial();reorder(state,['s6','s5','s4','s3','s2','s1'],now);
  assert.deepEqual(state.events[0].readings,['s6','s5']);
  assert.throws(()=>reorder(state,['s6','s6'],now),/queue_changed/);
});
test('started agendas and titles remain stable across subsequent edits and reorders',()=>{
  const state=initial();const later=new Date('2026-09-22T02:00:00Z');
  state.scripts[0].title='Changed later';
  reorder(state,['s6','s5','s4','s3'],later);
  assert.deepEqual(state.events[0].readings,['s1','s2']);
  assert.equal(publicEvent(state.events[0],state).readings[0].title,'Script 1');
  assert.equal(activeQueue(state,later).length,4);
});
test('cancellation reallocates only future meetings and regeneration preserves exceptions',()=>{
  const state=applyAction(initial(),{action:'cancel',kind:'event',id:'writers-2026-09-21'},now);
  assert.equal(state.events[0].status,'cancelled');assert.deepEqual(state.events[1].readings,['s1','s2']);
  allocate(state,now);assert.equal(state.events[0].status,'cancelled');
});
test('public projections exclude contact and PDF data',()=>{
  const state=initial();const output=JSON.stringify(monthView(state,'2026-09','en',now));
  assert.doesNotMatch(output,/private@example|pdfId|email|contactName|private-file/);
  assert.match(output,/Script 1/);
});
test('month window includes current and next two months and retains historical empty months',()=>{
  const state=initial();state.events.push({id:'past',everPublished:true,status:'withdrawn',date:'2025-12-01'});
  assert.equal(monthView(state,'2026-02','en',now).events.length,0);
  assert.equal(monthView(state,null,'en',now).last,'2026-11');
  assert.throws(()=>monthView(state,'2026-12','en',now),/month_unavailable/);
  assert.throws(()=>monthView(state,'2026-00','en',now),/invalid_month/);
  assert.equal(monthView(emptyState(),null,'en',now).first,'2026-09');
});
test('local month rollover, leap years and six-row calendars',()=>{
  assert.equal(monthView(emptyState(),null,'en',new Date('2026-10-01T05:59:00Z')).month,'2026-09');
  assert.equal(monthView(emptyState(),null,'en',new Date('2026-10-01T06:00:00Z')).month,'2026-10');
  assert.equal(monthView(emptyState(),'2028-02','en',new Date('2028-02-01T12:00Z')).days,29);
  const august=monthView(emptyState(),'2026-08','en',new Date('2026-08-01T12:00Z'));
  assert.equal(Math.ceil((august.offset+august.days)/7),6);
});
test('invalid dates, nonexistent DST times and ambiguous times fail explicitly',()=>{
  assert.throws(()=>instant('2026-02-30','19:00'),/invalid_date/);
  assert.throws(()=>instant('2026-03-08','02:30'),/invalid_time/);
  assert.throws(()=>instant('2026-11-01','01:30'),/ambiguous_time/);
  assert.throws(()=>eventFields({title:'x',description:'x',date:'2026-09-21',time:'19:00',endTime:'18:00'}),/invalid_end_time/);
});
test('in-progress meetings remain on upcoming list until local end',()=>{
  const state=initial();assert.equal(upcoming(state,'en',new Date('2026-09-22T01:30Z'))[0].date,'2026-09-21');
  assert.equal(upcoming(state,'en',new Date('2026-09-22T03:01Z'))[0].date,'2026-10-05');
});
