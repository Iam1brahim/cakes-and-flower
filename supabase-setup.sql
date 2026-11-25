-- Petal & Stem: database setup. Paste into Supabase > SQL Editor and press Run.
-- BEFORE RUNNING: replace every  khaleel.ibrm@gmail.com  below with the email you will log in with (6 places).

create table if not exists public.products (
  id          uuid primary key default gen_random_uuid(),
  name        text    not null,
  category    text    not null default 'Bouquets',
  price       integer not null check (price >= 0),
  description text    default '',
  image_url   text,
  active      boolean not null default true,
  sort        integer not null default 0,
  created_at  timestamptz not null default now()
);

alter table public.products enable row level security;

-- Customers (not logged in) can see only products marked active
create policy "Public can read active products" on public.products
  for select to anon, authenticated using (active = true);

-- Only your admin email can see hidden products and change anything
create policy "Admin reads all" on public.products
  for select to authenticated using ((auth.jwt() ->> 'email') = 'khaleel.ibrm@gmail.com');
create policy "Admin inserts" on public.products
  for insert to authenticated with check ((auth.jwt() ->> 'email') = 'khaleel.ibrm@gmail.com');
create policy "Admin updates" on public.products
  for update to authenticated using ((auth.jwt() ->> 'email') = 'khaleel.ibrm@gmail.com')
  with check ((auth.jwt() ->> 'email') = 'khaleel.ibrm@gmail.com');
create policy "Admin deletes" on public.products
  for delete to authenticated using ((auth.jwt() ->> 'email') = 'khaleel.ibrm@gmail.com');

-- Photo storage (public so customers can see photos; only admin can upload or delete)
insert into storage.buckets (id, name, public) values ('product-images', 'product-images', true)
  on conflict (id) do nothing;

create policy "Public can view product images" on storage.objects
  for select using (bucket_id = 'product-images');
create policy "Admin uploads images" on storage.objects
  for insert to authenticated with check (bucket_id = 'product-images' and (auth.jwt() ->> 'email') = 'khaleel.ibrm@gmail.com');
create policy "Admin updates images" on storage.objects
  for update to authenticated using (bucket_id = 'product-images' and (auth.jwt() ->> 'email') = 'khaleel.ibrm@gmail.com');
create policy "Admin deletes images" on storage.objects
  for delete to authenticated using (bucket_id = 'product-images' and (auth.jwt() ->> 'email') = 'khaleel.ibrm@gmail.com');

-- Starting products (edit or delete them later in the admin page; add photos there too)
insert into public.products (name, category, price, description, sort) values
  ('Rose Classic',   'Bouquets', 699,  'A dozen pink roses wrapped in soft kraft paper.', 1),
  ('Tulip Delight',  'Bouquets', 999,  'Fresh tulips in spring shades, tied with a satin ribbon.', 2),
  ('Sunflower Joy',  'Bouquets', 599,  'Bright sunflowers with greens for a cheerful hello.', 3),
  ('Premium Mixed',  'Bouquets', 1499, 'A full arrangement of roses, lilies and seasonal blooms.', 4);
