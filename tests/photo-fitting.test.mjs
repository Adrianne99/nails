import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import ts from 'typescript';
const source=await readFile(new URL('../src/canvas.ts',import.meta.url),'utf8');
const {outputText}=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}});
const {frameFromPoints,hitNail,initialPlacements,renderCanvas}=await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
test('fits upright, horizontal and rotated nails using anatomical landmarks',()=>{
 assert.deepEqual(frameFromPoints({x:100,y:200},{x:100,y:100},{x:120,y:150}),{x:100,y:150,w:40,h:100,rotation:0});
 const sideways=frameFromPoints({x:100,y:100},{x:200,y:100},{x:150,y:120});
 assert.equal(sideways.rotation,90);assert.equal(sideways.w,40);assert.equal(sideways.h,100);
 const diagonal=frameFromPoints({x:100,y:200},{x:200,y:100},{x:160,y:160});
 assert.equal(diagonal.rotation,45);assert.ok(Math.abs(diagonal.w-28.284271)<.001);
});
test('rejects degenerate fitting points rather than creating infinite transforms',()=>{
 assert.throws(()=>frameFromPoints({x:1,y:1},{x:1,y:1},{x:20,y:1}),/tip farther/);
 assert.throws(()=>frameFromPoints({x:100,y:200},{x:100,y:100},{x:100,y:150}),/side point/);
});
test('hit testing follows rotation and ignores nails that have not been fitted',()=>{
 const p={...initialPlacements('#fff','solid')[0],x:200,y:200,w:40,h:120,rotation:90,fitted:true};
 assert.ok(hitNail(p,{x:250,y:200}));assert.equal(hitNail(p,{x:200,y:250}),false);
 assert.equal(hitNail({...p,fitted:false},{x:200,y:200}),false);
});
test('new hands start clean, without guessed nail positions',()=>{
 const placements=initialPlacements('#fff','solid');assert.equal(placements.length,5);assert.ok(placements.every(p=>!p.fitted&&!p.texture));
});
test('render uses real reference pixels, omits controls in export, and supports original comparison',()=>{
 const calls=[];const c=new Proxy({}, {get:(_t,k)=> (...args)=>calls.push([k,...args]),set:()=>true});const canvas={getContext:()=>c};
 const hand={naturalWidth:500,naturalHeight:1000},texture={naturalWidth:1000,naturalHeight:700};
 const p={...initialPlacements('#fff','solid')[0],fitted:true,texture:'reference',source:{x:500,y:500,w:80,h:140,rotation:45}};
 renderCanvas(canvas,hand,[p],{reference:texture});
 assert.equal(calls.filter(c=>c[0]==='drawImage').length,2);
 assert.equal(calls.filter(c=>c[0]==='fillRect').length,1,'Only the photo backdrop is painted; nails are photographic');
 assert.equal(calls.filter(c=>c[0]==='stroke').length,0,'Export has no selection outline');
 assert.ok(calls.some(c=>c[0]==='rotate'&&c[1]===-Math.PI/4));
 calls.length=0;renderCanvas(canvas,hand,[p],{reference:texture},-1,[],true);assert.equal(calls.filter(c=>c[0]==='drawImage').length,1);
});
test('at least 500 distinct inspiration photos have local assets and Pinterest sources',async()=>{
 const refs=JSON.parse(await readFile(new URL('../src/inspirations.json',import.meta.url),'utf8'));
 assert.ok(refs.length>=500);assert.equal(new Set(refs.map(p=>p.id)).size,refs.length);assert.equal(new Set(refs.map(p=>p.image)).size,refs.length);
 for(const p of refs){assert.match(p.source,/^https:\/\/www\.pinterest\.com\/(?:pin\/\d+|[\w-]+\/[\w-]+)\/$/);assert.ok(p.name&&p.category);assert.ok(p.price>=20000&&p.price<=35000);const file=new URL('../public'+p.image,import.meta.url);assert.ok((await stat(file)).size>1000);}
});
