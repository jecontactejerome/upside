-- ============================================================
--  Upside — schéma initial
--  À exécuter dans Supabase > SQL Editor (projet dédié Upside).
-- ============================================================

-- ---------- Extensions ----------
create extension if not exists "pgcrypto";      -- gen_random_uuid()

-- ---------- Enums ----------
do $$ begin
  create type region_t as enum ('US', 'EU');
exception when duplicate_object then null; end $$;

do $$ begin
  create type digest_src_t as enum ('gemini', 'rule');
exception when duplicate_object then null; end $$;

-- ============================================================
--  securities — univers de valeurs (~1 200 : S&P 500 + STOXX 600)
-- ============================================================
create table if not exists securities (
  id                uuid primary key default gen_random_uuid(),
  symbol_yahoo      text not null unique,          -- 'AAPL', 'AIR.PA', 'SAP.DE'
  symbol_finnhub    text,                          -- 'AAPL', 'AIR.PA' (souvent identique)
  isin              text,
  name              text not null,
  exchange          text,                          -- 'NASDAQ', 'Paris', 'XETRA'
  mic               text,                          -- code MIC : 'XNAS', 'XPAR', 'XETR'
  country           text,                          -- ISO-2 : 'US', 'FR', 'DE'
  region            region_t not null,
  currency          text not null default 'USD',
  sector            text,
  market_cap        numeric,                       -- en devise de cotation, best-effort
  index_membership  text[] not null default '{}',  -- '{SP500}', '{STOXX600}', '{SP500,STOXX600}'
  active            boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists securities_region_idx on securities (region) where active;
create index if not exists securities_sector_idx on securities (sector) where active;

-- ============================================================
--  quotes — dernier prix connu (upsert, 1 ligne par valeur)
-- ============================================================
create table if not exists quotes (
  security_id      uuid primary key references securities(id) on delete cascade,
  price            numeric not null,
  currency         text not null,
  change_pct_day   numeric,
  as_of            timestamptz not null,
  source           text not null default 'yahoo'
);

-- ============================================================
--  price_history — clôture quotidienne (sparklines), rétention ~1 an
-- ============================================================
create table if not exists price_history (
  security_id  uuid not null references securities(id) on delete cascade,
  d            date not null,
  close        numeric not null,
  primary key (security_id, d)
);

-- ============================================================
--  price_targets — consensus analystes courant (upsert)
-- ============================================================
create table if not exists price_targets (
  security_id         uuid primary key references securities(id) on delete cascade,
  target_mean         numeric,
  target_high         numeric,
  target_low          numeric,
  target_median       numeric,
  num_analysts        integer,
  recommendation_mean numeric,           -- 1 = strong buy … 5 = sell
  recommendation_key  text,              -- 'buy', 'hold', 'sell'…
  currency            text,
  as_of               timestamptz not null,
  source              text not null default 'yahoo'
);

-- ============================================================
--  target_revisions — historique des objectifs (momentum 30 j)
-- ============================================================
create table if not exists target_revisions (
  security_id  uuid not null references securities(id) on delete cascade,
  captured_at  timestamptz not null default now(),
  target_mean  numeric,
  num_analysts integer,
  primary key (security_id, captured_at)
);
create index if not exists target_revisions_sec_time_idx
  on target_revisions (security_id, captured_at desc);

-- ============================================================
--  growth_scores — score calculé à chaque ingestion (upsert)
-- ============================================================
create table if not exists growth_scores (
  security_id    uuid primary key references securities(id) on delete cascade,
  upside_pct     numeric,            -- (target_mean - price) / price
  confidence     numeric,            -- 0..1  (num_analysts / 15, borné)
  momentum       numeric,            -- variation target_mean sur ~30 j
  rating_factor  numeric,            -- 0.6..1.2 selon recommendation_mean
  score          numeric,            -- composite (voir ingest/score.mjs)
  computed_at    timestamptz not null default now()
);
create index if not exists growth_scores_score_idx on growth_scores (score desc nulls last);
create index if not exists growth_scores_upside_idx on growth_scores (upside_pct desc nulls last);

-- ============================================================
--  news_articles
-- ============================================================
create table if not exists news_articles (
  id           uuid primary key default gen_random_uuid(),
  security_id  uuid references securities(id) on delete set null,   -- null = actu macro
  headline     text not null,
  url          text not null unique,
  source       text,
  summary      text,
  image_url    text,
  tickers      text[] not null default '{}',
  sentiment    numeric,             -- -1..1 si dispo, sinon null
  published_at timestamptz not null,
  ingested_at  timestamptz not null default now()
);
create index if not exists news_published_idx on news_articles (published_at desc);
create index if not exists news_security_idx on news_articles (security_id, published_at desc);

-- ============================================================
--  daily_digest — le brief du jour en 5 points
-- ============================================================
create table if not exists daily_digest (
  d            date primary key,
  bullets      jsonb not null,       -- [{ "title": "...", "detail": "..." }, x5]
  generated_by digest_src_t not null,
  created_at   timestamptz not null default now()
);

-- ============================================================
--  watchlist — favoris de l'utilisateur
-- ============================================================
create table if not exists watchlist (
  user_id      uuid not null references auth.users(id) on delete cascade,
  security_id  uuid not null references securities(id) on delete cascade,
  note         text,
  created_at   timestamptz not null default now(),
  primary key (user_id, security_id)
);

-- ============================================================
--  Vue pratique : tout ce qu'il faut pour l'onglet Growth
-- ============================================================
create or replace view growth_feed as
select
  s.id,
  s.symbol_yahoo,
  s.name,
  s.exchange,
  s.region,
  s.currency,
  s.sector,
  s.market_cap,
  s.index_membership,
  q.price,
  q.change_pct_day,
  q.as_of              as price_as_of,
  pt.target_mean,
  pt.target_high,
  pt.target_low,
  pt.num_analysts,
  pt.recommendation_mean,
  pt.recommendation_key,
  pt.as_of             as target_as_of,
  gs.upside_pct,
  gs.confidence,
  gs.momentum,
  gs.score,
  gs.computed_at
from securities s
join quotes q         on q.security_id  = s.id
join price_targets pt on pt.security_id = s.id
join growth_scores gs on gs.security_id = s.id
where s.active
  and pt.target_mean is not null;

-- ============================================================
--  RLS
-- ============================================================
alter table securities        enable row level security;
alter table quotes            enable row level security;
alter table price_history     enable row level security;
alter table price_targets     enable row level security;
alter table target_revisions  enable row level security;
alter table growth_scores     enable row level security;
alter table news_articles     enable row level security;
alter table daily_digest      enable row level security;
alter table watchlist         enable row level security;

-- Données marché : lecture publique (anon + authenticated). Aucune écriture via API publique.
do $$
declare t text;
begin
  foreach t in array array[
    'securities','quotes','price_history','price_targets',
    'target_revisions','growth_scores','news_articles','daily_digest'
  ]
  loop
    execute format(
      'drop policy if exists "public_read" on %I; '
      'create policy "public_read" on %I for select using (true);', t, t);
  end loop;
end $$;

-- Favoris : uniquement l'utilisateur propriétaire ET l'email autorisé.
drop policy if exists "own_watchlist_select" on watchlist;
create policy "own_watchlist_select" on watchlist for select
  using (user_id = auth.uid()
         and auth.jwt() ->> 'email' = 'jecontactejerome@gmail.com');

drop policy if exists "own_watchlist_write" on watchlist;
create policy "own_watchlist_write" on watchlist for all
  using (user_id = auth.uid()
         and auth.jwt() ->> 'email' = 'jecontactejerome@gmail.com')
  with check (user_id = auth.uid()
              and auth.jwt() ->> 'email' = 'jecontactejerome@gmail.com');

-- L'ingestion utilise la clé service_role, qui contourne la RLS : rien à ajouter.
