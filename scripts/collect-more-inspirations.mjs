// Snowball from known nail boards: board -> its owner -> the owner's other nail boards. Pinterest's logged-out pages
// give only the image, colour and signature per pin, so designs are credited to their board.
// Downloads into a staging folder; curate-more-inspirations.py moves the keepers into public/images/inspirations.
import fs from 'node:fs/promises';
const TARGET=+(process.argv[2]||2500),OUT='docs/expansion2';
const seeds=[...(await fs.readFile('scripts/expand-inspirations.mjs','utf8')).matchAll(/\['([^']+)','([^']+)'\]/g)].map(m=>'/'+m[1]+'/');
const known=new Set(JSON.parse(await fs.readFile('src/inspirations.json','utf8')).map(p=>p.id.replace(/^pin-(image-)?/,'')));
const headers={'user-agent':'Mozilla/5.0'},nailBoard=/nail|mani|polish|gel|acrylic/i;
async function state(path){
 const r=await fetch('https://www.pinterest.com'+path,{headers,signal:AbortSignal.timeout(30000)});if(!r.ok)throw Error(r.status+' '+path);
 const m=(await r.text()).match(/<script[^>]*id="__PWS_INITIAL_PROPS__"[^>]*>([\s\S]*?)<\/script>/);return m?JSON.parse(m[1]).initialReduxState||{}:{};
}
// Nail brands and magazines whose profiles list nail-art boards
const seedUsers=['paintboxnails','manucurist','glamnetic','dndgel','nailboo','nailsmag','opiproducts','nailpro'];
const boards=[...seeds],seenBoards=new Set(seeds),seenUsers=new Set(),pins=new Map();
for(const user of seedUsers){seenUsers.add(user);
 try{for(const b of Object.values((await state(`/${user}/`)).boards||{}))if(nailBoard.test(b.url)&&b.pin_count>=20&&!seenBoards.has(b.url)){seenBoards.add(b.url);boards.unshift(b.url)}}catch{}}
while(boards.length&&pins.size<TARGET){
 const board=boards.shift();
 try{
  for(const p of Object.values((await state(board)).pins||{})){
   const img=p.images?.['736x'],sig=p.image_signature;
   if(!img||!sig||p.videos||img.width<400||img.height<400||known.has(sig)||pins.has(sig))continue;
   pins.set(sig,{id:sig,imageUrl:img.url,source:'https://www.pinterest.com'+board,board,color:p.dominant_color||'#b7838d'});
  }
  const user=board.split('/')[1];
  if(!seenUsers.has(user)){seenUsers.add(user);
   try{for(const b of Object.values((await state(`/${user}/`)).boards||{}))if(nailBoard.test(b.url)&&b.pin_count>=20&&!seenBoards.has(b.url)){seenBoards.add(b.url);boards.push(b.url)}}catch{}}
  console.log(pins.size,'pins,',boards.length,'boards queued:',board);
 }catch(e){console.log('skip',e.message)}
}
await fs.mkdir(`${OUT}/images`,{recursive:true});
const list=[...pins.values()];
for(let i=0;i<list.length;i+=8)await Promise.all(list.slice(i,i+8).map(async p=>{
 try{const r=await fetch(p.imageUrl,{signal:AbortSignal.timeout(30000)});if(!r.ok)throw Error(r.status);await fs.writeFile(`${OUT}/images/${p.id}.jpg`,Buffer.from(await r.arrayBuffer()))}catch{p.failed=true}
}));
const ok=list.filter(p=>!p.failed);
await fs.writeFile(`${OUT}/candidates.json`,JSON.stringify(ok,null,1));console.log('Downloaded',ok.length,'from',seenBoards.size,'boards');
