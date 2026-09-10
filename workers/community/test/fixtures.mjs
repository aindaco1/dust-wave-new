import {readFile,readdir} from 'node:fs/promises';
export async function migrateFixture(db,{adminEmail='admin@example.test',role='super_admin'}={}) {
  const directory=new URL('../migrations/',import.meta.url);
  for(const name of (await readdir(directory)).filter(name=>name.endsWith('.sql')).sort()) {
    const sql=(await readFile(new URL(name,directory),'utf8')).replace(/^--.*$/gm,'');
    await db.batch(sql.split(';').map(statement=>statement.trim()).filter(Boolean).map(statement=>db.prepare(statement)));
  }
  if(adminEmail)await db.prepare('UPDATE community_admin_directory SET users=? WHERE id=1').bind(JSON.stringify([{name:'Test admin',email:adminEmail,role}])).run();
}
