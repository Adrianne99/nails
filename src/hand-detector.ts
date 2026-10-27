import type {HandLandmarker} from '@mediapipe/tasks-vision';
import wasmLoaderPath from '@mediapipe/tasks-vision/vision_wasm_internal.js?url';
import wasmBinaryPath from '@mediapipe/tasks-vision/vision_wasm_internal.wasm?url';
import {drawPhoto} from './canvas';
import {confirmNail,nailAt,nailsFromLandmarks,refineNail,toFrame,type Nail,type Pixels,type Point} from './autofit';
import type {NailFrame} from './types';
import maps from './nail-maps.json';
// Runs entirely in the browser. The model and runtime are served from this site; photos are not uploaded anywhere.
let detector:Promise<HandLandmarker>|null=null;
function load(){
 detector??=import('@mediapipe/tasks-vision').then(({HandLandmarker})=>HandLandmarker.createFromOptions({wasmLoaderPath,wasmBinaryPath},{
  baseOptions:{modelAssetPath:`${import.meta.env.BASE_URL}models/hand_landmarker.task`,delegate:'CPU'},runningMode:'IMAGE',numHands:4,minHandDetectionConfidence:.1,minHandPresenceConfidence:.1,
 })).catch(e=>{detector=null;throw e});
 return detector;
}
// Same 1000×1000 letterboxed space the studio canvases use.
const cache=new WeakMap<HTMLImageElement,Pixels>();
function pixels(photo:HTMLImageElement):Pixels{
 let px=cache.get(photo);if(px)return px;
 const c=document.createElement('canvas');c.width=1000;c.height=1000;const g=c.getContext('2d',{willReadFrequently:true})!;drawPhoto(g,photo);
 px=g.getImageData(0,0,1000,1000);cache.set(photo,px);return px;
}
// Close-up nail photos often show partial hands; margins and turns help the palm detector find them.
const attempts=[[0,0],[0,.3],[90,.3],[270,.3],[180,.3]];
async function findHands(photo:HTMLImageElement,accept:(hand:Point[])=>boolean){
 const detector=await load(),w=photo.naturalWidth,h=photo.naturalHeight,ratio=Math.min(1000/w,1000/h),ox=(1000-w*ratio)/2,oy=(1000-h*ratio)/2;
 for(const [turn,margin] of attempts){
  const sideways=turn%180!==0,W=Math.round((sideways?h:w)*(1+2*margin)),H=Math.round((sideways?w:h)*(1+2*margin));
  const c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d')!;g.fillStyle='#808080';g.fillRect(0,0,W,H);g.translate(W/2,H/2);g.rotate(turn*Math.PI/180);g.drawImage(photo,-w/2,-h/2);
  const a=-turn*Math.PI/180,cos=Math.cos(a),sin=Math.sin(a);
  const hands=detector.detect(c).landmarks.map(hand=>hand.map(l=>{const x=l.x*W-W/2,y=l.y*H-H/2;return {x:ox+(x*cos-y*sin+w/2)*ratio,y:oy+(x*sin+y*cos+h/2)*ratio}})).filter(accept);
  if(hands.length)return hands.sort((a,b)=>size(b)-size(a));
 }
 return [];
}
const size=(hand:Point[])=>Math.hypot(hand[0].x-hand[9].x,hand[0].y-hand[9].y)+Math.hypot(hand[5].x-hand[17].x,hand[5].y-hand[17].y);
// Natural nails on the customer's own hand photo, thumb to pinky, or null when no hand is visible.
export async function findHandNails(photo:HTMLImageElement):Promise<Nail[]|null>{
 const [hand]=await findHands(photo,h=>size(h)>120);if(!hand)return null;
 const px=pixels(photo);return nailsFromLandmarks(hand).map(n=>refineNail(px,n));
}
type NailMap={shape:string;nails:{c:number[];t:number[];w:number}[];fingers:number[]};
// Reference nails per finger, thumb to pinky. Library photos have their nails marked in nail-maps.json (keyed by
// image path); other photos rely on a detected hand, used only when outlines grown from the photo agree with it.
export async function findReferenceNails(photo:HTMLImageElement,path?:string):Promise<{frames:(NailFrame|null)[];shape?:string}|null>{
 const px=pixels(photo),map=path?(maps as Record<string,NailMap>)[path]:undefined;
 if(map?.nails.length){
  const w=photo.naturalWidth,h=photo.naturalHeight,ratio=Math.min(1000/w,1000/h),ox=(1000-w*ratio)/2,oy=(1000-h*ratio)/2;
  const at=([x,y]:number[])=>({x:ox+x*w*ratio,y:oy+y*h*ratio});
  const nails=map.nails.map(n=>{const c=at(n.c),t=at(n.t),length=Math.hypot(t.x-c.x,t.y-c.y)||1;
   const marked:Nail={base:c,dir:{x:(t.x-c.x)/length,y:(t.y-c.y)/length},w:n.w*w*ratio,h:length};return confirmNail(px,marked,true)??marked});
  return {frames:map.fingers.map(i=>toFrame(nails[i]??nails[0])),shape:map.shape};
 }
 for(const hand of await findHands(photo,h=>size(h)>160)){
  const nails=nailsFromLandmarks(hand).map(n=>confirmNail(px,n));
  if(nails.filter(Boolean).length>=3)return {frames:nails.map(n=>n&&toFrame(n))};
 }
 return null;
}
export function referenceNailAt(photo:HTMLImageElement,point:Point):NailFrame|null{
 const nail=nailAt(pixels(photo),point);return nail&&toFrame(nail);
}
