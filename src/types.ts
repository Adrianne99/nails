export type Design={id:string;name:string;description:string;category:string;price:number;extra:number;color:string;pattern:string;shapes:string[];lengths:string[];available:boolean;photo_path?:string|null};
export type Media={id:string;owner_id:string;path:string;name:string;kind:string;created_at:string};
export type Size={id:string;owner_id:string;brand:string;shape:string;length:string;method:string;fingers:string[];confirmed_at:string|null};
export type SnapshotSize=Omit<Partial<Size>,'fingers'>&{fingers?:string[]|null};
// outline: the nail's own shape from a reference photo, as x,y pairs across the width and from tip (-0.5) to cuticle (+0.5).
export type NailFrame={x:number;y:number;w:number;h:number;rotation:number;outline?:number[]};
export type Placement=NailFrame&{color:string;pattern:string;shape:string;curve:number;crop?:{x:number;y:number;size:number};texture?:string;source?:NailFrame;fitted?:boolean;opacity?:number};
export type Preview={id:string;owner_id:string;photo_id:string;image_id:string;inspiration_id?:string;placements:Placement[]};
export type Order={id:string;owner_id:string;status:string;payment:string;fulfillment:string;recipient:string;phone:string;location:string;preferred_date:string;due_date:string|null;quantity:number;notes:string;sizing_id:string|null;preview_id:string|null;snapshot:{instant_price?:boolean;unit_price?:number;delivery_payment?:string;reference?:{id:string;url:string;media_id:string;name:string};preset?:string;tier?:string;design:Design;sizes:SnapshotSize|null;preview:Preview|null;shape:string;length:string};subtotal:number;delivery_fee:number;quoted:boolean;quote_version:number;accepted_at:string|null;cancellation_requested:boolean;fulfillment_note:string;created_at:string};
export type Settings={size_presets?:Record<string,string[]>;paused:boolean;daily_capacity:number;cancellation_policy:string;retention_policy:string};
export type Event={id:string;order_id:string;actor_id:string;action:string;created_at:string};
export type Deletion={id:string;owner_id:string;created_at:string;resolved:boolean};
export const money=(n:number)=>new Intl.NumberFormat('en-PH',{style:'currency',currency:'PHP',minimumFractionDigits:0,maximumFractionDigits:2}).format(n/100);
export const date=(s:string|null)=>s?new Intl.DateTimeFormat('en-PH',{dateStyle:'medium',timeZone:'Asia/Manila'}).format(new Date(s.length===10?s+'T00:00:00+08:00':s)):'To be confirmed';
export const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Manila',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export const fingers=['Left thumb','Left index','Left middle','Left ring','Left pinky','Right thumb','Right index','Right middle','Right ring','Right pinky'];
export const shapes=['Almond','Oval','Square','Coffin'];
export const lengths=['Short','Medium','Long'];

