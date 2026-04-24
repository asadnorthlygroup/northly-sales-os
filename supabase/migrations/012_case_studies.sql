create table if not exists case_studies (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  client_name text not null default '',
  niche text not null default 'other',
  sub_niche text,
  content_type text not null default 'notes' check (content_type in ('pdf', 'link', 'notes')),
  file_url text,
  link_url text,
  notes text not null default '',
  results text not null default '',
  tags text[] not null default '{}',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table case_studies enable row level security;

create policy "auth_read_case_studies" on case_studies
  for select using (auth.role() = 'authenticated');

create policy "auth_insert_case_studies" on case_studies
  for insert with check (auth.role() = 'authenticated');

create policy "auth_update_case_studies" on case_studies
  for update using (auth.role() = 'authenticated');

create policy "auth_delete_case_studies" on case_studies
  for delete using (auth.role() = 'authenticated');
