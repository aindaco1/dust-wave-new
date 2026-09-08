import { fail, emptyState, id } from './domain.js';

export async function loadState(db) {
  const [meta, events, scripts] = await db.batch([
    db.prepare('SELECT revision FROM community_meta WHERE id=1'),
    db.prepare("SELECT data FROM community_records WHERE kind='event' ORDER BY id"),
    db.prepare("SELECT data FROM community_records WHERE kind='script' ORDER BY id")
  ]);
  if (!meta.results[0]) fail('storage_unavailable', 503);
  return { ...emptyState(), revision: meta.results[0].revision,
    events: events.results.map(row => JSON.parse(row.data)), scripts: scripts.results.map(row => JSON.parse(row.data)) };
}
export async function commitState(db, before, after, { actor, action, extra = [], precondition = null } = {}) {
  const mutation = id();
  const revision = before.revision + 1;
  const guard = 'EXISTS (SELECT 1 FROM community_meta WHERE id=1 AND revision=? AND mutation_id=?)';
  const statements = [db.prepare(`UPDATE community_meta SET revision=?, mutation_id=? WHERE id=1 AND revision=?${precondition ? ` AND (${precondition.sql})` : ''}`).bind(revision, mutation, before.revision, ...(precondition?.args || []))];
  for (const [kind, key] of [['event','events'], ['script','scripts']]) {
    const previous = new Map(before[key].map(r => [r.id, JSON.stringify(r)]));
    for (const record of after[key]) {
      const data = JSON.stringify(record);
      if (previous.get(record.id) === data) continue;
      statements.push(db.prepare(`INSERT INTO community_records(kind,id,data) SELECT ?,?,? WHERE ${guard} ON CONFLICT(kind,id) DO UPDATE SET data=excluded.data`)
        .bind(kind, record.id, data, revision, mutation));
    }
  }
  for (const make of extra) statements.push(make({ guard, revision, mutation }));
  statements.push(db.prepare(`INSERT INTO community_audit(id,actor,action,revision,created_at) SELECT ?,?,?,?,? WHERE ${guard}`)
    .bind(id(), actor || 'public', action || 'update', revision, Date.now(), revision, mutation));
  const result = await db.batch(statements);
  if (result[0].meta.changes !== 1) fail('queue_changed', 409);
  after.revision = revision;
  return after;
}
export async function getUpload(db, uploadId) {
  const row = await db.prepare('SELECT * FROM community_uploads WHERE id=?').bind(uploadId).first();
  return row ? { ...row, ...JSON.parse(row.data) } : null;
}
export async function rateLimit(db, key, limit, seconds, now = Date.now()) {
  const bucket = Math.floor(now / (seconds * 1000));
  const row = await db.prepare('INSERT INTO community_rate_limits(key,count,expires_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count')
    .bind(`${key}:${bucket}`, (bucket + 1) * seconds * 1000).first();
  if (row.count > limit) fail('rate_limited', 429);
}
