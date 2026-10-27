import fs from 'node:fs/promises';
const boards=[
['posers/nails-french-manicure-variations','French'],['andaleebimran/french-nails','French'],['itakeyou/nails-french','French'],['ancin/nails-french','French'],['joannatili/french-nails','French'],['wendystapelberg/nail-art-french-inspiration','French'],
['opiproducts/chrome-effects','Chrome & shimmer'],['06anapet/chrome-nails','Chrome & shimmer'],['polishandpearls/chrome-nail-designs','Chrome & shimmer'],['samabam0497/chrome-nails-designs','Chrome & shimmer'],['broadoverkr/chrome-nails','Chrome & shimmer'],
['chloe813/nails-floral','Floral'],['boncza12/floral-nails','Floral'],['oonaversalstudios/neutral-nail-art','Soft & neutral'],['mohammedingrid/neutral-nails','Soft & neutral'],['ayu_cynthia/neutral-nails','Soft & neutral'],['ronnicad/nude-nail-designs','Soft & neutral'],['khanhamra75/neutral-nails','Soft & neutral'],['bene1978/neutral-nails','Soft & neutral'],['sparklespiink/neutral-nails','Soft & neutral'],['carlaaguilera98/neutral-nails','Soft & neutral'],['isabellerossd/neutral-nails','Soft & neutral'],['beautyliestruthcom/trendy-nails','Color & details'],['teenvogue/nail-art-ideas','Color & details']];
const previous=JSON.parse(await fs.readFile('docs/inspiration-candidates.json','utf8'));
const known=new Set(previous.map(p=>p.imageUrl.split('/').pop()));
const pins=new Map();
for(const [path,category] of boards){
 const board=`https://www.pinterest.com/${path}/`;
 try{const response=await fetch(board,{signal:AbortSignal.timeout(30000)});if(!response.ok){console.log(response.status,path);continue}const html=await response.text();const match=html.match(/<script[^>]*id="__PWS_INITIAL_PROPS__"[^>]*>([\s\S]*?)<\/script>/);if(!match)continue;
 for(const p of Object.values(JSON.parse(match[1]).initialReduxState?.pins||{})){
 const img=p.images?.['736x']||p.images?.['474x'];if(!img||p.videos||img.width<300||img.height<300)continue;
 const sig=img.url.split('/').pop();if(known.has(sig)||pins.has(sig))continue;
 const words=`${p.title||''} ${p.grid_title||''} ${p.description||''}`;if(/\b(ai generated|ai art|midjourney|tutorial|step by step|wallpaper|coloring page|drawing)\b/i.test(words))continue;
 const numeric=/^\d+$/.test(p.id);const id=numeric?p.id:'image-'+p.image_signature;
 pins.set(sig,{id,imageUrl:img.url,source:numeric?`https://www.pinterest.com/pin/${p.id}/`:board,sourceKind:numeric?'pin':'board',board,category,title:p.title||p.grid_title||'',description:p.description||'',color:p.dominant_color||'#b7838d'});
 }console.log(path,pins.size);
 }catch(e){console.log(path,e.message)}
}
const candidates=[...pins.values()];await fs.mkdir('docs/expansion',{recursive:true});
for(let i=0;i<candidates.length;i+=6){await Promise.all(candidates.slice(i,i+6).map(async p=>{try{const r=await fetch(p.imageUrl,{signal:AbortSignal.timeout(30000)});if(!r.ok)throw Error(String(r.status));p.image=`/images/inspirations/${p.id}.jpg`;await fs.writeFile(`public${p.image}`,Buffer.from(await r.arrayBuffer()))}catch(e){p.failed=true;console.log('image failed',p.id)}}));}
await fs.writeFile('docs/expansion/candidates.json',JSON.stringify(candidates.filter(p=>!p.failed),null,2));console.log('Downloaded',candidates.filter(p=>!p.failed).length);
