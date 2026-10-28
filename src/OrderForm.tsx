import {useState} from 'react';
import {ArrowRight} from 'lucide-react';
import {RequestOptions} from './RequestOptions';
import {orderPrice} from './order-options';
import {useShop} from './shop';
import {mutate} from './api';
import {money,today} from './types';
import {NailArt} from './art';
import {inspirations} from './InspirationGallery';
import {references} from './references';
import type {Preview} from './types';

function referenceNotes(preview:Preview|undefined){
 if(!preview)return '';
 const ids=[...new Set(preview.placements.filter(p=>p.fitted).map(p=>p.texture).filter(Boolean))];
 return ids.length?'Photo try-on request. Please follow the attached preview. References: '+ids.map(id=>{
  const p=inspirations.find(p=>p.id===id);
  return p?`${p.name}: ${p.source}`:id==='upload'?'My private uploaded inspiration':references[id!]?.source||'Catalog photo';
 }).join(' | '):'';
}

export function normalizePhilippineMobile(value:string){const compact=value.trim().replace(/[\s()-]/g,'');const normalized=/^09\d{9}$/.test(compact)?'+63'+compact.slice(1):compact;if(!/^\+639\d{9}$/.test(normalized))throw new Error('Enter a Philippine mobile number such as +639171234567 or 09171234567.');return normalized;}

export function OrderForm({close}:{close:()=>void}){
 const {selected,user,sizes,previews,orderPreview,setOrderPreview,run,refresh,busy,settings,go}=useShop();
 const [form,setForm]=useState({preset:'',reference_id:sessionStorage.getItem('eurie.order-reference')||'',reference_url:'',reference_media_id:'',tier:'simple',custom_detail:'plain',recipient:user?.user_metadata.full_name||'',phone:'',fulfillment:'Handover',location:'',preferred_date:today(),quantity:1,shape:selected.shapes[0],length:selected.lengths[0],sizing_id:'',preview_id:orderPreview,notes:referenceNotes(previews.find(p=>p.id===orderPreview))});
 const [key]=useState(()=>crypto.randomUUID());
 const unitPrice=orderPrice(form,selected);
 const set=(field:string,value:string|number)=>setForm(f=>({...f,[field]:value}));
 const matchingSizes=sizes.filter(s=>s.owner_id===user?.id&&s.shape===form.shape&&s.length===form.length);
 const ownPreviews=previews.filter(p=>p.owner_id===user?.id);
 return <form onSubmit={e=>{e.preventDefault();void run(async()=>{
  if(form.reference_id==='custom'&&!form.reference_url&&!form.reference_media_id)throw new Error('Paste a reference link or upload a photo of your design.');
  await mutate('order_submit',{...form,phone:normalizePhilippineMobile(form.phone),unit_price:unitPrice,design_id:selected.id,request_key:key});
  sessionStorage.removeItem('eurie.order-reference');await refresh();setOrderPreview('');close();go('orders');
 },'Order placed. Your nail price is locked in.')}}>
  <div className="order-form-grid simple-order-grid">
   <div>
    <RequestOptions form={form} set={set}/>
    {!form.reference_id&&!form.reference_url&&!form.reference_media_id&&<div className="order-design"><NailArt design={selected}/><div><h3>{form.preview_id?'Your photo try-on':selected.name}</h3><strong>{money(unitPrice)} per set</strong></div></div>}
    <div className="form-grid"><label>Shape<select value={form.shape} onChange={e=>set('shape',e.target.value)}>{selected.shapes.map(s=><option key={s}>{s}</option>)}</select></label><label>Length<select value={form.length} onChange={e=>set('length',e.target.value)}>{selected.lengths.map(s=><option key={s}>{s}</option>)}</select></label></div>
    <details className="optional-order"><summary>More choices (optional)</summary>
     <label>Sets<input type="number" min="1" max="20" required value={form.quantity} onChange={e=>set('quantity',+e.target.value)}/></label>
     {matchingSizes.length>0&&<label>Saved fit<select value={form.sizing_id} onChange={e=>{set('sizing_id',e.target.value);set('preset','')}}><option value="">Eurie will check my fit</option>{matchingSizes.map(s=><option key={s.id} value={s.id}>{s.brand} · {s.confirmed_at?'Verified':'Awaiting review'}</option>)}</select></label>}
     {ownPreviews.length>0&&<label>Saved try-on<select value={form.preview_id} onChange={e=>set('preview_id',e.target.value)}><option value="">None</option>{ownPreviews.map((p,i)=><option key={p.id} value={p.id}>Preview {i+1}</option>)}</select></label>}
     <label>Design notes<textarea value={form.notes} maxLength={2000} onChange={e=>set('notes',e.target.value)} placeholder="Color or detail requests"/></label>
    </details>
   </div>
   <div><h3>Your contact and delivery</h3>
    <label>Your name<input required minLength={2} maxLength={150} autoComplete="name" value={form.recipient} onChange={e=>set('recipient',e.target.value)}/></label>
    <label>Philippine mobile number<input type="tel" inputMode="tel" autoComplete="tel" required pattern="(?:\+639|09)[0-9]{9}" title="Use +639XXXXXXXXX or 09XXXXXXXXX" maxLength={13} value={form.phone} onChange={e=>set('phone',e.target.value)} placeholder="+639XXXXXXXXX"/></label>
    <label>Receive by<select value={form.fulfillment} onChange={e=>{set('fulfillment',e.target.value);set('location','')}}><option>Handover</option><option>Delivery</option></select></label>
    <label>{form.fulfillment==='Delivery'?'Delivery address':'Handover place'}<input required minLength={3} maxLength={500} value={form.location} onChange={e=>set('location',e.target.value)} placeholder={form.fulfillment==='Delivery'?'Unit, street, barangay, city':'Office or agreed meeting place'}/></label>
    <label>Preferred date<input type="date" min={today()} required value={form.preferred_date} onChange={e=>set('preferred_date',e.target.value)}/></label>
    <div className="price-box"><span>Nail total <strong>{money(unitPrice*form.quantity)}</strong></span><p>Cash at {form.fulfillment==='Delivery'?'delivery':'handover'}. {form.fulfillment==='Delivery'?'Courier fee is paid separately.':''} Eurie checks nail sizes before making the set.</p></div>
   </div>
  </div>
  <details className="optional-order policy-details"><summary>Cancellation policy</summary><p>{settings.cancellation_policy}</p></details>
  <label className="checkbox"><input type="checkbox" required/> I agree to the nail total and cash payment.</label>
  <button className="button full" disabled={busy||settings.paused}>{settings.paused?'New orders are temporarily paused':'Place my order'} <ArrowRight size={17}/></button>
 </form>;
}
