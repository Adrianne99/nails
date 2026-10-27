import {useState} from 'react';
import {useShop,PrivatePhoto} from './shop';
import {upload} from './api';
import {inspirations} from './InspirationGallery';
import {initialPresets,sizeNames} from './order-options';
import type {Settings} from './types';

export function RequestOptions({form,set}:{form:{preset:string;reference_id:string;reference_url:string;reference_media_id:string;custom_detail:string;preview_id?:string};set:(key:string,value:string)=>void}){
 const {settings,run,busy,refresh,media,selected}=useShop();const ref=inspirations.find(p=>p.id===form.reference_id);const photo=media.find(p=>p.id===form.reference_media_id);const presets=settings.size_presets||initialPresets;const custom=!!(form.reference_url||form.reference_media_id||form.preview_id||form.reference_id==='custom');
 return <><h3>Your design</h3>{ref&&<div className="request-reference"><img src={ref.image} alt={ref.name}/><div><strong>{ref.name}</strong><p>{ref.category}</p><a href={ref.source} target="_blank" rel="noreferrer">Pinterest {ref.sourceKind==='board'?'board':'pin'} ↗</a></div></div>}
 {!ref&&!form.reference_url&&!photo&&<p className="hint">Selected: {selected.name}</p>}
 <details className="optional-order"><summary>{ref||photo||form.reference_url?'Change your reference':'Have your own reference?'}</summary>
 <label>Pinterest or other HTTPS link<input type="url" maxLength={1000} placeholder="https://…" value={form.reference_url} onChange={e=>{set('reference_url',e.target.value);set('reference_id','');set('reference_media_id','')}}/></label>
 <label>Or upload a photo<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={e=>{const file=e.target.files?.[0];if(file)void run(async()=>{const result=await upload(file,'inspiration',file.name);set('reference_media_id',result.id);set('reference_id','');set('reference_url','');await refresh()});e.target.value=''}}/></label>{photo&&<PrivatePhoto path={photo.path} alt="Your reference" className="order-preview"/>}
 </details>
 {custom&&<label>Design details<select value={form.custom_detail} onChange={e=>set('custom_detail',e.target.value)}><option value="plain">Plain colors or French tips · ₱250</option><option value="detailed">Artwork, chrome, gems or 3D · ₱300</option></select></label>}
 <details className="optional-order"><summary>{form.preset?`Fit: ${form.preset} (edit)`:'Know your nail size? (optional)'}</summary><div className="size-options">{sizeNames.map(name=><button type="button" key={name} className={form.preset===name?'selected':''} aria-pressed={form.preset===name} onClick={()=>{set('preset',name);set('sizing_id','')}}><strong>{name}</strong><span>{presets[name].join(' · ')}</span></button>)}</div><p className="hint">These sizes are provisional. Eurie checks your fit before production.</p>{form.preset&&<button type="button" className="text-button" onClick={()=>set('preset','')}>I'm not sure</button>}</details>
 </>;
}

export function PresetSettings({cfg,setCfg}:{cfg:Settings;setCfg:(cfg:Settings)=>void}){const [error,setError]=useState('');return <fieldset><legend>Provisional size charts</legend><p className="hint">Replace these with Eurie’s tip numbers. Check each customer's shape, length and both hands before confirming fit.</p>{sizeNames.map(name=><label key={name}>{name} — thumb to pinky<input defaultValue={(cfg.size_presets||initialPresets)[name].join(', ')} onChange={e=>{const values=e.target.value.split(',').map(s=>s.trim());if(values.length!==5||values.some(s=>!/^\d{1,2}$/.test(s))){e.target.setCustomValidity('Enter five tip numbers separated by commas.');setError('Each size needs five tip numbers.');return}e.target.setCustomValidity('');setError('');setCfg({...cfg,size_presets:{...(cfg.size_presets||initialPresets),[name]:values}})}}/></label>)}{error&&<p role="alert">{error}</p>}</fieldset>}
