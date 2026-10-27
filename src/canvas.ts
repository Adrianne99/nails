import type {Placement,NailFrame} from './types';
export type Point={x:number;y:number};
export const fingerNames=['Thumb','Index','Middle','Ring','Pinky'];
export function initialPlacements(color:string,pattern:string):Placement[]{return fingerNames.map(()=>({x:500,y:500,w:65,h:110,rotation:0,color,pattern,shape:'Oval',curve:.65,fitted:false,opacity:1}));}
// Three points: cuticle center, tip center, then either side of the nail.
export function frameFromPoints(base:Point,tip:Point,edge:Point):NailFrame{
 const dx=tip.x-base.x,dy=tip.y-base.y,h=Math.hypot(dx,dy);
 if(h<8)throw new Error('Place the tip farther from the cuticle.');
 const w=2*Math.abs((edge.x-base.x)*(-dy/h)+(edge.y-base.y)*(dx/h));
 if(w<5)throw new Error('Place the side point on the edge of the nail.');
 return {x:(base.x+tip.x)/2,y:(base.y+tip.y)/2,w:Math.min(w,500),h,rotation:Math.atan2(dx,-dy)*180/Math.PI};
}
export function hitNail(p:Placement,point:Point){
 const a=-p.rotation*Math.PI/180,dx=point.x-p.x,dy=point.y-p.y;
 return !!p.fitted&&Math.abs(dx*Math.cos(a)-dy*Math.sin(a))<=p.w/2+12&&Math.abs(dx*Math.sin(a)+dy*Math.cos(a))<=p.h/2+12;
}
// 'Photo' follows the reference nail's own outline, smoothed through the midpoints of its sides.
export function nailPath(c:CanvasRenderingContext2D,w:number,h:number,shape:string,curve:number,outline?:number[]){
 if(shape==='Photo'&&outline&&outline.length>=6){
  const pts:Point[]=[];for(let i=0;i<outline.length;i+=2)pts.push({x:outline[i]*w,y:outline[i+1]*h});
  const mid=(a:Point,b:Point)=>({x:(a.x+b.x)/2,y:(a.y+b.y)/2}),start=mid(pts[pts.length-1],pts[0]);
  c.beginPath();c.moveTo(start.x,start.y);pts.forEach((p,i)=>{const m=mid(p,pts[(i+1)%pts.length]);c.quadraticCurveTo(p.x,p.y,m.x,m.y)});c.closePath();return;
 }
 c.beginPath();c.moveTo(-w*.45,h*.32);
 const tip=shape==='Square'?.45:shape==='Coffin'?.29:shape==='Almond'?.08:.26;
 c.bezierCurveTo(-w*.52,h*.05,-w*.48,-h*.25,-w*tip,-h*.46);
 c.quadraticCurveTo(0,-h*.54,w*tip,-h*.46);
 c.bezierCurveTo(w*.48,-h*.25,w*.52,h*.05,w*.45,h*.32);
 c.bezierCurveTo(w*.42,h*(.35+curve*.2),-w*.42,h*(.35+curve*.2),-w*.45,h*.32);c.closePath();
}
export function drawPhoto(c:CanvasRenderingContext2D,photo:HTMLImageElement){
 const ratio=Math.min(1000/photo.naturalWidth,1000/photo.naturalHeight);
 c.drawImage(photo,(1000-photo.naturalWidth*ratio)/2,(1000-photo.naturalHeight*ratio)/2,photo.naturalWidth*ratio,photo.naturalHeight*ratio);
}
export function drawMarkers(c:CanvasRenderingContext2D,points:Point[]){
 points.forEach((p,i)=>{c.beginPath();c.arc(p.x,p.y,11,0,Math.PI*2);c.fillStyle='#9e5267';c.fill();c.strokeStyle='white';c.lineWidth=3;c.stroke();c.fillStyle='white';c.font='bold 16px sans-serif';c.textAlign='center';c.fillText(String(i+1),p.x,p.y+5)});
 if(points.length===2){c.beginPath();c.moveTo(points[0].x,points[0].y);c.lineTo(points[1].x,points[1].y);c.strokeStyle='#9e5267';c.lineWidth=2;c.stroke()}
}
export function renderCanvas(canvas:HTMLCanvasElement,photo:HTMLImageElement,placements:Placement[],textures:Record<string,HTMLImageElement>,selected=-1,points:Point[]=[],before=false){
 const c=canvas.getContext('2d')!;canvas.width=1000;canvas.height=1000;c.fillStyle='#f1e9e4';c.fillRect(0,0,1000,1000);drawPhoto(c,photo);
 if(!before)placements.forEach((p,i)=>{
  const texture=p.texture?textures[p.texture]:null;
  if(!p.fitted||!p.source||!texture)return;
  const source=p.source;
  c.save();c.translate(p.x,p.y);c.rotate(p.rotation*Math.PI/180);nailPath(c,p.w,p.h,p.shape,p.curve,source.outline);
  c.save();c.clip();c.globalAlpha=p.opacity??1;
  c.scale(p.w/source.w,p.h/source.h);c.rotate(-source.rotation*Math.PI/180);c.translate(-source.x,-source.y);drawPhoto(c,texture);c.restore();
  if(i===selected){nailPath(c,p.w,p.h,p.shape,p.curve,source.outline);c.strokeStyle='rgba(255,255,255,.95)';c.lineWidth=2;c.setLineDash([5,5]);c.stroke();}
  c.restore();
 });
 if(!before)drawMarkers(c,points);
}
