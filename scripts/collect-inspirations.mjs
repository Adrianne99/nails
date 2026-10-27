import fs from 'node:fs/promises';
const boards = [
 'https://www.pinterest.com/thearchofmylife/realistic-nails/',
 'https://www.pinterest.com/thehavershamhome/inspirational-nails/',
 'https://www.pinterest.com/maiyapilar/trendy-nail-art-manicure-inspo/',
 'https://ca.pinterest.com/nadz_ramz/manicure-inspiration/',
 'https://ca.pinterest.com/sincerelyimage/manicured/',
 'https://au.pinterest.com/suzannegoh/nailspiration/',
 'https://uk.pinterest.com/swagandtassel/n-a-i-l-a-r-t/',
 'https://www.pinterest.com/catsdailyliving/nails-manis/',
];
const pins = new Map();
for (const board of boards) {
 const response = await fetch(board);
 if (!response.ok) throw new Error(`Board returned ${response.status}: ${board}`);
 const html = await response.text();
 const match = html.match(/<script[^>]*id="__PWS_INITIAL_PROPS__"[^>]*>([\s\S]*?)<\/script>/);
 if (!match) continue;
 const data = JSON.parse(match[1]);
 for (const pin of Object.values(data.initialReduxState?.pins || {})) {
  const image = pin.images?.['736x'] || pin.images?.['474x'];
  if (!image || pin.videos || !/^\d+$/.test(pin.id)) continue;
  const signature = pin.image_signature || image.url;
  if (!pins.has(signature)) pins.set(signature,{id:pin.id,imageUrl:image.url,source:`https://www.pinterest.com/pin/${pin.id}/`,board,title:pin.title||pin.grid_title||'',description:pin.description||'',color:pin.dominant_color||'#b7838d'});
 }
 console.log(board,pins.size);
}
await fs.mkdir('public/images/inspirations',{recursive:true});
const candidates = [...pins.values()];
for (let i=0;i<candidates.length;i+=6) {
 await Promise.all(candidates.slice(i,i+6).map(async pin=>{
  const r=await fetch(pin.imageUrl); if(!r.ok)throw new Error(`Image failed ${pin.id}`);
  pin.image=`/images/inspirations/${pin.id}.jpg`;
  await fs.writeFile(`public${pin.image}`,Buffer.from(await r.arrayBuffer()));
 }));
}
await fs.writeFile('docs/inspiration-candidates.json',JSON.stringify(candidates,null,2));
console.log(`Saved ${candidates.length} distinct references for visual review.`);
