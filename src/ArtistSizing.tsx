import {useState} from 'react';
import {db} from './api';
import {useShop} from './shop';
import {initialPresets,sizeNames} from './order-options';
import type {Order} from './types';
import {artistSizing,validate} from './validation';

export function ArtistSizing({order,onSaved,empty}:{order:Order;onSaved:(id:string)=>void;empty:boolean}){
 const {settings,run,refresh,busy}=useShop();
 const [open,setOpen]=useState(empty),[brand,setBrand]=useState(''),[left,setLeft]=useState(''),[right,setRight]=useState('');
 const choose=(name:string)=>{const tips=(settings.size_presets||initialPresets)[name].join(', ');setLeft(tips);setRight(tips);setBrand('Provisional '+name)};
 return <div className="panel"><p>{empty?'No matching sizing profile yet. Add one here for this customer.':'Need a different fit? Record a new profile for this order.'}</p><button type="button" className="text-button" onClick={()=>setOpen(!open)}>{open?'Hide sizing editor':'Add customer sizing'}</button>{open&&<><p className="hint">For {order.snapshot.shape} / {order.snapshot.length}. Start with a preset or enter the actual tip numbers. Saving does not verify fit.</p><div className="size-options">{sizeNames.map(name=><button key={name} type="button" onClick={()=>choose(name)}>{name}</button>)}</div><label>Tip brand / profile name<input value={brand} maxLength={100} onChange={e=>setBrand(e.target.value)}/></label><div className="form-grid"><label>Left hand — thumb to pinky<input placeholder="2, 5, 4, 6, 9" value={left} onChange={e=>setLeft(e.target.value)}/></label><label>Right hand — thumb to pinky<input placeholder="2, 5, 4, 6, 9" value={right} onChange={e=>setRight(e.target.value)}/></label></div><button type="button" className="button secondary" disabled={busy} onClick={()=>void run(async()=>{const hands=[left,right].map(v=>v.split(',').map(n=>n.trim()));const checked=validate(artistSizing,{order_id:order.id,tip_brand:brand,tip_numbers:hands.flat()});const {data,error}=await db!.rpc('artist_order_size',checked);if(error)throw new Error(error.message);await refresh();onSaved(data);setOpen(false)},'Sizing added. Check the fit, then confirm it before sending your quote.')}>Save customer sizing</button></>}</div>;
}
