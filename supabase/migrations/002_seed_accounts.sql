-- Seed Sub-Networks
insert into sub_networks (slug, name) values
  ('northly', 'Northly'),
  ('waveroom', 'Waveroom'),
  ('bites', 'Bites'),
  ('nightout', 'Nightout'),
  ('whats_the_plan', 'What''s The Plan'),
  ('must_be', 'Must Be'),
  ('housing_watch', 'Housing Watch'),
  ('got_deals', 'Got Deals'),
  ('extra_assets', 'Extra Assets')
on conflict (slug) do nothing;

-- Seed Accounts (IG accounts from rate sheet + Asif's prototype)
-- Using CTEs for cleaner sub_network ID lookup
with sn as (select id, slug from sub_networks)
insert into accounts (handle, sub_network_id, platform, market, market_label, region, categories, pricing_status)
select
  handle,
  (select id from sn where slug = sub_network_slug),
  platform::platform_type,
  market,
  market_label,
  region,
  categories,
  pricing_status::pricing_status
from (values
  -- Toronto
  ('@waveroom.toronto', 'waveroom', 'instagram', 'toronto', 'Toronto', 'Ontario', array['restaurant','bar','event_space','app','retail','service'], 'active'),
  ('@northlytoronto', 'northly', 'instagram', 'toronto', 'Toronto', 'Ontario', array['restaurant','bar','event_space','app','retail','service'], 'active'),
  ('@girlplanstoronto', 'whats_the_plan', 'instagram', 'toronto', 'Toronto', 'Ontario', array['restaurant','beauty','gifting','retail','service'], 'active'),
  ('@mustbetoronto', 'must_be', 'instagram', 'toronto', 'Toronto', 'Ontario', array['restaurant','bar','event_space','app','retail'], 'active'),
  ('@nightouttoronto', 'nightout', 'instagram', 'toronto', 'Toronto', 'Ontario', array['bar','event_space','restaurant'], 'active'),
  ('@bites.toronto', 'bites', 'instagram', 'toronto', 'Toronto', 'Ontario', array['restaurant'], 'active'),
  ('@torontosight', 'extra_assets', 'instagram', 'toronto', 'Toronto', 'Ontario', array['event_space','retail','service'], 'active'),
  ('@torontogotdeals', 'got_deals', 'instagram', 'toronto', 'Toronto', 'Ontario', array['retail','restaurant','service'], 'active'),
  -- GTA
  ('@northlybrampton', 'northly', 'instagram', 'brampton', 'Brampton', 'Ontario', array['restaurant','app','retail','service','event_space'], 'active'),
  ('@northlymississauga', 'northly', 'instagram', 'mississauga', 'Mississauga', 'Ontario', array['restaurant','app','retail','service','event_space'], 'active'),
  ('@northlydurham', 'northly', 'instagram', 'durham', 'Durham', 'Ontario', array['restaurant','app','retail','service','event_space'], 'active'),
  ('@northlyyorkregion', 'northly', 'instagram', 'york_region', 'York Region', 'Ontario', array['restaurant','app','retail','service','event_space'], 'active'),
  ('@waveroommississauga', 'waveroom', 'instagram', 'mississauga', 'Mississauga', 'Ontario', array['app','restaurant','retail','service','event_space'], 'active'),
  ('@waveroombrampton', 'waveroom', 'instagram', 'brampton', 'Brampton', 'Ontario', array['app','restaurant','retail','service','event_space'], 'active'),
  -- Hamilton
  ('@northlyhamilton', 'northly', 'instagram', 'hamilton', 'Hamilton', 'Ontario', array['restaurant','bar','beauty','retail','service','event_space'], 'active'),
  ('@girlplanshamilton', 'whats_the_plan', 'instagram', 'hamilton', 'Hamilton', 'Ontario', array['restaurant','beauty','retail','service','gifting'], 'active'),
  ('@waveroomhamilton', 'waveroom', 'instagram', 'hamilton', 'Hamilton', 'Ontario', array['restaurant','bar','event_space','retail','service'], 'active'),
  -- Montreal
  ('@waveroommontreal', 'waveroom', 'instagram', 'montreal', 'Montreal', 'Quebec', array['restaurant','retail','service','event_space','ecommerce'], 'active'),
  ('@northlymontreal', 'northly', 'instagram', 'montreal', 'Montreal', 'Quebec', array['restaurant','retail','service','event_space','ecommerce'], 'active'),
  ('@girlplansmontreal', 'whats_the_plan', 'instagram', 'montreal', 'Montreal', 'Quebec', array['retail','service','gifting','ecommerce','restaurant'], 'active'),
  -- Vancouver
  ('@waveroomvancouver', 'waveroom', 'instagram', 'vancouver', 'Vancouver', 'BC', array['restaurant','retail','service','event_space','ecommerce'], 'active'),
  ('@northlyvancouver', 'northly', 'instagram', 'vancouver', 'Vancouver', 'BC', array['restaurant','retail','service','event_space','ecommerce'], 'active'),
  ('@girlplansvancouver', 'whats_the_plan', 'instagram', 'vancouver', 'Vancouver', 'BC', array['retail','service','gifting','ecommerce','restaurant'], 'active'),
  ('@mustbevancouver', 'must_be', 'instagram', 'vancouver', 'Vancouver', 'BC', array['restaurant','retail','event_space'], 'active'),
  ('@bitesvancouver', 'bites', 'instagram', 'vancouver', 'Vancouver', 'BC', array['restaurant'], 'active'),
  -- London ON
  ('@northlylondon', 'northly', 'instagram', 'london', 'London', 'Ontario', array['restaurant','retail','service','event_space'], 'active'),
  -- Calgary
  ('@northlycalgary', 'northly', 'instagram', 'calgary', 'Calgary', 'Alberta', array['restaurant','retail','service','event_space'], 'active'),
  ('@whatstheplancalgary', 'whats_the_plan', 'instagram', 'calgary', 'Calgary', 'Alberta', array['restaurant','retail','service'], 'active'),
  ('@waveroomcalgary', 'waveroom', 'instagram', 'calgary', 'Calgary', 'Alberta', array['restaurant','event_space','retail'], 'active'),
  -- National
  ('@waverooom', 'waveroom', 'instagram', 'national', 'National', 'Canada', array['restaurant','bar','event_space','app','retail','service','ecommerce'], 'active'),
  ('@northlycanada', 'northly', 'instagram', 'national', 'National', 'Canada', array['restaurant','bar','event_space','app','retail','service','ecommerce'], 'active'),
  ('@mustbecanada', 'must_be', 'instagram', 'national', 'National', 'Canada', array['restaurant','retail','service','ecommerce'], 'active'),
  ('@canadagotdeals', 'got_deals', 'instagram', 'national', 'National', 'Canada', array['retail','restaurant','service','ecommerce'], 'active')
) as t(handle, sub_network_slug, platform, market, market_label, region, categories, pricing_status)
on conflict (handle) do nothing;

-- Seed initial metrics (from rate sheet / Asif's prototype — April 2026 snapshot)
with acc as (select id, handle from accounts)
insert into account_metrics (account_id, followers, avg_impressions_30d, source)
select
  (select id from acc where handle = t.handle),
  t.followers,
  t.avg_impressions,
  'manual'
from (values
  ('@waveroom.toronto',    263000, 39450),
  ('@northlytoronto',      162000, 24300),
  ('@girlplanstoronto',     55800,  8370),
  ('@mustbetoronto',        86300, 12945),
  ('@nightouttoronto',     129000, 19350),
  ('@bites.toronto',        62800,  9420),
  ('@torontosight',         56200,  8430),
  ('@torontogotdeals',      24000,  3600),
  ('@northlybrampton',      79500, 11925),
  ('@northlymississauga',   16200,  2430),
  ('@northlydurham',        56900,  8535),
  ('@northlyyorkregion',     9800,  1470),
  ('@waveroommississauga',  27000,  4050),
  ('@waveroombrampton',     23000,  3450),
  ('@northlyhamilton',     137000, 20550),
  ('@girlplanshamilton',    28600,  4290),
  ('@waveroomhamilton',     15000,  2250),
  ('@waveroommontreal',     82400, 12360),
  ('@northlymontreal',      63300,  9495),
  ('@girlplansmontreal',    32600,  4890),
  ('@waveroomvancouver',    78300, 11745),
  ('@northlyvancouver',     80900, 12135),
  ('@girlplansvancouver',   37100,  5565),
  ('@mustbevancouver',      15700,  2355),
  ('@bitesvancouver',       11000,  1650),
  ('@northlylondon',        29400,  4410),
  ('@northlycalgary',       50000,  7500),
  ('@whatstheplancalgary',  19200,  2880),
  ('@waveroomcalgary',       7800,  1170),
  ('@waverooom',           602000, 90300),
  ('@northlycanada',       192000, 28800),
  ('@mustbecanada',         77300, 11595),
  ('@canadagotdeals',       48200,  7230)
) as t(handle, followers, avg_impressions)
where (select id from acc where handle = t.handle) is not null;

-- Seed initial rates (computed from formula with defaults: CPM=10, k=1.77, a=0.495, weights=0.25/0.75)
-- These match Asif's baseRate values from his prototype
with acc as (select id, handle from accounts)
insert into account_rates (
  account_id, ba_feed, ba_feed_bundle_min, story, story_bundle_min,
  carousel, carousel_bundle_min, ga_feed, ga_feed_bundle_min,
  oc_reel, oc_reel_bundle_min, talking_head, talking_head_bundle_min,
  is_manual, computed_from_followers, computed_from_impressions
)
select
  (select id from acc where handle = t.handle),
  -- ba_feed = base rate (from Asif's PAGE_DB)
  t.base_rate,
  -- ba_feed_bundle_min = base * 0.40, floor 100
  greatest(100, round(t.base_rate * 0.40)),
  -- story = base * 0.50, floor 50
  greatest(50, round(t.base_rate * 0.50)),
  0, -- story_bundle_min always 0
  -- carousel = base * 0.50, floor 100
  greatest(100, round(t.base_rate * 0.50)),
  -- carousel_bundle_min = base * 0.40, floor 100
  greatest(100, round(t.base_rate * 0.40)),
  -- ga_feed = base * 1.20, floor 120
  greatest(120, round(t.base_rate * 1.20)),
  -- ga_feed_bundle_min = base * 0.40, floor 100
  greatest(100, round(t.base_rate * 0.40)),
  -- oc_reel = base + 1000, floor 1100
  greatest(1100, t.base_rate + 1000),
  -- oc_reel_bundle_min = base * 0.40 + 700, floor 800
  greatest(800, round(t.base_rate * 0.40) + 700),
  -- talking_head = base + 400, floor 500
  greatest(500, t.base_rate + 400),
  -- talking_head_bundle_min = base * 0.40, floor 500
  greatest(500, round(t.base_rate * 0.40)),
  false,
  t.followers,
  t.avg_impressions
from (values
  ('@waveroom.toronto',    729,  263000, 39450),
  ('@northlytoronto',      672,  162000, 24300),
  ('@girlplanstoronto',    610,   55800,  8370),
  ('@mustbetoronto',       467,   86300, 12945),
  ('@nightouttoronto',     364,  129000, 19350),
  ('@bites.toronto',       370,   62800,  9420),
  ('@torontosight',        367,   56200,  8430),
  ('@torontogotdeals',     259,   24000,  3600),
  ('@northlybrampton',     465,   79500, 11925),
  ('@northlymississauga',  260,   16200,  2430),
  ('@northlydurham',       505,   56900,  8535),
  ('@northlyyorkregion',   188,    9800,  1470),
  ('@waveroommississauga', 175,   27000,  4050),
  ('@waveroombrampton',    175,   23000,  3450),
  ('@northlyhamilton',     659,  137000, 20550),
  ('@girlplanshamilton',   486,   28600,  4290),
  ('@waveroomhamilton',    350,   15000,  2250),
  ('@waveroommontreal',    411,   82400, 12360),
  ('@northlymontreal',     369,   63300,  9495),
  ('@girlplansmontreal',   445,   32600,  4890),
  ('@waveroomvancouver',   446,   78300, 11745),
  ('@northlyvancouver',    476,   80900, 12135),
  ('@girlplansvancouver',  529,   37100,  5565),
  ('@mustbevancouver',     225,   15700,  2355),
  ('@bitesvancouver',      153,   11000,  1650),
  ('@northlylondon',       303,   29400,  4410),
  ('@northlycalgary',      321,   50000,  7500),
  ('@whatstheplancalgary', 327,   19200,  2880),
  ('@waveroomcalgary',     175,    7800,  1170),
  ('@waverooom',          1496,  602000, 90300),
  ('@northlycanada',       806,  192000, 28800),
  ('@mustbecanada',        399,   77300, 11595),
  ('@canadagotdeals',      346,   48200,  7230)
) as t(handle, base_rate, followers, avg_impressions)
where (select id from acc where handle = t.handle) is not null;

-- Users are seeded automatically via a database trigger on first Google OAuth login.
-- Role assignment is handled by the auth trigger in 003_auth_trigger.sql.
