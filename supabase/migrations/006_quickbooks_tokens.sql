-- QuickBooks OAuth token storage (single-row for internal tool)
create table if not exists quickbooks_tokens (
  id integer primary key default 1,
  access_token text not null,
  refresh_token text not null,
  realm_id text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Only one row ever; enforce it
create unique index if not exists quickbooks_tokens_single_row on quickbooks_tokens ((true));

alter table quickbooks_tokens enable row level security;

-- Only service role can access (no user-facing RLS policy needed)
