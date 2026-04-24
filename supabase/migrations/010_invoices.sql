-- Local invoice ledger (mirrors what gets created in QuickBooks)
create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid references deals(id) on delete set null,
  client_name text not null,
  option_number integer,
  subtotal numeric(10,2) not null,
  tax_amount numeric(10,2) not null default 0,
  total numeric(10,2) not null,
  province text not null default 'ON',
  invoice_date date not null,
  due_date date not null,
  service_description text,
  selected_accounts text[] not null default '{}',
  qb_invoice_id text,
  qb_invoice_number text,
  qb_url text,
  status text not null default 'sent' check (status in ('draft','sent','paid','void')),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table invoices enable row level security;

create policy "authenticated_read_invoices" on invoices
  for select using (auth.role() = 'authenticated');

create policy "authenticated_insert_invoices" on invoices
  for insert with check (auth.role() = 'authenticated');

create policy "authenticated_update_invoices" on invoices
  for update using (auth.role() = 'authenticated');
