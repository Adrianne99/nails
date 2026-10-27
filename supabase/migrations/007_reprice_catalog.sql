begin;
-- Reprice active catalog entries only. Existing order snapshots and totals stay unchanged.
alter table public.reference_prices drop constraint if exists reference_prices_price_check;
update public.reference_prices set price=case when price<=20000 then 15000 when price<=25000 then 20000 else 25000 end;
alter table public.reference_prices add constraint reference_prices_price_check check(price between 15000 and 25000);

alter table public.designs drop constraint if exists designs_price_check;
update public.designs set price=case when price+extra<=20000 then 15000 when price+extra<=25000 then 20000 else 25000 end,extra=0;
alter table public.designs alter column price set default 15000;
alter table public.designs add constraint designs_price_check check(price between 15000 and 25000);
alter table public.designs add constraint designs_total_price_check check(price+extra between 15000 and 25000);

do $reprice$
declare definition text:=pg_get_functiondef('public.mutate(text,jsonb)'::regprocedure);
begin
  if position('when ''classic'' then 25000 when ''detailed'' then 30000 when ''statement'' then 35000 else 20000' in definition)=0 then raise exception 'Pricing rule 1 was not found; migration cancelled.'; end if;
  definition:=replace(definition,'when ''classic'' then 25000 when ''detailed'' then 30000 when ''statement'' then 35000 else 20000','when ''classic'' then 20000 when ''detailed'' then 25000 when ''statement'' then 25000 else 15000');
  if position('then 30000 else 25000 end' in definition)=0 then raise exception 'Pricing rule 2 was not found; migration cancelled.'; end if;
  definition:=replace(definition,'then 30000 else 25000 end','then 25000 else 20000 end');
  if position('estimate not between 20000 and 35000' in definition)=0 then raise exception 'Pricing rule 3 was not found; migration cancelled.'; end if;
  definition:=replace(definition,'estimate not between 20000 and 35000','estimate not between 15000 and 25000');
  if position('if (payload->>''price'')::int+coalesce((payload->>''extra'')::int,0)>35000 then raise exception ''Keep the per-set total between 200 and 350 pesos.''; end if;' in definition)=0 then raise exception 'Pricing rule 4 was not found; migration cancelled.'; end if;
  definition:=replace(definition,'if (payload->>''price'')::int+coalesce((payload->>''extra'')::int,0)>35000 then raise exception ''Keep the per-set total between 200 and 350 pesos.''; end if;','if (payload->>''price'')::int not between 15000 and 25000 or coalesce((payload->>''extra'')::int,0)<0 or (payload->>''price'')::int+coalesce((payload->>''extra'')::int,0)>25000 then raise exception ''Keep the per-set total between 150 and 250 pesos.''; end if;');
  if position('v_amount<20000*o.quantity or v_amount>35000*o.quantity' in definition)=0 then raise exception 'Pricing rule 5 was not found; migration cancelled.'; end if;
  definition:=replace(definition,'v_amount<20000*o.quantity or v_amount>35000*o.quantity','v_amount<15000*o.quantity or v_amount>25000*o.quantity');
  execute definition;
end
$reprice$;
commit;
