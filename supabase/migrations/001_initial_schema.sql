-- Northly Sales OS — Initial Schema
-- Run this in Supabase SQL Editor

-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "vector";

-- ============================================================
-- USERS & ROLES
-- ============================================================

create type user_role as enum ('admin', 'ae', 'sdr', 'campaign_manager', 'finance', 'readonly');

create table users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null,
  role user_role not null default 'ae',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table users enable row level security;

-- Users can read their own record; admins read all
create policy "users_read_own" on users
  for select using (auth.uid() = id);

create policy "admins_read_all_users" on users
  for select using (
    exists (select 1 from users where id = auth.uid() and role = 'admin')
  );

create policy "admins_manage_users" on users
  for all using (
    exists (select 1 from users where id = auth.uid() and role = 'admin')
  );

-- ============================================================
-- ACCOUNTS DIRECTORY
-- ============================================================

create type platform_type as enum ('instagram', 'tiktok', 'facebook', 'youtube');
create type pricing_status as enum ('active', 'contact_for_pricing', 'na');

create table sub_networks (
  id uuid primary key default uuid_generate_v4(),
  slug text not null unique,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

create table accounts (
  id uuid primary key default uuid_generate_v4(),
  handle text not null unique,
  sub_network_id uuid not null references sub_networks(id),
  platform platform_type not null,
  market text not null,
  market_label text not null,
  region text not null,
  categories text[] not null default '{}',
  pricing_status pricing_status not null default 'active',
  manual_rate_lock boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table account_metrics (
  id uuid primary key default uuid_generate_v4(),
  account_id uuid not null references accounts(id) on delete cascade,
  recorded_at timestamptz not null default now(),
  followers bigint not null,
  avg_impressions_30d bigint not null,
  source text not null check (source in ('apify', 'youtube_api', 'manual')),
  raw_data jsonb
);

-- Time-series index for efficient "latest metric" queries
create index account_metrics_account_time on account_metrics (account_id, recorded_at desc);

create table account_rates (
  id uuid primary key default uuid_generate_v4(),
  account_id uuid not null references accounts(id) on delete cascade,
  effective_from timestamptz not null default now(),
  ba_feed numeric(10,2) not null,
  ba_feed_bundle_min numeric(10,2) not null,
  story numeric(10,2) not null,
  story_bundle_min numeric(10,2) not null default 0,
  carousel numeric(10,2) not null,
  carousel_bundle_min numeric(10,2) not null,
  ga_feed numeric(10,2) not null,
  ga_feed_bundle_min numeric(10,2) not null,
  oc_reel numeric(10,2) not null,
  oc_reel_bundle_min numeric(10,2) not null,
  talking_head numeric(10,2) not null,
  talking_head_bundle_min numeric(10,2) not null,
  is_manual boolean not null default false,
  computed_from_followers bigint,
  computed_from_impressions bigint,
  created_at timestamptz not null default now()
);

create index account_rates_account_time on account_rates (account_id, effective_from desc);

-- All authenticated users can read accounts & rates
alter table sub_networks enable row level security;
create policy "authenticated_read_sub_networks" on sub_networks for select to authenticated using (true);

alter table accounts enable row level security;
create policy "authenticated_read_accounts" on accounts for select to authenticated using (true);
create policy "admins_manage_accounts" on accounts for all using (
  exists (select 1 from users where id = auth.uid() and role = 'admin')
);

alter table account_metrics enable row level security;
create policy "authenticated_read_metrics" on account_metrics for select to authenticated using (true);

alter table account_rates enable row level security;
create policy "authenticated_read_rates" on account_rates for select to authenticated using (true);
create policy "admins_manage_rates" on account_rates for all using (
  exists (select 1 from users where id = auth.uid() and role = 'admin')
);

-- ============================================================
-- PRICING CONFIG
-- ============================================================

create table pricing_config (
  id uuid primary key default uuid_generate_v4(),
  key text not null unique,
  value numeric(10,4) not null,
  label text not null,
  description text,
  updated_by uuid references users(id),
  updated_at timestamptz not null default now()
);

alter table pricing_config enable row level security;
create policy "authenticated_read_pricing_config" on pricing_config for select to authenticated using (true);
create policy "admins_manage_pricing_config" on pricing_config for all using (
  exists (select 1 from users where id = auth.uid() and role = 'admin')
);

-- Seed default config values
insert into pricing_config (key, value, label, description) values
  ('cpm', 10, 'Network CPM ($)', 'Cost per thousand impressions used in pricing formula'),
  ('impressions_weight', 0.25, 'Impressions Weight', 'Blend weight for impressions component (must sum to 1 with followers_weight)'),
  ('followers_weight', 0.75, 'Followers Weight', 'Blend weight for followers component'),
  ('scale_constant', 1.77, 'Scale Constant (k)', 'Scaling constant in followers formula: k * followers^a'),
  ('follower_exponent', 0.495, 'Follower Exponent (a)', 'Diminishing returns curve on follower count'),
  ('bundle_min_multiplier', 0.40, 'Bundle Min Multiplier', 'Absolute minimum as fraction of base rate (0.40 = 60% off)'),
  ('oc_reel_uplift', 1000, 'OC Reel Uplift ($)', 'Added to base rate for Original Content Reel format'),
  ('oc_reel_bundle_uplift', 700, 'OC Reel Bundle Uplift ($)', 'Added to bundle minimum for OC Reel'),
  ('talking_head_uplift', 400, 'Talking Head Uplift ($)', 'Added to base rate for Talking Head Reel format'),
  ('flat_markup', 175, 'Flat Per-Account Markup ($)', 'Default flat markup added to each account base rate'),
  ('percentage_markup', 0.20, 'Percentage Markup', 'Default blanket percentage markup (0.20 = 20%)'),
  ('option2_discount', 0.25, 'Option 2 Default Discount', 'Default pilot rate discount (25%)'),
  ('option3_discount', 0.30, 'Option 3 Default Discount', 'Default awareness bundle discount (30%)'),
  ('option4_discount', 0.35, 'Option 4 Default Discount', 'Default awareness+conversion discount (35%)'),
  ('option5_discount', 0.40, 'Option 5 Default Discount', 'Default full campaign discount (40%)');

-- ============================================================
-- CLIENTS & DEALS
-- ============================================================

create table clients (
  id uuid primary key default uuid_generate_v4(),
  company_name text not null,
  primary_contact_name text,
  primary_contact_email text,
  website text,
  industry_category text,
  industry_niche text,
  close_lead_id text unique,
  is_repeat_client boolean not null default false,
  notes text,
  created_by uuid not null references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table clients enable row level security;
create policy "authenticated_read_clients" on clients for select to authenticated using (true);
create policy "ae_manage_own_clients" on clients for all using (
  created_by = auth.uid() or
  exists (select 1 from users where id = auth.uid() and role in ('admin', 'ae'))
);

create type deal_status as enum ('draft', 'proposal_sent', 'negotiating', 'won', 'lost', 'stalled');
create type markup_mode as enum ('flat', 'percentage');
create type display_mode as enum ('itemized', 'package');

create table deals (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid not null references clients(id),
  ae_id uuid not null references users(id),
  title text not null,
  status deal_status not null default 'draft',
  close_opp_id text,
  cities text[] not null default '{}',
  industry_category text,
  goal text,
  budget_min numeric(12,2),
  budget_max numeric(12,2),
  final_amount numeric(12,2),
  markup_mode markup_mode not null default 'flat',
  markup_value numeric(10,4) not null default 175,
  display_mode display_mode not null default 'package',
  recommended_option smallint check (recommended_option between 1 and 5),
  chosen_option smallint check (chosen_option between 1 and 5),
  notes text,
  won_at timestamptz,
  lost_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table deals enable row level security;
create policy "authenticated_read_deals" on deals for select to authenticated using (true);
create policy "ae_manage_own_deals" on deals for all using (
  ae_id = auth.uid() or
  exists (select 1 from users where id = auth.uid() and role in ('admin'))
);

-- ============================================================
-- PROPOSALS
-- ============================================================

create type proposal_status as enum ('draft', 'sent', 'viewed', 'accepted', 'rejected');

create table proposals (
  id uuid primary key default uuid_generate_v4(),
  deal_id uuid not null references deals(id),
  version smallint not null default 1,
  status proposal_status not null default 'draft',
  intake_data jsonb not null default '{}',
  selected_accounts jsonb not null default '[]',
  ladder_data jsonb not null default '{}',
  generated_text text,
  google_doc_id text,
  google_doc_url text,
  pdf_url text,
  sent_at timestamptz,
  created_by uuid not null references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table proposals enable row level security;
create policy "authenticated_read_proposals" on proposals for select to authenticated using (true);
create policy "creator_manage_proposals" on proposals for all using (
  created_by = auth.uid() or
  exists (select 1 from users where id = auth.uid() and role = 'admin')
);

-- ============================================================
-- STRATEGY HOOKS
-- ============================================================

create table strategy_hooks (
  id uuid primary key default uuid_generate_v4(),
  category text not null,
  hook_text text not null,
  is_active boolean not null default true,
  source text not null check (source in ('seed', 'learned', 'manual')),
  close_rate numeric(5,4),
  usage_count integer not null default 0,
  created_by uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table strategy_hooks enable row level security;
create policy "authenticated_read_hooks" on strategy_hooks for select to authenticated using (true);
create policy "admins_manage_hooks" on strategy_hooks for all using (
  exists (select 1 from users where id = auth.uid() and role = 'admin')
);

-- Seed strategy hooks
insert into strategy_hooks (category, hook_text, source) values
  ('restaurant', 'The opportunity here is not just getting seen. It''s turning curiosity into traffic and repeat visits.', 'seed'),
  ('bar', 'This needs to create buzz, repeated exposure, and a reason for people to come in now.', 'seed'),
  ('beauty', 'The opportunity here is to build trust, visibility, and a reason for new clients to book now.', 'seed'),
  ('service', 'For a service business like this, the biggest challenge is usually not quality. It''s getting in front of the right local audience consistently.', 'seed'),
  ('retail', 'The opportunity is to turn local discovery into store visits and measurable action.', 'seed'),
  ('event_space', 'This is about positioning the space as a destination, not just promoting one-off dates or events.', 'seed'),
  ('app', 'The goal here isn''t just awareness. It''s getting the product in front of the right audience and turning that into downloads and sign-ups.', 'seed'),
  ('ecommerce', 'This needs to move people from awareness to purchase in a clean, measurable funnel.', 'seed'),
  ('gifting', 'The opportunity is to put the brand in front of the right planner mindset and tie awareness to a clear purchase moment.', 'seed');

-- ============================================================
-- PROPOSAL INTELLIGENCE LAYER
-- ============================================================

create table proposal_examples (
  id uuid primary key default uuid_generate_v4(),
  source_file text not null,
  source_type text not null check (source_type in ('email_thread', 'close_crm', 'manual')),
  client_name text,
  industry_category text,
  industry_niche text,
  deal_size_tier text check (deal_size_tier in ('lt_2k', '2k_5k', '5k_10k', '10k_25k', 'gt_25k')),
  outcome text not null check (outcome in ('won', 'lost', 'stalled', 'unknown')),
  geography_tier text check (geography_tier in ('single_city', 'multi_city', 'national')),
  cities text[],
  budget_discussed numeric(12,2),
  final_deal_size numeric(12,2),
  options_presented int[],
  recommended_option smallint,
  chosen_option smallint,
  time_to_close_days integer,
  ae_name text,
  objections text[],
  strategy_framing text,
  closing_cta text,
  raw_text text,
  extraction_status text not null default 'ai_generated' check (extraction_status in ('ai_generated', 'ae_confirmed', 'rejected')),
  embedding vector(1536),
  ingested_at timestamptz not null default now(),
  confirmed_by uuid references users(id),
  created_at timestamptz not null default now(),
  -- Idempotency: prevent re-ingesting same file
  unique (source_file, source_type)
);

create index proposal_examples_embedding_idx on proposal_examples
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 50);

alter table proposal_examples enable row level security;
create policy "admins_and_ae_read_examples" on proposal_examples for select using (
  exists (select 1 from users where id = auth.uid() and role in ('admin', 'ae'))
);
create policy "admins_manage_examples" on proposal_examples for all using (
  exists (select 1 from users where id = auth.uid() and role = 'admin')
);

-- ============================================================
-- AUDIT LOG
-- ============================================================

create table audit_log (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id),
  action text not null,
  entity_type text not null,
  entity_id text not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

alter table audit_log enable row level security;
create policy "admins_read_audit" on audit_log for select using (
  exists (select 1 from users where id = auth.uid() and role = 'admin')
);
create policy "system_insert_audit" on audit_log for insert with check (true);

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Get latest account metrics
create or replace function get_latest_account_metrics(p_account_id uuid)
returns table (followers bigint, avg_impressions_30d bigint, recorded_at timestamptz) as $$
  select followers, avg_impressions_30d, recorded_at
  from account_metrics
  where account_id = p_account_id
  order by recorded_at desc
  limit 1;
$$ language sql stable;

-- Get latest account rate
create or replace function get_latest_account_rate(p_account_id uuid)
returns setof account_rates as $$
  select * from account_rates
  where account_id = p_account_id
  order by effective_from desc
  limit 1;
$$ language sql stable;

-- Semantic search for similar proposals
create or replace function search_similar_proposals(
  query_embedding vector(1536),
  match_threshold float default 0.7,
  match_count int default 5
)
returns setof proposal_examples as $$
  select * from proposal_examples
  where extraction_status != 'rejected'
    and 1 - (embedding <=> query_embedding) > match_threshold
  order by embedding <=> query_embedding
  limit match_count;
$$ language sql stable;

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger users_updated_at before update on users
  for each row execute function update_updated_at();
create trigger accounts_updated_at before update on accounts
  for each row execute function update_updated_at();
create trigger clients_updated_at before update on clients
  for each row execute function update_updated_at();
create trigger deals_updated_at before update on deals
  for each row execute function update_updated_at();
create trigger proposals_updated_at before update on proposals
  for each row execute function update_updated_at();
create trigger strategy_hooks_updated_at before update on strategy_hooks
  for each row execute function update_updated_at();
