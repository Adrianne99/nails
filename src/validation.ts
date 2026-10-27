import {z} from 'zod';

const plainText=(max:number,min=0)=>z.string().trim().min(min).max(max).refine(v=>!/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(v),'Remove control characters.');
const uuid=z.string().uuid();
const optionalId=z.union([uuid,z.literal('')]);
const shape=z.enum(['Almond','Oval','Square','Coffin']);
const length=z.enum(['Short','Medium','Long']);
const cents=z.number().int().min(0).max(700000);
const todayInManila=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Manila',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const date=z.iso.date().refine(v=>v>=todayInManila(),'Choose today or a future date.');
const color=z.string().regex(/^#[0-9a-f]{3}(?:[0-9a-f]{3})?$/i,'Choose a valid color.');
const path=z.string().regex(/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.webp$/,'Invalid photo path.');
const frame=z.object({x:z.number().finite(),y:z.number().finite(),w:z.number().finite().positive(),h:z.number().finite().positive(),rotation:z.number().finite(),outline:z.array(z.number().finite()).max(400).optional()});
const placement=frame.extend({color:plainText(20),pattern:plainText(50),shape:plainText(30),curve:z.number().finite().min(0).max(1),crop:z.object({x:z.number().finite(),y:z.number().finite(),size:z.number().finite().positive()}).optional(),texture:plainText(100).optional(),source:frame.optional(),fitted:z.boolean().optional(),opacity:z.number().finite().min(0).max(1).optional()});
const idObject=z.object({id:uuid}).strict();
const tip=z.string().regex(/^\d{1,2}(?:\.5)?$/,'Use a tip number such as 4 or 4.5.');
const presetTips=z.array(z.string().regex(/^\d{1,2}$/)).length(5);

export const philippineMobile=z.string().trim().max(30).transform(v=>v.replace(/[\s()-]/g,'')).transform(v=>/^09\d{9}$/.test(v)?'+63'+v.slice(1):v).pipe(z.string().regex(/^\+639\d{9}$/,'Enter +639XXXXXXXXX or 09XXXXXXXXX.'));
export const httpsUrl=z.url().max(1000).refine(value=>{try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password&&!/[\u0000-\u001f\s]/.test(value)}catch{return false}},'Use an HTTPS link without login details.');
export const imageFile=z.object({type:z.enum(['image/jpeg','image/png','image/webp']),size:z.number().int().positive().max(12*1024*1024)});
export const uploadFields=z.object({kind:z.enum(['hand','inspiration','preview','gallery']),name:plainText(140,1)}).strict();
export const artistSizing=z.object({order_id:uuid,tip_brand:plainText(100,1),tip_numbers:z.array(z.string().regex(/^\d{1,2}$/)).length(10)}).strict();

export const actionSchemas:Record<string,z.ZodType>={
 media_add:z.object({id:uuid,path,kind:z.enum(['hand','inspiration','preview']),name:plainText(140,1)}).strict(),
 media_delete:idObject,
 size_save:z.object({brand:plainText(100,1),shape,length,method:z.enum(['Sizing kit','Personal fitting']),fingers:z.array(tip).length(10)}).strict(),
 preview_save:z.object({photo_id:uuid,image_id:uuid,inspiration_id:optionalId.nullable(),placements:z.array(placement).length(5)}).strict(),
 order_submit:z.object({request_key:uuid,design_id:uuid,recipient:plainText(150,2),phone:philippineMobile,location:plainText(500,3),preferred_date:date,quantity:z.number().int().min(1).max(20),shape,length,fulfillment:z.enum(['Delivery','Handover']),notes:plainText(2000),preset:z.enum(['','Small','Medium','Large']).optional(),reference_id:plainText(100).regex(/^[a-zA-Z0-9-]*$/).optional(),reference_url:z.union([httpsUrl,z.literal('')]).optional(),reference_media_id:optionalId.optional(),sizing_id:optionalId.optional(),preview_id:optionalId.optional(),tier:z.enum(['simple','classic','detailed','statement']).optional(),custom_detail:z.enum(['plain','detailed']).optional(),unit_price:z.number().int().min(15000).max(25000)}).strict(),
 quote_accept:idObject.extend({version:z.number().int().min(1)}),cancel_request:idObject,deletion_request:z.object({}).strict(),size_confirm:idObject,deletion_resolve:idObject,
 quote_send:idObject.extend({subtotal:cents.min(15000),delivery_fee:cents,due_date:date,sizing_id:uuid,fulfillment_note:plainText(2000)}),
 status_set:idObject.extend({status:z.enum(['In production','Ready for delivery or handover','Out for delivery','Delivered or handed over','Completed','Cancelled']),fulfillment_note:plainText(2000).optional()}),
 payment_set:idObject.extend({payment:z.enum(['Collected','Received'])}),
 note_save:idObject.extend({note:plainText(5000)}),fulfillment_save:idObject.extend({fulfillment_note:plainText(2000)}),
 settings_save:z.object({paused:z.boolean(),daily_capacity:z.number().int().min(1).max(100),cancellation_policy:plainText(2000,1),retention_policy:plainText(2000,1),size_presets:z.object({Small:presetTips,Medium:presetTips,Large:presetTips}).optional()}),
 design_save:z.object({id:optionalId,name:plainText(100,2),description:plainText(1000),category:plainText(50,1),price:cents.min(15000).max(25000),extra:cents.max(10000),color,pattern:z.enum(['french','solid','flower','pearl','cherry','shimmer']),shapes:z.array(shape).min(1).max(4),lengths:z.array(length).min(1).max(3),available:z.boolean(),photo_path:z.union([path,z.literal(''),z.null()]).optional()}).refine(d=>d.price+d.extra<=25000,'Keep the total price at or below ₱250.')
};

export function validate<T extends z.ZodType>(schema:T,value:unknown):z.output<T>{const result=schema.safeParse(value);if(!result.success){const issue=result.error.issues[0];throw new Error(`${issue.path.join(' → ').replaceAll('_',' ')||'Form'}: ${issue.message}`)}return result.data;}
export function validateAction(action:string,payload:unknown){const schema=actionSchemas[action];if(!schema)throw new Error('Unknown action.');return validate(schema,payload);}
export function safeReferenceUrl(value:unknown){const result=httpsUrl.safeParse(value);return result.success?result.data:undefined;}
