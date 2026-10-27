import type {NailFrame} from './types';
export type Point={x:number;y:number};
export type Pixels={width:number;height:number;data:Uint8ClampedArray};
export type Nail={base:Point;dir:Point;w:number;h:number;outline?:number[]};
// MediaPipe hand landmarks: [fingertip, last joint] for thumb, index, middle, ring, pinky.
const FINGERS=[[4,3],[8,7],[12,11],[16,15],[20,19]] as const;
// Nail width as a share of knuckle span (index to pinky), and natural nail length as a share of the last finger segment.
const WIDTH=[.26,.2,.21,.19,.16],LENGTH=[.62,.55,.55,.55,.55];
const sub=(a:Point,b:Point)=>({x:a.x-b.x,y:a.y-b.y}),add=(a:Point,b:Point,k=1)=>({x:a.x+b.x*k,y:a.y+b.y*k}),len=(a:Point)=>Math.hypot(a.x,a.y);
const unit=(a:Point)=>{const l=len(a)||1;return {x:a.x/l,y:a.y/l}};
const across=(d:Point)=>({x:-d.y,y:d.x});
// Natural nail outlines from 21 hand landmarks, in the same coordinates as the landmarks.
export function nailsFromLandmarks(hand:Point[]):Nail[]{
 const span=Math.max(len(sub(hand[5],hand[17])),.75*len(sub(hand[0],hand[9])));
 return FINGERS.map(([tip,joint],i)=>{
  const segment=len(sub(hand[tip],hand[joint])),dir=unit(sub(hand[tip],hand[joint]));
  const h=Math.max(segment*LENGTH[i],4),end=add(hand[tip],dir,segment*.08);
  return {base:add(end,dir,-h),dir,w:Math.max(span*WIDTH[i],4),h};
 });
}
function sample(px:Pixels,p:Point){
 const x0=Math.round(p.x),y0=Math.round(p.y);let r=0,g=0,b=0,n=0;
 for(let y=y0-1;y<=y0+1;y++)for(let x=x0-1;x<=x0+1;x++){if(x<0||y<0||x>=px.width||y>=px.height)continue;const i=(y*px.width+x)*4;r+=px.data[i];g+=px.data[i+1];b+=px.data[i+2];n++}
 return n?[r/n,g/n,b/n]:null;
}
const distance=(a:number[],b:number[])=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);
function median(colors:(number[]|null)[]){const c=colors.filter((v):v is number[]=>!!v);if(!c.length)return null;return [0,1,2].map(k=>c.map(v=>v[k]).sort((a,b)=>a-b)[Math.floor(c.length/2)])}
// Walk from `from` along `step` while pixels look like the nail; small gaps (art, highlights) are tolerated.
function walk(px:Pixels,from:Point,step:Point,lanes:Point[],inside:(c:number[])=>boolean,max:number,gap:number){
 let last=0,miss=0;
 for(let s=1;s<=max;s++){
  const at=add(from,step,s),hits=lanes.filter(l=>{const c=sample(px,add(at,l));return !!c&&inside(c)}).length;
  if(hits*2>=lanes.length){last=s;miss=0}else if(++miss>gap)break;
 }
 return last;
}
// Snap an estimated nail to the colour edges in the photo. `extend` lets the tip grow past the
// fingertip, for long nails in a reference photo. Falls back to the estimate when nail and skin look alike.
export function refineNail(px:Pixels,nail:Nail,extend=false):Nail{
 const {dir,w,h}=nail,side=across(dir);let center=add(nail.base,dir,h/2);
 const nailColor=median([-.25,-.1,0,.1,.25].flatMap(t=>[-.2,0,.2].map(u=>sample(px,add(add(center,dir,t*h),side,u*w)))));
 const skin=median([.35,.5,.65].map(t=>sample(px,add(nail.base,dir,-t*h))));
 if(!nailColor||!skin)return nail;
 const contrast=distance(nailColor,skin);if(contrast<28)return nail;
 const limit=Math.min(Math.max(contrast*.65,24),90);
 const inside=(c:number[])=>{const d=distance(c,nailColor);return d<limit&&d<=distance(c,skin)};
 const gap=Math.max(2,Math.round(w*.12));
 const half=(sign:number)=>walk(px,center,{x:side.x*sign,y:side.y*sign},[-.15,0,.15].map(t=>({x:dir.x*t*h,y:dir.y*t*h})),inside,Math.round(w),gap);
 const right=half(1),left=half(-1),width=Math.min(Math.max(right+left,w*.75),w*1.35);
 if(right+left>=w*.75&&right+left<=w*1.35)center=add(center,side,(right-left)/2);
 const lanes=[-.25,0,.25].map(t=>({x:side.x*t*width,y:side.y*t*width}));
 const back=Math.min(Math.max(walk(px,center,{x:-dir.x,y:-dir.y},lanes,inside,Math.round(h),gap),h*.3),h*.7);
 const forward=extend?Math.min(Math.max(walk(px,center,dir,lanes,inside,Math.round(h*3),gap),h*.4),h*3):h/2;
 return {base:add(center,dir,-back),dir,w:width,h:back+forward};
}
// Widely used YCbCr skin range; nail polish, backgrounds and most nail art fall outside it.
function skinlike(c:number[]|null):number{
 if(!c)return 0;const [r,g,b]=c,cb=128-.169*r-.331*g+.5*b,cr=128+.5*r-.419*g-.081*b;
 return cb>=77&&cb<=127&&cr>=133&&cr<=173&&r>g?1:0;
}
// Convex hull (monotone chain). Nails are convex, so the hull also fills dents left by nail art.
function hull(points:Point[]){
 const p=[...points].sort((a,b)=>a.x-b.x||a.y-b.y),cross=(o:Point,a:Point,b:Point)=>(a.x-o.x)*(b.y-o.y)-(a.y-o.y)*(b.x-o.x);
 const half=(list:Point[])=>{const out:Point[]=[];for(const q of list){while(out.length>=2&&cross(out[out.length-2],out[out.length-1],q)<=0)out.pop();out.push(q)}out.pop();return out};
 return p.length<3?p:[...half(p),...half([...p].reverse())];
}
const area=(poly:Point[])=>Math.abs(poly.reduce((s,p,i)=>{const q=poly[(i+1)%poly.length];return s+p.x*q.y-q.x*p.y},0))/2;
type Trace={nail:Nail;color:number[];solidity:number;ring:number};
// Outline the nail at a point: cast rays until the colour jumps, then fit an oriented box around the convex outline.
// Comparing with pixels a few steps back follows ombré and soft gradients; nail art strokes are bridged as gaps.
function trace(px:Pixels,at:Point):Trace|null{
 // Base colour = the most common colour around the point, so starting on nail art still finds the nail.
 const near:number[][]=[];for(let x=-18;x<=18;x+=3)for(let y=-18;y<=18;y+=3){const c=x*x+y*y<=324&&sample(px,{x:at.x+x,y:at.y+y});if(c)near.push(c)}
 if(!near.length)return null;
 const mode=near.map(n=>near.filter(m=>distance(n,m)<20)).sort((a,b)=>b.length-a.length)[0];
 const seed=[0,1,2].map(k=>mode.reduce((s,c)=>s+c[k],0)/mode.length);
 const rays=64,edge:{p:Point;r:number}[]=[];let open=0;
 for(let k=0;k<rays;k++){
  const a=k/rays*2*Math.PI,d={x:Math.cos(a),y:Math.sin(a)};let last=0,prev=seed;
  for(let s=1;s<=320;s++){
   const c=sample(px,add(at,d,s));if(!c){open++;break}
   if(distance(c,prev)<18&&distance(c,seed)<50){last=s;if(s%3===0)prev=c}else if(s-last>14)break;
   if(s===320)open++;
  }
  edge.push({p:add(at,d,last),r:last});
 }
 // Rays that run off the photo mean the point was on background, not a nail.
 if(open>rays*.15)return null;
 const typical=[...edge].sort((a,b)=>a.r-b.r)[rays>>1].r;if(typical<4)return null;
 const points=edge.filter(e=>e.r<=typical*2.5).map(e=>e.p);if(points.length<rays*.6)return null;
 const shape=hull(points);if(shape.length<3)return null;
 const c={x:points.reduce((s,p)=>s+p.x,0)/points.length,y:points.reduce((s,p)=>s+p.y,0)/points.length};
 let xx=0,yy=0,xy=0;points.forEach(p=>{const d=sub(p,c);xx+=d.x*d.x;yy+=d.y*d.y;xy+=d.x*d.y});
 const angle=.5*Math.atan2(2*xy,xx-yy);let dir={x:Math.cos(angle),y:Math.sin(angle)};const side=across(dir);
 const proj=(p:Point,axis:Point)=>(p.x-c.x)*axis.x+(p.y-c.y)*axis.y;
 const us=shape.map(p=>proj(p,dir)),vs=shape.map(p=>proj(p,side));
 const u0=Math.min(...us),u1=Math.max(...us),v0=Math.min(...vs),v1=Math.max(...vs),w=v1-v0,h=u1-u0;if(w<6||h<6)return null;
 const mid=add(c,side,(v0+v1)/2);
 // Which end is the cuticle: it meets skin, while almond, coffin and stiletto shapes narrow towards the free edge.
 const skinAt=(u:number,out:number)=>[6,10,14].flatMap(o=>[-.2,0,.2].map(t=>skinlike(sample(px,add(add(mid,dir,u+out*o),side,t*w))))).reduce((a,b)=>a+b,0)/9;
 const widthAt=(u:number)=>{const v=points.filter(p=>Math.abs(proj(p,dir)-u)<=h*.1).map(p=>proj(p,side));return v.length>1?Math.max(...v)-Math.min(...v):0};
 const low=widthAt(u0+h*.3),high=widthAt(u0+h*.7),taper=low&&high?(low-high)/w:0;
 // With no clear answer, assume the usual photo pose: fingertips pointing up.
 const vote=skinAt(u0,-1)-skinAt(u1,1)+3*taper,flip=Math.abs(vote)<.1?dir.y>0:vote<0;
 if(flip)dir={x:-dir.x,y:-dir.y};
 const base=add(mid,dir,flip?-u1:u0),right=across(dir);
 // Outline in the studio's nail space: x across the width, y from the tip (-0.5) to the cuticle (+0.5).
 const outline=shape.flatMap(p=>{const d=sub(p,base);return [+((d.x*right.x+d.y*right.y)/w).toFixed(3),+(.5-(d.x*dir.x+d.y*dir.y)/h).toFixed(3)]});
 // How nail-like the region is: a solid convex shape, mostly bordered by skin.
 const ring=shape.map(p=>skinlike(sample(px,add(p,unit(sub(p,c)),8)))).reduce((a,b)=>a+b,0)/shape.length;
 return {nail:{base,dir,w,h,outline},color:seed,solidity:area(edge.map(e=>e.p))/area(shape),ring};
}
export function nailAt(px:Pixels,at:Point):Nail|null{return trace(px,at)?.nail??null}
// A guess is trusted only when an outline grown from its centre agrees with it. Loose for hand-landmark
// guesses; tight for nails marked by hand on library photos, where the traced outline only refines the shape.
export function confirmNail(px:Pixels,guess:Nail,tight=false):Nail|null{
 const found=nailAt(px,add(guess.base,guess.dir,guess.h*.5));if(!found)return null;
 const cos=found.dir.x*guess.dir.x+found.dir.y*guess.dir.y;
 const nail=cos<0?{...found,base:add(found.base,found.dir,found.h),dir:{x:-found.dir.x,y:-found.dir.y},outline:found.outline?.map(v=>-v)}:found;
 const [angle,w0,w1,h0,h1]=tight?[20,.75,1.3,.75,1.3]:[35,.5,2.2,.6,4];
 // A marked nail must also line up with the outline and be filled by it, not just match its size.
 const offset=len(sub(add(nail.base,nail.dir,nail.h/2),add(guess.base,guess.dir,guess.h/2)));
 const fill=nail.outline?area(Array.from({length:nail.outline.length/2},(_,i)=>({x:nail.outline![2*i],y:nail.outline![2*i+1]}))):1;
 const ok=Math.abs(cos)>Math.cos(angle*Math.PI/180)&&nail.w>guess.w*w0&&nail.w<guess.w*w1&&nail.h>guess.h*h0&&nail.h<guess.h*h1
  &&(!tight||(offset<Math.max(guess.w,guess.h)*.15&&fill>.55));
 return ok?nail:null;
}
export function toFrame(n:Nail):NailFrame{
 const c=add(n.base,n.dir,n.h/2);
 return {x:c.x,y:c.y,w:n.w,h:n.h,rotation:Math.atan2(n.dir.x,-n.dir.y)*180/Math.PI,...n.outline&&{outline:n.outline}};
}
// Fit a reference nail onto a natural nail: keep the cuticle and width, take length from the reference
// so press-on extensions reach past the fingertip as they do in the photo.
export function fitOnto(source:NailFrame,target:Nail):NailFrame{
 const ratio=Math.min(Math.max(source.h/source.w,.9),4);
 return toFrame({base:target.base,dir:target.dir,w:target.w,h:Math.max(target.w*ratio,target.h)});
}
