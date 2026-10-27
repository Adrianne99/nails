import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
const source=await readFile(new URL('../src/autofit.ts',import.meta.url),'utf8');
const {outputText}=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}});
const {nailsFromLandmarks,nailAt,confirmNail,refineNail,fitOnto,toFrame}=await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
const close=(a,b,tolerance,label)=>assert.ok(Math.abs(a-b)<=tolerance,`${label}: ${a} is not within ${tolerance} of ${b}`);
const SKIN=[198,150,122],POLISH=[120,20,40],GOLD=[230,190,90],TABLE=[240,240,240];
// A finger pointing along `dir`, a polished nail on its end, and a pale table past the fingertip.
function photo({center={x:500,y:500},angle=30,w=60,h=120,stripe=false}={}){
 const size=1000,data=new Uint8ClampedArray(size*size*4),a=angle*Math.PI/180,dir={x:Math.sin(a),y:-Math.cos(a)},side={x:-dir.y,y:dir.x};
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const dx=x-center.x,dy=y-center.y,u=dx*dir.x+dy*dir.y,v=dx*side.x+dy*side.y;
  let c=u>h/2?TABLE:Math.abs(v)<w/2+18?SKIN:TABLE;
  if(Math.abs(u)<=h/2&&Math.abs(v)<=w/2)c=stripe&&Math.abs(u-10)<5?GOLD:POLISH;
  data.set([...c,255],(y*size+x)*4);
 }
 return {pixels:{width:size,height:size,data},dir,center,w,h};
}
test('estimates five natural nails from hand landmarks, cuticle below fingertip',()=>{
 // Upright left hand seen from the back: wrist at the bottom, fingertips at the top.
 const hand=Array.from({length:21},()=>({x:0,y:0}));
 hand[0]={x:500,y:900};
 [[1,2,3,4],[5,6,7,8],[9,10,11,12],[13,14,15,16],[17,18,19,20]].forEach((joints,f)=>joints.forEach((j,k)=>{hand[j]={x:300+f*100,y:(f===0?750:600)-k*90}}));
 const nails=nailsFromLandmarks(hand);
 assert.equal(nails.length,5);
 for(const n of nails){assert.ok(n.dir.y<-.99,'points up the finger');assert.ok(n.base.y>n.base.y+n.dir.y*n.h,'cuticle is below the tip');assert.ok(n.w>0&&n.h>0)}
 assert.ok(nails[0].w>nails[4].w,'thumb nail is wider than the pinky nail');
});
test('outlines a tapped nail with its size, direction and cuticle end',()=>{
 const p=photo();const nail=nailAt(p.pixels,p.center);assert.ok(nail);
 close(nail.w,p.w,8,'width');close(nail.h,p.h,10,'length');
 assert.ok(nail.dir.x*p.dir.x+nail.dir.y*p.dir.y>.97,'points from cuticle to free edge');
 close(nail.base.x,p.center.x-p.dir.x*p.h/2,8,'cuticle x');close(nail.base.y,p.center.y-p.dir.y*p.h/2,8,'cuticle y');
});
test('keeps the nail’s own outline in nail space, tip at the top',()=>{
 const p=photo({angle:-15});const {outline}=nailAt(p.pixels,p.center);assert.ok(outline&&outline.length>=6);
 const xs=outline.filter((_,i)=>i%2===0),ys=outline.filter((_,i)=>i%2===1);
 assert.ok(xs.every(x=>Math.abs(x)<=.51)&&ys.every(y=>Math.abs(y)<=.51),'inside the nail box');
 close(Math.max(...xs)-Math.min(...xs),1,.05,'spans the width');close(Math.max(...ys)-Math.min(...ys),1,.05,'spans the length');
});
test('marked library nails are refined only by a closely matching outline',()=>{
 const p=photo({angle:0}),base={x:500,y:560},dir={x:0,y:-1};
 const refined=confirmNail(p.pixels,{base,dir,w:58,h:118},true);assert.ok(refined?.outline,'close mark takes the traced outline');
 assert.equal(confirmNail(p.pixels,{base,dir,w:30,h:118},true),null,'a mark half as wide keeps its own box');
 assert.ok(confirmNail(p.pixels,{base,dir,w:30,h:118}),'the loose landmark check would have accepted it');
});
test('a tap on nail art still finds the whole nail',()=>{
 const p=photo({stripe:true,angle:-20});const nail=nailAt(p.pixels,{x:p.center.x+p.dir.x*10,y:p.center.y+p.dir.y*10});assert.ok(nail);
 close(nail.w,p.w,8,'width');close(nail.h,p.h,12,'length');
});
test('a tap away from any nail does not invent one',()=>{
 const p=photo();assert.equal(nailAt(p.pixels,{x:60,y:60}),null);
});
test('landmark guesses are kept only when the photo agrees',()=>{
 const p=photo({angle:0}),base={x:500,y:560};
 const agree=confirmNail(p.pixels,{base,dir:{x:0,y:-1},w:55,h:110});assert.ok(agree);assert.ok(agree.dir.y<-.97);
 assert.equal(confirmNail(p.pixels,{base,dir:{x:1,y:0},w:55,h:110}),null,'sideways guess is rejected');
 assert.equal(confirmNail(p.pixels,{base:{x:60,y:120},dir:{x:0,y:-1},w:55,h:110}),null,'guess off the nail is rejected');
});
test('refinement snaps width to the nail and keeps the estimate when nail and skin match',()=>{
 const p=photo({angle:0});
 const refined=refineNail(p.pixels,{base:{x:500,y:560},dir:{x:0,y:-1},w:48,h:110});close(refined.w,60,6,'width');
 const plain=photo({angle:0});plain.pixels.data.forEach((_,i,d)=>{if(i%4<3)d[i]=SKIN[i%4]});
 const guess={base:{x:500,y:560},dir:{x:0,y:-1},w:48,h:110};assert.deepEqual(refineNail(plain.pixels,guess),guess);
});
test('reference nails keep the customer’s cuticle and width, with the reference length',()=>{
 const target={base:{x:200,y:400},dir:{x:0,y:-1},w:40,h:50};
 const frame=fitOnto({x:0,y:0,w:30,h:90,rotation:12},target);
 assert.equal(frame.w,40);assert.equal(frame.h,120);assert.equal(frame.rotation,0);
 close(frame.y+frame.h/2,400,1e-9,'cuticle stays put');
 assert.equal(fitOnto({x:0,y:0,w:60,h:30,rotation:0},target).h,50,'never shorter than the natural nail');
 assert.equal(toFrame({base:{x:0,y:0},dir:{x:1,y:0},w:10,h:20}).rotation,90);
});
test('library nail maps point at real library photos with usable marks',async()=>{
 const maps=JSON.parse(await readFile(new URL('../src/nail-maps.json',import.meta.url),'utf8'));
 const library=JSON.parse(await readFile(new URL('../src/inspirations.json',import.meta.url),'utf8')).map(p=>p.image);
 const catalog=[...(await readFile(new URL('../src/references.ts',import.meta.url),'utf8')).matchAll(/image:'([^']+)'/g)].map(m=>m[1]);
 for(const [path,map] of Object.entries(maps)){
  assert.ok(library.includes(path)||catalog.includes(path),`${path} is a library photo`);
  assert.ok(['Almond','Oval','Square','Coffin'].includes(map.shape),`${path} shape`);
  assert.ok(map.nails.length>=1&&map.nails.length<=5,`${path} nails`);
  for(const n of map.nails){for(const v of [...n.c,...n.t])assert.ok(v>=0&&v<=1,`${path} point inside the photo`);assert.ok(n.w>0&&n.w<1);assert.ok(Math.hypot(n.t[0]-n.c[0],n.t[1]-n.c[1])>.005,`${path} has length`)}
  assert.equal(map.fingers.length,5);assert.ok(map.fingers.every(i=>Number.isInteger(i)&&i>=0&&i<map.nails.length),`${path} fingers`);
 }
});
