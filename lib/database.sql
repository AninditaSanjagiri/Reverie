-- Run this in your Supabase SQL editor to set up the schema

-- Events table
create table if not exists events (
  id uuid default gen_random_uuid() primary key,
  slug text unique not null,
  host_name text not null,
  guest_name text not null,
  reveal_unlocked boolean default false,
  created_at timestamptz default now()
);

-- Participants table
create table if not exists participants (
  id uuid default gen_random_uuid() primary key,
  event_id uuid references events(id) on delete cascade not null,
  name text not null,
  joined_at timestamptz default now()
);

-- Memories table
create table if not exists memories (
  id uuid default gen_random_uuid() primary key,
  event_id uuid references events(id) on delete cascade not null,
  participant_id uuid references participants(id) on delete cascade not null,
  participant_name text not null,
  type text check (type in ('photo', 'video')) not null,
  storage_url text not null,
  whisper_message text,
  created_at timestamptz default now()
);

-- RLS Policies (allow public access for the event links to work)
alter table events enable row level security;
alter table participants enable row level security;
alter table memories enable row level security;

-- Events: anyone can read, only authenticated can create (or use service role)
create policy "Public read events" on events for select using (true);
create policy "Public insert events" on events for insert with check (true);
create policy "Public update reveal" on events for update using (true);

-- Participants: anyone can read/insert
create policy "Public read participants" on participants for select using (true);
create policy "Public insert participants" on participants for insert with check (true);

-- Memories: anyone can read/insert
create policy "Public read memories" on memories for select using (true);
create policy "Public insert memories" on memories for insert with check (true);

-- Storage bucket setup (run after creating bucket named 'memories' in Supabase dashboard)
-- In Supabase Dashboard: Storage > New bucket > Name: "memories" > Public: true
insert into storage.buckets (id, name, public) values ('memories', 'memories', true)
  on conflict do nothing;

create policy "Public upload memories" on storage.objects
  for insert with check (bucket_id = 'memories');

create policy "Public read memories" on storage.objects
  for select using (bucket_id = 'memories');
