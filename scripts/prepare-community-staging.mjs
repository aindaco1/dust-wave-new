import {cp,mkdir,readFile,writeFile,stat} from 'node:fs/promises';
import path from 'node:path';
const source=path.resolve(process.argv[2]||'docs');
const target=path.resolve('.artifacts/community/site');
const pages=['microcinema.html','writers-group.html','admin/community/index.html','es/microcinema.html','es/writers-group.html','es/admin/community/index.html'];
await mkdir(target,{recursive:true});
async function copy(file){const destination=path.join(target,file);await mkdir(path.dirname(destination),{recursive:true});await cp(path.join(source,file),destination,{recursive:true});}
for(const directory of ['css','js','fonts','img/favicon'])await copy(directory);
const images=new Set(['img/newsletter/meetup-03.jpg']);
for(const page of pages){
  await copy(page);
  const html=await readFile(path.join(source,page),'utf8');
  for(const match of html.matchAll(/(?:["'\s(]|&quot;)(\/img\/[^\s"'<>),]+\.(?:png|jpe?g|webp|svg))/giu))images.add(match[1].slice(1));
}
for(const file of images){if((await stat(path.join(source,file))).size>25*1024*1024)throw new Error('Staging image exceeds asset budget: '+file);await copy(file);}
// Reuse the site's authenticated-shell header source for the assets binding.
await cp('_headers',path.join(target,'_headers'));
await writeFile(path.join(target,'robots.txt'),'User-agent: *\nDisallow: /\n');
console.log(`Prepared ${pages.length} Community page shells and ${images.size} images in ${target}`);
