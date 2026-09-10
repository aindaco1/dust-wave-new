import { fail, email, plain, id } from './domain.js';

export const publicAdmin = user => ({name:user.name||'',email:user.email,role:user.role});
export function requireSuperAdmin(user) { if(user?.role!=='super_admin')fail('forbidden',403); }
export async function loadUsers(db) {
  const row=await db.prepare('SELECT revision,users FROM community_admin_directory WHERE id=1').first();
  if(!row)fail('storage_unavailable',503);
  return {revision:row.revision,users:JSON.parse(row.users)};
}
export async function findAdmin(db,address) {
  const directory=await loadUsers(db);
  const user=directory.users.find(user=>user.email===address);
  return user&&['super_admin','limited_admin'].includes(user.role)?{...publicAdmin(user),usersRevision:directory.revision}:null;
}
export function normalizeUsers(users,currentEmail) {
  if(!Array.isArray(users)||users.length>100)fail('invalid_users',422);
  const seen=new Set();
  const normalized=users.map(user=>{
    if(!user||typeof user!=='object'||Array.isArray(user))fail('invalid_users',422);
    if(!['super_admin','limited_admin'].includes(user.role))fail('invalid_role',422);
    let address;try{address=email(user.email);}catch{fail('invalid_user_email',422);}
    if(seen.has(address))fail('duplicate_user_email',422);seen.add(address);
    return {name:plain(user.name||'',100,false),email:address,role:user.role};
  });
  if(!normalized.some(user=>user.role==='super_admin'))fail('last_super_admin',422);
  if(!normalized.some(user=>user.email===currentEmail&&user.role==='super_admin'))fail('self_admin_change',422);
  return normalized;
}
export async function saveUsers(db,data,actor) {
  const before=await loadUsers(db);
  // Recheck authority against the same revision the write will claim.
  requireSuperAdmin(before.users.find(user=>user.email===actor.email));
  if(!Number.isSafeInteger(data.revision)||data.revision!==before.revision)fail('users_changed',409);
  const users=normalizeUsers(data.users,actor.email),revision=before.revision+1,mutation=id();
  const revoked=before.users.filter(old=>!users.some(user=>user.email===old.email&&user.role===old.role)).map(user=>user.email);
  const guard='EXISTS (SELECT 1 FROM community_admin_directory WHERE id=1 AND revision=? AND mutation_id=?)';
  const statements=[db.prepare('UPDATE community_admin_directory SET users=?,revision=?,mutation_id=? WHERE id=1 AND revision=?').bind(JSON.stringify(users),revision,mutation,before.revision)];
  for(const address of revoked)for(const table of ['community_sessions','community_auth_tokens']) {
    statements.push(db.prepare(`DELETE FROM ${table} WHERE email=? AND ${guard}`).bind(address,revision,mutation));
  }
  statements.push(db.prepare(`INSERT INTO community_audit(id,actor,action,revision,created_at) SELECT ?,?,'users:update',?,? WHERE ${guard}`).bind(id(),actor.email,revision,Date.now(),revision,mutation));
  const results=await db.batch(statements);
  if(results[0].meta.changes!==1)fail('users_changed',409);
  return {revision,users,added:users.filter(user=>!before.users.some(old=>old.email===user.email))};
}
