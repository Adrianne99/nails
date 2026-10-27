begin;
-- The client validates for helpful errors. This trigger also covers direct API calls.
-- Existing orders may contain older contact formats; their status updates still work.
-- The RPC's source already uses static SQL and JSON parameters; no user value becomes SQL syntax.
create or replace function public.validate_order_contact() returns trigger language plpgsql set search_path=public,pg_temp as $$
begin
 if tg_op='INSERT' or new.recipient is distinct from old.recipient then
  if new.recipient is null or length(trim(new.recipient)) not between 2 and 150 then raise exception 'Enter a valid recipient name.'; end if;
 end if;
 if tg_op='INSERT' or new.phone is distinct from old.phone then
  if new.phone is null or new.phone !~ '^\+639[0-9]{9}$' then raise exception 'Enter a Philippine mobile number (+639XXXXXXXXX).'; end if;
 end if;
 if tg_op='INSERT' or new.location is distinct from old.location then
  if new.location is null or length(trim(new.location)) not between 3 and 500 then raise exception 'Enter a valid receiving location.'; end if;
 end if;
 if tg_op='INSERT' or new.quantity is distinct from old.quantity then
  if new.quantity not between 1 and 20 then raise exception 'Choose 1 to 20 sets.'; end if;
 end if;
 if tg_op='INSERT' or new.notes is distinct from old.notes then
  if new.notes is not null and length(new.notes)>2000 then raise exception 'Shorten your design notes.'; end if;
 end if;
 return new;
end $$;
create trigger validate_order_contact_before_write before insert or update on public.orders for each row execute function public.validate_order_contact();
commit;
