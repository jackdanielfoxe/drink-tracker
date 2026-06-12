-- Run in Supabase SQL editor

create table users (
  id uuid primary key default gen_random_uuid(),
  name text unique not null
);

create table drink_types (
  id int primary key,
  name text not null
);

create table sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) not null,
  session_date date not null,
  created_at timestamptz default now(),
  unique (user_id, session_date)
);

create table session_drinks (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete cascade not null,
  drink_type_id int references drink_types(id) not null,
  quantity int not null check (quantity > 0)
);

-- Seed drink types
insert into drink_types (id, name) values
  (1, 'Beer (pint)'),
  (2, 'Beer (half)'),
  (3, 'Beer (bottle 330ml)'),
  (4, 'Beer (bottle 660ml)'),
  (5, 'Beer (can)'),
  (6, 'Cider (pint)'),
  (7, 'Cider (half)'),
  (8, 'Cider (bottle)'),
  (9, 'Cider (can)'),
  (10, 'Wine (glass)'),
  (11, 'Spirit + Mixer'),
  (12, 'Shot'),
  (13, 'Cocktail');

-- Seed users (edit names as needed - no need to set ids manually,
-- the app fetches users + their generated ids from this table directly)
insert into users (name) values
  ('Alex'), ('Sam'), ('Jordan'), ('Priya');

-- Enable RLS and allow anon read/write (fine for a small friend group;
-- tighten later if needed)
alter table sessions enable row level security;
alter table session_drinks enable row level security;
alter table users enable row level security;
alter table drink_types enable row level security;

create policy "anon full access" on sessions for all using (true) with check (true);
create policy "anon full access" on session_drinks for all using (true) with check (true);
create policy "anon read" on users for select using (true);
create policy "anon read" on drink_types for select using (true);
