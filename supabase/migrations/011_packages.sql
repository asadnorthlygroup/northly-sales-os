create table if not exists packages (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  deliverables text[] not null default '{}',
  pages_included text[] not null default '{}',
  primary_page text,
  collabs text[] not null default '{}',
  markets text[] not null default '{}',
  pricing numeric(10,2) not null default 0,
  guaranteed_impressions integer,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table packages enable row level security;

create policy "auth_read_packages" on packages
  for select using (auth.role() = 'authenticated');

create policy "auth_insert_packages" on packages
  for insert with check (auth.role() = 'authenticated');

create policy "auth_update_packages" on packages
  for update using (auth.role() = 'authenticated');

create policy "auth_delete_packages" on packages
  for delete using (auth.role() = 'authenticated');
