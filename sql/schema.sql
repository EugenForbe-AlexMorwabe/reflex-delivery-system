create extension if not exists pgcrypto;

create table if not exists public.riders (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null unique,
  vehicle text default 'Boda Boda',
  is_available boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.deliveries (
  id uuid primary key default gen_random_uuid(),
  delivery_code text not null unique,
  customer_name text not null,
  customer_phone text not null,
  delivery_address text not null,
  item_description text not null,
  retailer_name text not null default 'Demo Retailer',
  status text not null default 'Pending' check (status in ('Pending','Assigned','Picked Up','Delivered','Failed')),
  rider_id uuid references public.riders(id) on delete set null,
  created_at timestamptz not null default now(),
  assigned_at timestamptz,
  picked_up_at timestamptz,
  delivered_at timestamptz,
  failed_at timestamptz
);

create table if not exists public.delivery_events (
  id bigint generated always as identity primary key,
  delivery_id uuid not null references public.deliveries(id) on delete cascade,
  status text not null,
  source text not null default 'dashboard',
  note text,
  created_at timestamptz not null default now()
);

create index if not exists deliveries_status_idx on public.deliveries(status);
create index if not exists deliveries_rider_idx on public.deliveries(rider_id);
create index if not exists events_delivery_idx on public.delivery_events(delivery_id);

alter table public.riders enable row level security;
alter table public.deliveries enable row level security;
alter table public.delivery_events enable row level security;

-- The MVP backend uses the Supabase service-role key server-side, so the tables
-- do not need public client policies. Never expose the service-role key to a browser.

insert into public.riders (name, phone, vehicle)
values
  ('Peter Mwangi', '+254700000001', 'Boda Boda'),
  ('Jane Wanjiku', '+254700000002', 'Boda Boda'),
  ('Brian Otieno', '+254700000003', 'Boda Boda')
on conflict (phone) do nothing;
