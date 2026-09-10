-- ============================================================
--  Upside — sous-secteur (industry) pour l'étiquette sur les cartes Growth
-- ============================================================
alter table securities add column if not exists industry text;

-- La vue Growth doit exposer sector + industry.
-- (drop obligatoire : create-or-replace ne sait pas réordonner les colonnes)
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
--  Momentum : comparer à ~30 j, ou à la plus ancienne révision connue
--  tant que l'historique n'a pas 25 jours (l'app est récente).
-- ============================================================
create or replace function recompute_growth_scores()
returns integer
language sql
security definer
as $$
  with base as (
    select
      s.id as security_id,
      q.price,
      pt.target_mean,
      pt.num_analysts,
      pt.recommendation_mean,
      coalesce(
        (select tr.target_mean from target_revisions tr
         where tr.security_id = s.id and tr.captured_at <= now() - interval '25 days'
         order by tr.captured_at desc limit 1),
        (select tr.target_mean from target_revisions tr
         where tr.security_id = s.id and tr.captured_at <= now() - interval '2 days'
         order by tr.captured_at asc limit 1)
      ) as target_30d
    from securities s
    join quotes q         on q.security_id  = s.id
    join price_targets pt on pt.security_id = s.id
    where s.active and pt.target_mean is not null and q.price > 0
  ),
  calc as (
    select
      security_id,
      (target_mean - price) / price as upside_pct,
      least(1.0, greatest(0.0, coalesce(num_analysts, 0) / 15.0)) as confidence,
      case
        when target_30d is null or target_30d = 0 then 0
        else greatest(-0.5, least(0.5, (target_mean - target_30d) / target_30d))
      end as momentum,
      case
        when recommendation_mean is null then 1.0
        else greatest(0.6, least(1.2, 1.2 - (recommendation_mean - 1) * 0.15))
      end as rating_factor
    from base
  ),
  upserted as (
    insert into growth_scores
      (security_id, upside_pct, confidence, momentum, rating_factor, score, computed_at)
    select
      security_id, upside_pct, confidence, momentum, rating_factor,
      upside_pct * (0.4 + 0.6 * confidence) * (1 + momentum) * rating_factor,
      now()
    from calc
    on conflict (security_id) do update set
      upside_pct = excluded.upside_pct, confidence = excluded.confidence,
      momentum = excluded.momentum, rating_factor = excluded.rating_factor,
      score = excluded.score, computed_at = excluded.computed_at
    returning 1
  )
  select count(*)::int from upserted;
$$;
