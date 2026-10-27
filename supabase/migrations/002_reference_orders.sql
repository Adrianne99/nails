-- Apply after 001. Existing orders and customer data are preserved.
begin;
alter table public.settings add column size_presets jsonb not null default '{"Small":["2","5","4","6","9"],"Medium":["1","5","4","6","8"],"Large":["0","4","3","5","7"]}'::jsonb;
alter table public.sizes drop constraint sizes_method_check;
alter table public.sizes add constraint sizes_method_check check(method in ('Personal fitting','Sizing kit','Preset request'));
create or replace function public.mutate(action text,payload jsonb) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare uid uuid:=auth.uid(); admin boolean:=public.is_admin(); oid uuid; o public.orders; s public.sizes; p public.previews; d public.designs; cfg public.settings; v_id uuid; v_path text; v_status text; v_amount int; v_date date; snap jsonb; k text; target_owner uuid; delete_ids uuid[]; delete_paths text[]; preset jsonb; ref jsonb; estimate int;
begin
 if not public.is_customer() then raise exception 'Please sign in with Google.'; end if;
 if octet_length(payload::text)>150000 then raise exception 'Request is too large.'; end if;
 if action='media_add' then
   v_id:=(payload->>'id')::uuid; v_path:=payload->>'path';
   if v_path<>uid::text||'/'||v_id::text||'.webp' or payload->>'kind' not in ('hand','inspiration','preview') then raise exception 'Invalid file.'; end if;
   if (select count(*) from public.media where owner_id=uid)>150 then raise exception 'Photo limit reached. Remove unused photos first.'; end if;
   insert into public.media(id,owner_id,path,name,kind) values(v_id,uid,v_path,left(payload->>'name',140),payload->>'kind');
   return jsonb_build_object('id',v_id);
 elsif action='media_delete' then
   select path into v_path from public.media where id=(payload->>'id')::uuid and owner_id=uid for update;
   if v_path is null then raise exception 'Photo not found.'; end if;
   if exists(select 1 from public.orders where owner_id=uid and status not in ('Completed','Cancelled') and (snapshot::text like '%'||(payload->>'id')||'%')) then raise exception 'This photo belongs to an active order. It can be deleted after completion or cancellation.'; end if;
   if exists(select 1 from public.previews pv join public.orders ord on ord.preview_id=pv.id where ord.status not in ('Completed','Cancelled') and (pv.photo_id=(payload->>'id')::uuid or pv.image_id=(payload->>'id')::uuid or pv.inspiration_id=(payload->>'id')::uuid)) then raise exception 'This photo is attached to an active order.'; end if;
   select array_agg(distinct mid),array_agg(distinct mpath) into delete_ids,delete_paths from (
     select id as mid,path as mpath from public.media where id=(payload->>'id')::uuid and owner_id=uid
     union select m.id,m.path from public.media m join public.previews pv on pv.image_id=m.id where pv.owner_id=uid and (pv.photo_id=(payload->>'id')::uuid or pv.inspiration_id=(payload->>'id')::uuid)
   ) cleanup;
   update public.orders set preview_id=null where preview_id in(select id from public.previews where photo_id=(payload->>'id')::uuid or image_id=(payload->>'id')::uuid or inspiration_id=(payload->>'id')::uuid);
   delete from public.previews where photo_id=(payload->>'id')::uuid or image_id=(payload->>'id')::uuid or inspiration_id=(payload->>'id')::uuid;
   delete from public.media where id=any(delete_ids) and owner_id=uid;
   return jsonb_build_object('paths',to_jsonb(delete_paths));
 elsif action='size_save' then
   if length(trim(payload->>'brand'))<1 or jsonb_array_length(payload->'fingers')<>10 or payload->>'shape' not in ('Almond','Oval','Square','Coffin') or payload->>'length' not in ('Short','Medium','Long') then raise exception 'Enter the tip brand, style, and all ten sizes.'; end if;
   if exists(select 1 from jsonb_array_elements_text(payload->'fingers') f where length(trim(f))=0 or length(f)>10) then raise exception 'Enter all ten sizes.'; end if;
   insert into public.sizes(owner_id,brand,shape,length,method,fingers) values(uid,left(payload->>'brand',100),payload->>'shape',payload->>'length',payload->>'method',payload->'fingers') returning id into v_id;
   return jsonb_build_object('id',v_id);
 elsif action='preview_save' then
   if not exists(select 1 from public.media where id=(payload->>'photo_id')::uuid and owner_id=uid and kind='hand') or not exists(select 1 from public.media where id=(payload->>'image_id')::uuid and owner_id=uid and kind='preview') then raise exception 'Select your own hand and preview photos.'; end if;
   if nullif(payload->>'inspiration_id','') is not null and not exists(select 1 from public.media where id=(payload->>'inspiration_id')::uuid and owner_id=uid and kind='inspiration') then raise exception 'Invalid inspiration photo.'; end if;
   if jsonb_array_length(payload->'placements')<>5 then raise exception 'Five finger placements required.'; end if;
   insert into public.previews(owner_id,photo_id,image_id,inspiration_id,placements) values(uid,(payload->>'photo_id')::uuid,(payload->>'image_id')::uuid,nullif(payload->>'inspiration_id','')::uuid,payload->'placements') returning id into v_id;
   return jsonb_build_object('id',v_id);
 elsif action='order_submit' then
   select * into cfg from public.settings where id=true for update;
   select id into oid from public.orders where owner_id=uid and request_key=(payload->>'request_key')::uuid;
   if oid is not null then return jsonb_build_object('id',oid); end if;
   if cfg.paused then raise exception 'New orders are paused. Please check back soon.'; end if;
   if coalesce(payload->>'tier','simple') not in ('simple','classic','detailed','statement') then raise exception 'Choose a design detail level.'; end if;
   estimate:=case coalesce(payload->>'tier','simple') when 'classic' then 25000 when 'detailed' then 30000 when 'statement' then 35000 else 20000 end;
   if nullif(payload->>'reference_url','') is not null and (length(payload->>'reference_url')>1000 or payload->>'reference_url' !~* '^https://[^[:space:]]+$') then raise exception 'Use an HTTPS reference link.'; end if;
   if nullif(payload->>'reference_media_id','') is not null then
     perform id from public.media where id=(payload->>'reference_media_id')::uuid and owner_id=uid and kind='inspiration' for update;
     if not found then raise exception 'Choose your own reference photo.'; end if;
   end if;
   ref:=jsonb_build_object('id',left(coalesce(payload->>'reference_id',''),100),'url',coalesce(payload->>'reference_url',''),'media_id',coalesce(payload->>'reference_media_id',''));
   select * into d from public.designs where id=(payload->>'design_id')::uuid and available;
   if d.id is null then raise exception 'This design is unavailable.'; end if;
   if not (payload->>'shape'=any(d.shapes)) or not (payload->>'length'=any(d.lengths)) then raise exception 'Choose an available shape and length.'; end if;
   select * into s from public.sizes where id=nullif(payload->>'sizing_id','')::uuid and owner_id=uid;
   select * into p from public.previews where id=nullif(payload->>'preview_id','')::uuid and owner_id=uid;
   if nullif(payload->>'sizing_id','') is not null and s.id is null or nullif(payload->>'preview_id','') is not null and p.id is null then raise exception 'Invalid sizing or preview.'; end if;
   if s.id is null and nullif(payload->>'preset','') is not null then
     if payload->>'preset' not in ('Small','Medium','Large') then raise exception 'Choose Small, Medium or Large.'; end if;
     preset:=cfg.size_presets->(payload->>'preset');
     insert into public.sizes(owner_id,brand,shape,length,method,fingers) values(uid,'Provisional '||(payload->>'preset'),payload->>'shape',payload->>'length','Preset request',preset||preset) returning * into s;
   end if;
   if p.id is not null then
     perform id from public.media where id in(p.photo_id,p.image_id,p.inspiration_id) order by id for update;
     if not exists(select 1 from public.previews where id=p.id) then raise exception 'That preview was deleted. Choose another preview.'; end if;
   end if;
   if length(trim(payload->>'recipient'))<2 or length(trim(payload->>'phone'))<7 or length(trim(payload->>'location'))<3 then raise exception 'Enter your name, contact number, and receiving location.'; end if;
   v_date:=(payload->>'preferred_date')::date;
   if v_date<(now() at time zone 'Asia/Manila')::date then raise exception 'Choose a future receiving date.'; end if;
   snap:=jsonb_build_object('design',to_jsonb(d),'sizes',to_jsonb(s),'preview',to_jsonb(p),'shape',payload->>'shape','length',payload->>'length','reference',ref,'preset',payload->>'preset','tier',coalesce(payload->>'tier','simple'));
   insert into public.orders(owner_id,request_key,fulfillment,recipient,phone,location,preferred_date,quantity,notes,sizing_id,preview_id,snapshot,subtotal,status)
   values(uid,(payload->>'request_key')::uuid,payload->>'fulfillment',left(payload->>'recipient',150),left(payload->>'phone',30),left(payload->>'location',500),v_date,(payload->>'quantity')::int,left(coalesce(payload->>'notes',''),2000),s.id,p.id,snap,estimate*(payload->>'quantity')::int,case when s.confirmed_at is null or s.shape<>payload->>'shape' or s.length<>payload->>'length' then 'Awaiting sizing' else 'Submitted' end) returning id into oid;
 elsif action='quote_accept' then
   select * into cfg from public.settings where id=true for update;
   select * into o from public.orders where id=(payload->>'id')::uuid and owner_id=uid for update;
   if o.id is null or o.status<>'Awaiting customer confirmation' or (payload->>'version') is null or o.quote_version<>(payload->>'version')::int or not o.quoted then raise exception 'This quote has changed. Reload and review the latest quote.'; end if;
   if (select coalesce(sum(quantity),0) from public.orders where due_date=o.due_date and status in ('Confirmed','In production','Ready for delivery or handover','Out for delivery','Delivered or handed over','Completed'))+o.quantity>cfg.daily_capacity then raise exception 'That production date is full. Please ask the artist for another date.'; end if;
   update public.orders set status='Confirmed',accepted_at=now() where id=o.id; oid:=o.id;
 elsif action='cancel_request' then
   update public.orders set cancellation_requested=true where id=(payload->>'id')::uuid and owner_id=uid and status not in ('Completed','Cancelled') returning id into oid;
   if oid is null then raise exception 'This order cannot be cancelled.'; end if;
 elsif action='deletion_request' then
   insert into public.deletion_requests(owner_id) values(uid) on conflict(owner_id) do update set resolved=false,created_at=now();
   return jsonb_build_object('ok',true);
 else
   if not admin then raise exception 'Administrator access required.'; end if;
   if action='size_confirm' then
     update public.sizes set confirmed_at=now(),confirmed_by=uid where id=(payload->>'id')::uuid returning id into v_id;
     if v_id is null then raise exception 'Sizing profile not found.'; end if;
     return jsonb_build_object('ok',true);
   elsif action='settings_save' then
     if payload ? 'size_presets' then
       foreach k in array array['Small','Medium','Large'] loop
         if jsonb_typeof(payload->'size_presets'->k) is distinct from 'array' or jsonb_array_length(payload->'size_presets'->k)<>5 then raise exception 'Each preset needs five tip numbers.'; end if;
         if exists(select 1 from jsonb_array_elements_text(payload->'size_presets'->k) x where x !~ '^[0-9]{1,2}$' or x is null) then raise exception 'Invalid tip number.'; end if;
       end loop;
       update public.settings set size_presets=payload->'size_presets' where id=true;
     end if;
     update public.settings set paused=(payload->>'paused')::boolean,daily_capacity=(payload->>'daily_capacity')::int,cancellation_policy=left(payload->>'cancellation_policy',2000),retention_policy=left(payload->>'retention_policy',2000) where id=true;
     return jsonb_build_object('ok',true);
   elsif action='design_save' then
     if (payload->>'price')::int+coalesce((payload->>'extra')::int,0)>35000 then raise exception 'Keep the per-set total between 200 and 350 pesos.'; end if;
     v_id:=coalesce(nullif(payload->>'id','')::uuid,gen_random_uuid());
     if length(trim(payload->>'name'))<2 or jsonb_array_length(payload->'shapes')<1 or jsonb_array_length(payload->'lengths')<1 then raise exception 'Name, shapes and lengths are required.'; end if;
     if nullif(payload->>'photo_path','') is not null and (payload->>'photo_path' !~ '^[0-9a-f-]+/[0-9a-f-]+[.]webp$') then raise exception 'Invalid gallery photo.'; end if;
     insert into public.designs(id,name,description,category,price,extra,color,pattern,shapes,lengths,available,photo_path) values(v_id,left(payload->>'name',100),left(payload->>'description',1000),left(payload->>'category',50),(payload->>'price')::int,(payload->>'extra')::int,payload->>'color',payload->>'pattern',array(select jsonb_array_elements_text(payload->'shapes')),array(select jsonb_array_elements_text(payload->'lengths')),(payload->>'available')::boolean,nullif(payload->>'photo_path','')) on conflict(id) do update set name=excluded.name,description=excluded.description,category=excluded.category,price=excluded.price,extra=excluded.extra,color=excluded.color,pattern=excluded.pattern,shapes=excluded.shapes,lengths=excluded.lengths,available=excluded.available,photo_path=excluded.photo_path;
     return jsonb_build_object('id',v_id);
   elsif action='deletion_resolve' then
     update public.deletion_requests set resolved=true where id=(payload->>'id')::uuid;
     return jsonb_build_object('ok',true);
   else
     select * into o from public.orders where id=(payload->>'id')::uuid for update;
     if o.id is null then raise exception 'Order not found.'; end if; oid:=o.id;
     if action='quote_send' then
       if o.status not in ('Submitted','Awaiting sizing','Awaiting customer confirmation') then raise exception 'Accepted orders cannot be repriced.'; end if;
       select * into s from public.sizes where id=coalesce(nullif(payload->>'sizing_id','')::uuid,o.sizing_id) and owner_id=o.owner_id;
       if s.confirmed_at is null or s.shape<>o.snapshot->>'shape' or s.length<>o.snapshot->>'length' then raise exception 'Confirm a matching sizing profile before quoting.'; end if;
       v_amount:=(payload->>'subtotal')::int; v_date:=(payload->>'due_date')::date;
       if v_amount is null or v_date is null or payload->>'delivery_fee' is null or v_amount<20000*o.quantity or v_amount>35000*o.quantity or (payload->>'delivery_fee')::int<0 or v_date<(now() at time zone 'Asia/Manila')::date then raise exception 'Enter a valid price, delivery fee, and completion date.'; end if;
       update public.orders set subtotal=v_amount,delivery_fee=case when fulfillment='Handover' then 0 else (payload->>'delivery_fee')::int end,due_date=v_date,sizing_id=s.id,snapshot=jsonb_set(snapshot,'{sizes}',to_jsonb(s)),status='Awaiting customer confirmation',quoted=true,quote_version=quote_version+1,fulfillment_note=left(coalesce(payload->>'fulfillment_note',''),2000) where id=oid;
     elsif action='status_set' then
       v_status:=payload->>'status';
       if v_status='Cancelled' then
         if o.status in ('Completed','Delivered or handed over','Cancelled') or o.payment<>'Unpaid' then raise exception 'A fulfilled or paid order cannot be cancelled.'; end if;
       elsif not ((o.status='Confirmed' and v_status='In production') or (o.status='In production' and v_status='Ready for delivery or handover') or (o.status='Ready for delivery or handover' and ((o.fulfillment='Delivery' and v_status='Out for delivery') or (o.fulfillment='Handover' and v_status='Delivered or handed over'))) or (o.status='Out for delivery' and v_status in ('Delivered or handed over','Ready for delivery or handover')) or (o.status='Delivered or handed over' and v_status='Completed' and o.payment='Received')) then raise exception 'That status change is not allowed. Check sizing, quote acceptance, and payment.';
       end if;
       if v_status='In production' and (o.accepted_at is null or o.snapshot->'sizes'->>'confirmed_at' is null) then raise exception 'Confirm sizing and accept the quote before production.'; end if;
       update public.orders set status=v_status,fulfillment_note=left(coalesce(payload->>'fulfillment_note',fulfillment_note),2000) where id=oid;
     elsif action='payment_set' then
       v_status:=payload->>'payment';
       if o.status not in ('Delivered or handed over','Completed') or not ((o.payment='Unpaid' and v_status='Collected' and o.fulfillment='Delivery') or (o.payment='Collected' and v_status='Received') or (o.payment='Unpaid' and v_status='Received' and o.fulfillment='Handover')) then raise exception 'Record delivery first, then collection and remittance in order.'; end if;
       update public.orders set payment=v_status where id=oid;
     elsif action='note_save' then
       insert into public.order_internal(order_id,note) values(oid,left(payload->>'note',5000)) on conflict(order_id) do update set note=excluded.note;
     elsif action='fulfillment_save' then
       update public.orders set fulfillment_note=left(payload->>'fulfillment_note',2000) where id=oid;
     else raise exception 'Unknown action.';
     end if;
   end if;
 end if;
 insert into public.order_events(order_id,actor_id,action) values(oid,uid,case when action='quote_send' then 'Quote updated: '||((select subtotal+delivery_fee from public.orders where id=oid)/100.0)::text||' PHP' when action='payment_set' then 'Payment: '||(payload->>'payment') when action='status_set' then 'Order: '||(payload->>'status') else action end);
 return jsonb_build_object('id',oid);
end $$;
revoke execute on function public.mutate(text,jsonb) from public,anon;
grant execute on function public.mutate(text,jsonb) to authenticated;
commit;
