-- Artist can record a fit for a customer who has no saved profile.
begin;
create function public.artist_order_size(order_id uuid, tip_brand text, tip_numbers jsonb)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare o public.orders; s public.sizes;
begin
 if not public.is_admin() then raise exception 'Administrator access required.'; end if;
 select * into o from public.orders where id=order_id for update;
 if o.id is null or o.status not in ('Submitted','Awaiting sizing','Awaiting customer confirmation') then raise exception 'Only requests awaiting review can have a new fit.'; end if;
 if tip_brand is null or length(trim(tip_brand)) not between 1 and 100 or jsonb_typeof(tip_numbers) is distinct from 'array' then raise exception 'Enter the tip brand and all ten sizes.'; end if;
 if jsonb_array_length(tip_numbers)<>10 or exists(select 1 from jsonb_array_elements_text(tip_numbers) n where n is null or n !~ '^[0-9]{1,2}$') then raise exception 'Enter ten tip numbers, thumb to pinky for each hand.'; end if;
 insert into public.sizes(owner_id,brand,shape,length,method,fingers) values(o.owner_id,trim(tip_brand),o.snapshot->>'shape',o.snapshot->>'length','Preset request',tip_numbers) returning * into s;
 -- A new fit invalidates an outstanding quote until the artist reviews it again.
 update public.orders set sizing_id=s.id,snapshot=jsonb_set(snapshot,'{sizes}',to_jsonb(s)),status='Awaiting sizing',quoted=false,quote_version=quote_version+1 where id=o.id;
 insert into public.order_events(order_id,actor_id,action) values(o.id,auth.uid(),'Artist added sizing for review');
 return s.id;
end $$;
revoke all on function public.artist_order_size(uuid,text,jsonb) from public,anon;
grant execute on function public.artist_order_size(uuid,text,jsonb) to authenticated;
commit;
