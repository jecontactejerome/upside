-- ============================================================
--  Upside — critères qualité pour la Sélection (✨) :
--  % d'avis Achat + croissance CA/résultat (proxy "croissance durable")
-- ============================================================
alter table price_targets add column if not exists buy_pct numeric;
alter table price_targets add column if not exists revenue_growth numeric;
alter table price_targets add column if not exists earnings_growth numeric;

drop view if exists growth_feed;
create view growth_feed as
select
  s.id,
  s.symbol_yahoo,
  s.name,
  s.exchange,
  s.region,
  s.currency,
  s.sector,
  s.industry,
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
  pt.buy_pct,
  pt.revenue_growth,
  pt.earnings_growth,
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
