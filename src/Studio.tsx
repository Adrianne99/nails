import {useEffect,useRef,useState} from 'react';
import {ArrowRight,Check,Crosshair,Hand,Move,Save,Sparkles,Undo2,Upload,X,ZoomIn} from 'lucide-react';
import {useShop,usePhoto} from './shop';
import {galleryUrl,mutate,upload} from './api';
import {drawPhoto,fingerNames,frameFromPoints,hitNail,initialPlacements,nailPath,renderCanvas,type Point} from './canvas';
import {fitOnto,type Nail} from './autofit';
import {findHandNails,findReferenceNails,referenceNailAt} from './hand-detector';
import {InspirationGallery,inspirations,shown} from './InspirationGallery';
import {references} from './references';
import type {NailFrame,Placement} from './types';
function loadImage(src:string){return new Promise<HTMLImageElement>((resolve,reject)=>{const i=new Image();i.crossOrigin='anonymous';i.onload=()=>resolve(i);i.onerror=()=>reject(new Error('Could not load this photo. Please try again.'));i.src=src})}
function pointer(e:React.PointerEvent<HTMLCanvasElement>):Point{const r=e.currentTarget.getBoundingClientRect();return {x:(e.clientX-r.left)/r.width*1000,y:(e.clientY-r.top)/r.height*1000}}
const steps=['cuticle center','tip center','side edge'];
export function Studio(){
 const {user,media,designs,selected,run,refresh,busy,editPreview,setEditPreview,setOrderPreview,orderDesign,go}=useShop();
 const hands=media.filter(m=>m.owner_id===user?.id&&m.kind==='hand'),ownInspiration=media.filter(m=>m.owner_id===user?.id&&m.kind==='inspiration');
 const [photoId,setPhotoId]=useState(editPreview?.photo_id||hands[0]?.id||''),[inspirationId,setInspirationId]=useState(editPreview?.inspiration_id||'');
 const [placements,setPlacements]=useState<Placement[]>(editPreview?.placements||initialPlacements(selected.color,selected.pattern)),[active,setActive]=useState(0),[history,setHistory]=useState<Placement[][]>([]);
 const [sourceId,setSourceId]=useState(()=>{const saved=sessionStorage.getItem('eurie.reference');return editPreview?.placements.find(p=>p.texture)?.texture||(inspirations.some(p=>p.id===saved)?saved!:selected.id)});
 const [sourceFrame,setSourceFrame]=useState<NailFrame|null>(()=>editPreview?.placements.find(p=>p.texture)?.source||null),[fitPoints,setFitPoints]=useState<Point[]>([]);
 const [mode,setMode]=useState<'fit'|'move'|'pan'>('move'),[zoom,setZoom]=useState(1),[pan,setPan]=useState({x:0,y:0}),[before,setBefore]=useState(false),[library,setLibrary]=useState(false);
 const [image,setImage]=useState<HTMLImageElement|null>(null),[textures,setTextures]=useState<Record<string,HTMLImageElement>>({}),[saved,setSaved]=useState(''),[feedback,setFeedback]=useState('Finding the nails…');
 // undefined while looking, null when no hand was found in the photo
 const [handNails,setHandNails]=useState<Nail[]|null|undefined>(undefined),[autoPending,setAutoPending]=useState(!editPreview);
 const canvas=useRef<HTMLCanvasElement>(null),sourceCanvas=useRef<HTMLCanvasElement>(null),cutoutCanvas=useRef<HTMLCanvasElement>(null);
 const drag=useRef<{point:Point;client:Point;index:number;original:Placement[];pan:Point}|null>(null);
 const handUrl=usePhoto(media.find(m=>m.id===photoId)?.path),uploadUrl=usePhoto(media.find(m=>m.id===inspirationId)?.path);
 const p=placements[active],sourceImage=textures[sourceId];
 const sourceOptions=[...designs.map(d=>({id:d.id,name:d.name,image:d.photo_path?galleryUrl(d.photo_path):references[d.id]?.image,source:references[d.id]?.source})),...inspirations];
 const option=sourceOptions.find(s=>s.id===sourceId);
 const textureIds=[...new Set([sourceId,...placements.map(p=>p.texture).filter((id):id is string=>!!id)])].sort().join('|');
 const textureSources=JSON.stringify(Object.fromEntries(sourceOptions.map(o=>[o.id,o.image])));
 useEffect(()=>{if(hands.length&&!hands.some(h=>h.id===photoId)){setPhotoId(hands[0].id);setPlacements(initialPlacements(selected.color,selected.pattern));setFitPoints([]);setSaved('')}},[hands.map(h=>h.id).join('|'),photoId]);
 useEffect(()=>{let valid=true;setImage(null);if(handUrl)void run(async()=>{const img=await loadImage(handUrl);if(valid)setImage(img)});return()=>{valid=false}},[handUrl]);
 useEffect(()=>{let valid=true;const sources=JSON.parse(textureSources) as Record<string,string>;
  void run(async()=>{const entries=await Promise.all(textureIds.split('|').map(async id=>{const src=id==='upload'?uploadUrl:sources[id];return src?[id,await loadImage(src)] as const:null}));if(valid)setTextures(Object.fromEntries(entries.filter((e):e is readonly [string,HTMLImageElement]=>e!==null)))});
  return()=>{valid=false};
 },[textureIds,textureSources,uploadUrl]);
 useEffect(()=>{let valid=true;setHandNails(undefined);if(image)findHandNails(image).then(n=>{if(valid)setHandNails(n)},()=>{if(valid){setHandNails(null);setFeedback('Automatic fitting could not start. Tap a nail on the reference, then mark it on your hand.')}});return()=>{valid=false}},[image]);
 useEffect(()=>{if(!autoPending||!image||handNails===undefined||!sourceImage)return;let valid=true;setAutoPending(false);
  if(!handNails){setFeedback('We couldn’t find your hand in this photo. Try a photo of the back of your hand, fingers apart and all nails showing.');return}
  setFeedback('Fitting your nails…');
  findReferenceNails(sourceImage,sourceId==='upload'?undefined:option?.image).then(found=>{if(!valid)return;const first=found?.frames.find(f=>!!f);
   if(!found||!first){setFeedback('We couldn’t find the nails in this photo by ourselves. Tap the nail you like on the photo.');return}
   const sources=found.frames.map(f=>f||first);place(sources,found.shape);setSourceFrame(sources[active]);setFeedback('Done! Your nails are fitted. Save it, or continue to place your order.');
  },()=>{if(valid)setFeedback('We couldn’t find the nails in this photo by ourselves. Tap the nail you like on the photo.')});
  return()=>{valid=false};
 },[autoPending,image,handNails,sourceImage]);
 useEffect(()=>{if(canvas.current&&image)renderCanvas(canvas.current,image,placements,textures,active,mode==='fit'?fitPoints:[],before)},[image,placements,textures,active,fitPoints,mode,before]);
 useEffect(()=>{if(!sourceCanvas.current)return;const c=sourceCanvas.current.getContext('2d')!;sourceCanvas.current.width=1000;sourceCanvas.current.height=1000;c.fillStyle='#f1e9e4';c.fillRect(0,0,1000,1000);
  if(sourceImage){drawPhoto(c,sourceImage);
  // Outline the nails copied from this photo
  const copied=[...new Set([sourceFrame,...placements.filter(x=>x.texture===sourceId).map(x=>x.source)])].filter((f):f is NailFrame=>!!f);
  copied.forEach(f=>{c.save();c.translate(f.x,f.y);c.rotate(f.rotation*Math.PI/180);nailPath(c,f.w,f.h,p.shape,p.curve,f.outline);c.strokeStyle='white';c.lineWidth=5;c.stroke();c.strokeStyle='#9e5267';c.lineWidth=2;c.stroke();c.restore()})}
 },[sourceImage,sourceFrame,placements,sourceId,p.shape,p.curve,hands.length]);
 useEffect(()=>{const out=cutoutCanvas.current;if(!out)return;out.width=180;out.height=240;const c=out.getContext('2d')!;c.clearRect(0,0,180,240);if(!sourceImage||!sourceFrame)return;const scale=Math.min(150/sourceFrame.w,210/sourceFrame.h);c.translate(90,120);c.scale(scale,scale);nailPath(c,sourceFrame.w,sourceFrame.h,p.shape,p.curve,sourceFrame.outline);c.clip();c.rotate(-sourceFrame.rotation*Math.PI/180);c.translate(-sourceFrame.x,-sourceFrame.y);drawPhoto(c,sourceImage)},[sourceImage,sourceFrame,p.shape,p.curve,hands.length]);
 const change=(next:Placement[])=>{setHistory(h=>[...h.slice(-39),structuredClone(placements)]);setPlacements(next);setSaved('')};
 const update=(patch:Partial<Placement>)=>change(placements.map((item,i)=>i===active?{...item,...patch}:item));
 function chooseSource(id:string){setSourceId(id);setSourceFrame(null);setFitPoints([]);setLibrary(false);setAutoPending(true);setFeedback('Finding the nails…');if(id!=='upload')sessionStorage.setItem('eurie.reference',id)}
 function chooseUpload(id:string){if(id!==inspirationId){change(placements.map(p=>p.texture==='upload'?{...p,source:undefined,texture:undefined,fitted:false}:p));setInspirationId(id)}chooseSource('upload')}
 // Put reference nails on the given fingers; with a detected hand they are fitted at once, otherwise the customer marks each nail.
 // Nails with a traced outline keep the reference's exact shape ('Photo'); others use the photo's marked shape.
 function place(sources:(NailFrame|null)[],shape=p.shape){
  change(placements.map((item,i)=>{const source=sources[i];if(!source)return item;const next={...item,source,texture:sourceId,pattern:'photo',shape:source.outline?'Photo':shape,curve:p.curve};return handNails?{...next,...fitOnto(source,handNails[i]),fitted:true}:next}));
  setFitPoints([]);setMode(handNails?'move':'fit');setBefore(false);
 }
 function extract(point:Point){const frame=referenceNailAt(sourceImage,point);if(!frame){setFeedback('We couldn’t outline a nail there. Tap the middle of a nail.');return}setSourceFrame(frame);
  // The first tap dresses the whole hand; later taps change just the selected finger.
  const all=!placements.some(p=>p.fitted&&p.texture);place(placements.map((_,i)=>all||i===active?frame:null));
  setFeedback(!handNails?`Cutout ready. On your hand, mark the ${fingerNames[active].toLowerCase()}: cuticle, tip, side.`:all?'Fitted to all five fingers. Tap another nail on the reference to change the selected finger.':`${fingerNames[active]} updated.`);
 }
 function applyCutout(all=false){if(!sourceFrame)return;place(placements.map((_,i)=>all||i===active?sourceFrame:null));setFeedback(handNails?(all?'Cutout fitted to all five fingers.':`${fingerNames[active]} fitted.`):`On your hand, mark the ${fingerNames[active].toLowerCase()}: cuticle, tip, side.`)}
 function fit(point:Point){if(!p.source||!p.texture){setFeedback('Tap a nail on the reference first.');return}const next=[...fitPoints,point];if(next.length<3){setFitPoints(next);return}try{update({...frameFromPoints(next[0],next[1],next[2]),fitted:true});setFitPoints([]);setMode('move');setFeedback(`${fingerNames[active]} fitted. Drag to fine-tune, or select the next finger.`)}catch(e){setFitPoints([]);setFeedback((e as Error).message)}}
 const fitted=placements.filter(p=>p.fitted&&p.source&&p.texture).length;
 const texturesReady=placements.every(p=>!p.fitted||!!(p.texture&&textures[p.texture]));
 async function save(){if(!image||!fitted||!texturesReady)throw new Error('Fit at least one nail and wait for its reference photo to load.');const out=document.createElement('canvas');renderCanvas(out,image,placements,textures);const blob=await new Promise<Blob>((res,rej)=>out.toBlob(b=>b?res(b):rej(new Error('Could not save preview.')),'image/webp',.9));const result=await upload(blob,'preview','Photo nail try-on');const preview=await mutate('preview_save',{photo_id:photoId,image_id:result.id,inspiration_id:placements.some(p=>p.texture==='upload')?inspirationId:null,placements});setSaved(preview.id);setOrderPreview(preview.id);setEditPreview(null);await refresh();return preview.id;}
 return <section className="section workspace photo-studio"><div className="section-heading"><div><span className="eyebrow">REAL PHOTOS. YOUR OWN FIT.</span><h1>The try-on studio.</h1><p>Your hand, then the style you love. We do the rest.</p></div><span className="badge">Photo cutouts · No AI generation</span></div>
 <div className="studio-steps"><span><b>1</b> Upload your hand</span><span><b>2</b> Choose a style</span></div>
 {hands.length===0?<div className="empty"><Hand size={40}/><h2>Let’s start with your hands.</h2><p>Save a hand photo to create a private try-on.</p><button className="button" onClick={()=>go('hands')}>Add a hand photo <ArrowRight size={17}/></button></div>:<div className="studio-layout"><div className="hand-workspace"><div className="studio-top"><label>Hand photo<select value={photoId} onChange={e=>{setPhotoId(e.target.value);change(initialPlacements(selected.color,selected.pattern));setFitPoints([]);setPan({x:0,y:0});setZoom(1);setMode('fit');setAutoPending(true);setFeedback('Finding the nails on this hand…')}}>{hands.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select></label><button className={`button secondary ${before?'is-active':''}`} onClick={()=>setBefore(!before)}>{before?'Show try-on':'View original'}</button></div>
 <p className="fit-instruction" role="status">{before?'Original hand photo':feedback}</p>
 <div className="canvas-viewport"><canvas ref={canvas} aria-label="Your hand. Fit a nail by tapping its cuticle center, tip center, and side edge." style={{transform:`translate(${pan.x}px,${pan.y}px) scale(${zoom})`}} onPointerDown={e=>{if(!image||before)return;e.currentTarget.setPointerCapture(e.pointerId);const point=pointer(e);if(mode==='fit'){fit(point);return}const found=placements.findIndex(p=>hitNail(p,point));if(mode==='move'&&found<0)return;const index=found>=0?found:active;if(mode==='move'){setActive(index);setHistory(h=>[...h.slice(-39),structuredClone(placements)])}drag.current={point,client:{x:e.clientX,y:e.clientY},index,original:structuredClone(placements),pan}}} onPointerMove={e=>{const d=drag.current;if(!d)return;if(mode==='pan'){setPan({x:d.pan.x+e.clientX-d.client.x,y:d.pan.y+e.clientY-d.client.y});return}const at=pointer(e),origin=d.original[d.index];setPlacements(d.original.map((p,i)=>i===d.index?{...p,x:Math.max(0,Math.min(1000,origin.x+at.x-d.point.x)),y:Math.max(0,Math.min(1000,origin.y+at.y-d.point.y))}:p));setSaved('')}} onPointerUp={()=>{drag.current=null}} onPointerCancel={()=>{drag.current=null}}/>{!image&&<div className="canvas-loading">Loading your private photo…</div>}</div>
 <p className="hint">Your nails are fitted automatically. Drag a nail to nudge it. Your photo stays unchanged. This is a visual try-on; Eurie confirms physical sizes.</p>
 <details className="panel fine-fit"><summary>Adjust nails yourself (optional)</summary>
 <div className="finger-tabs fit-fingers">{fingerNames.map((f,i)=><button key={f} className={active===i?'selected':''} onClick={()=>{setActive(i);setFitPoints([]);setMode(placements[i].fitted?'move':'fit');setBefore(false)}}>{placements[i].fitted&&<Check size={12}/>} {f}</button>)}</div>
 <div className="segmented fit-modes"><button className={mode==='fit'?'selected':''} onClick={()=>{setMode('fit');setFitPoints([]);setBefore(false)}}><Crosshair size={15}/> Fit 3 points</button><button className={mode==='move'?'selected':''} onClick={()=>setMode('move')}><Hand size={15}/> Adjust</button><button className={mode==='pan'?'selected':''} onClick={()=>setMode('pan')}><Move size={15}/> Pan</button></div>
 <p className="fit-instruction">{before?'Original hand photo':mode==='fit'?`${fingerNames[active]} · Tap ${fitPoints.length+1}/3: ${steps[fitPoints.length]}`:mode==='move'?'Drag a fitted nail to adjust its position.':'Drag to move the photo. Zoom for a closer fit.'}</p>
 <div className="canvas-toolbar"><button className="text-button" disabled={!history.length} onClick={()=>{setPlacements(history[history.length-1]);setHistory(history.slice(0,-1));setSaved('')}}><Undo2 size={16}/> Undo</button><span className="hint">{fitted}/5 fitted</span><label className="zoom"><ZoomIn size={18}/><input aria-label="Zoom hand photo" type="range" min="1" max="4" step=".1" value={zoom} onChange={e=>setZoom(+e.target.value)}/><span>{Math.round(zoom*100)}%</span></label></div>
 <div className="form-grid"><label>Outline<select value={p.shape} onChange={e=>change(placements.map(x=>({...x,shape:e.target.value})))}>{[['Photo','As in photo'],['Oval','Oval'],['Almond','Almond'],['Square','Square'],['Coffin','Coffin']].map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label><label>Cuticle curve<input aria-label="Cuticle curve" type="range" min="0" max="1" step=".05" value={p.curve} onChange={e=>change(placements.map(x=>({...x,curve:+e.target.value})))}/></label></div>
 <p className="hint">Fine-tune the {fingerNames[active].toLowerCase()}:</p><p className="hint">You can also position the nail using these controls.</p>{([['x','Horizontal',0,1000],['y','Vertical',0,1000],['w','Width',5,350],['h','Length',8,500],['rotation','Rotation',-180,180],['opacity','Opacity',.2,1]] as const).map(([key,label,min,max])=><label className="slider-label" key={key}><span>{label}<small>{Math.round((p[key]??1)*100)/100}</small></span><input aria-label={`Nail ${label}`} type="range" min={min} max={max} step={key==='opacity'?.01:1} value={p[key]??1} onChange={e=>update({[key]:+e.target.value})}/></label>)}<button className="button secondary" disabled={!p.source} onClick={()=>update({fitted:true})}>Place using these values</button><button className="text-button" onClick={()=>update({fitted:false})}>Remove this nail</button></details>
 </div><aside className="panel editor-controls"><span className="eyebrow">STEP 2</span><h2>Choose a style.</h2><button className="button secondary full" onClick={()=>setLibrary(true)}>Browse {shown.length} inspiration photos <ArrowRight size={15}/></button>
 <label>Reference photo<select value={sourceId} onChange={e=>chooseSource(e.target.value)}>{sourceOptions.filter(s=>!('retired' in s&&s.retired)||s.id===sourceId).map(s=><option key={s.id} value={s.id}>{s.name}</option>)}{inspirationId&&<option value="upload">My uploaded inspiration</option>}</select></label>
 <div className="source-canvas-wrap"><canvas ref={sourceCanvas} aria-label="Reference photo. Tap a nail to cut it out and fit it to your hand." onPointerDown={e=>{if(sourceImage)extract(pointer(e))}}/>{!sourceImage&&<span>Loading reference…</span>}</div>
 {option?.source&&<a className="photo-credit" href={option.source} target="_blank" rel="noreferrer">Pinterest {option.source.includes('/pin/')?'pin':'source board'} ↗</a>}
 <details><summary>Use your own photo of a style</summary><label>Saved inspiration<select value={inspirationId} onChange={e=>{if(e.target.value)chooseUpload(e.target.value)}}><option value="">Choose a saved photo</option>{ownInspiration.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select></label><label className="button secondary full upload-button"><Upload size={16}/> Upload a photo<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={e=>{const f=e.target.files?.[0];if(f)void run(async()=>{const m=await upload(f,'inspiration',f.name);await refresh();chooseUpload(m.id)});e.target.value=''}}/></label><p className="hint">One uploaded reference per preview. Choosing another clears cutouts from the previous upload.</p></details>
 <details className="crop-adjust"><summary>Use a different nail from the photo (optional)</summary><p className="hint">Tap a nail on the photo above. Your first tap changes all five; after that, pick a finger under “Adjust nails yourself” and tap again for an accent nail.</p>
 <div className="cutout-review"><canvas ref={cutoutCanvas} aria-label="Extracted nail preview"/><div><h3>{sourceFrame?'Your photo cutout':'Your cutout appears here'}</h3><p className="hint">{sourceFrame?'Original texture and details, clipped to a nail outline.':'Tap a nail in the reference photo.'}</p><button className="text-button" disabled={!sourceImage||autoPending} onClick={()=>setAutoPending(true)}><Sparkles size={14}/> Auto-fit again</button></div></div>
 <details><summary>Fine-tune the cut-out</summary><button className="text-button" onClick={()=>setSourceFrame({x:500,y:500,w:100,h:180,rotation:0})}>Start with an adjustable crop</button>{sourceFrame&&([['x','Crop horizontal',0,1000],['y','Crop vertical',0,1000],['w','Crop width',5,500],['h','Crop length',8,700],['rotation','Crop rotation',-180,180]] as const).map(([key,label,min,max])=><label key={key}>{label}<input type="range" min={min} max={max} value={sourceFrame[key]} onChange={e=>setSourceFrame({...sourceFrame,[key]:+e.target.value})}/></label>)}</details>
 <button className="button full" disabled={!sourceFrame||!sourceImage} onClick={()=>applyCutout()}>Use on this finger</button><button className="button secondary full" disabled={!sourceFrame||!sourceImage} onClick={()=>applyCutout(true)}>Use cutout on all five</button>
 </details>
 <div className="studio-save"><button className="button full" disabled={busy||!image||!fitted||!texturesReady} onClick={()=>void run(save,'Photo try-on saved privately.')}><Save size={16}/>{saved?'Save a new version':'Save my try-on'}</button><button className="text-button full" disabled={busy||!image||!fitted||!texturesReady} onClick={()=>void run(async()=>{const id=saved||await save();setOrderPreview(id);orderDesign(selected)})}>Order this design <ArrowRight size={16}/></button></div>
 </aside></div>}
 {library&&<div className="modal-backdrop"><section className="modal inspiration-picker" role="dialog" aria-modal="true" aria-label="Choose a nail inspiration"><button className="modal-close icon-button" aria-label="Close inspiration library" onClick={()=>setLibrary(false)}><X/></button><InspirationGallery compact onChoose={photo=>chooseSource(photo.id)}/></section></div>}
 </section>;
}



