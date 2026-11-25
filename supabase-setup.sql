-- Petal & Stem: customer orders. Supabase > SQL Editor > New query > paste > Run.
-- Run this AFTER supabase-setup.sql.
-- BEFORE RUNNING: Find and Replace ALL  khaleel.ibrm@gmail.com  with the same admin email you used before.

create table if not exists public.orders (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  created_at    timestamptz not null default now(),
  status        text not null default 'New'
                check (status in ('New','Confirmed','Out for delivery','Delivered','Cancelled')),
  items         jsonb not null,
  total         integer not null,
  customer_name text not null,
  phone         text not null,
  address       text not null,
  pincode       text not null,
  delivery_date date not null,
  message       text default ''
);
create index if not exists orders_user_idx on public.orders (user_id, created_at desc);

alter table public.orders enable row level security;

drop policy if exists "Customers read own orders" on public.orders;
drop policy if exists "Admin reads all orders" on public.orders;
drop policy if exists "Admin updates orders" on public.orders;

-- A customer can read only their own orders
create policy "Customers read own orders" on public.orders
  for select to authenticated using (user_id = auth.uid());
-- Only the admin email can read everyone's orders and change their status
create policy "Admin reads all orders" on public.orders
  for select to authenticated using ((auth.jwt() ->> 'email') = 'khaleel.ibrm@gmail.com');
create policy "Admin updates orders" on public.orders
  for update to authenticated using ((auth.jwt() ->> 'email') = 'khaleel.ibrm@gmail.com')
  with check ((auth.jwt() ->> 'email') = 'khaleel.ibrm@gmail.com');

-- Table permissions (needed in addition to the rules above)
grant select on public.orders to authenticated;
grant update (status) on public.orders to authenticated;

-- Orders are created only through this function. It looks up prices itself, so a customer
-- cannot change prices or totals from their browser.
create or replace function public.place_order(
  p_items jsonb, p_name text, p_phone text, p_address text,
  p_pin text, p_date date, p_message text
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_items jsonb; v_total integer; v_n integer; v_id uuid; v_created timestamptz;
begin
  if v_uid is null then raise exception 'Please log in to place an order.'; end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Your order is empty.'; end if;
  if coalesce(trim(p_name), '') = '' or coalesce(trim(p_address), '') = '' then
    raise exception 'Name and address are required.'; end if;
  if p_phone !~ '^[6-9][0-9]{9}$' then raise exception 'Enter a valid 10-digit mobile number.'; end if;
  if p_pin !~ '^[0-9]{6}$' then raise exception 'Enter a valid 6-digit pincode.'; end if;
  if p_date is null or p_date < current_date then raise exception 'Choose a valid delivery date.'; end if;

  select jsonb_agg(jsonb_build_object('product_id', p.id, 'name', p.name, 'price', p.price, 'qty', q.qty) order by p.name),
         sum(p.price * q.qty)::integer, count(*)
    into v_items, v_total, v_n
  from jsonb_to_recordset(p_items) as q(id uuid, qty integer)
  join public.products p on p.id = q.id and p.active
  where q.qty between 1 and 50;

  if v_items is null or v_n <> jsonb_array_length(p_items) then
    raise exception 'Some items are no longer available. Please refresh the page.'; end if;

  insert into public.orders (user_id, items, total, customer_name, phone, address, pincode, delivery_date, message)
  values (v_uid, v_items, v_total, left(trim(p_name), 100), p_phone, left(trim(p_address), 500), p_pin, p_date, left(coalesce(p_message, ''), 300))
  returning id, created_at into v_id, v_created;

  return jsonb_build_object('id', v_id, 'total', v_total, 'items', v_items, 'created_at', v_created);
end $$;

revoke all on function public.place_order(jsonb, text, text, text, text, date, text) from public, anon;
grant execute on function public.place_order(jsonb, text, text, text, text, date, text) to authenticated;
