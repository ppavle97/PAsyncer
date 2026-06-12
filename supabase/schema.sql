-- Filters: user-defined search filters
create table if not exists filters (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  brand text not null,
  model text not null default '',
  year_from int,
  year_to int,
  price_from int,
  price_to int,
  created_at timestamptz not null default now()
);

-- Listings scraped from Polovni automobili
create table if not exists listings (
  id text primary key, -- id from the site URL
  filter_id uuid not null references filters(id) on delete cascade,
  title text not null,
  price_eur int,
  mileage_km int,
  city text,
  year int,
  url text not null,
  first_seen_at timestamptz not null,
  last_seen_at timestamptz not null,
  is_active boolean not null default true
);

create index if not exists listings_filter_id_idx on listings(filter_id);
create index if not exists listings_is_active_idx on listings(is_active);

-- Price change history
create table if not exists price_history (
  id bigserial primary key,
  listing_id text not null references listings(id) on delete cascade,
  price_eur int not null,
  recorded_at timestamptz not null default now()
);

create index if not exists price_history_listing_id_idx on price_history(listing_id);

-- Sync log
create table if not exists syncs (
  id bigserial primary key,
  filter_id uuid not null references filters(id) on delete cascade,
  synced_at timestamptz not null,
  total_scraped int not null default 0,
  new_count int not null default 0,
  price_change_count int not null default 0,
  removed_count int not null default 0
);

create index if not exists syncs_filter_id_idx on syncs(filter_id);
