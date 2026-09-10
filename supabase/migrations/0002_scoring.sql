-- ============================================================
--  Upside — fonction de recalcul du score Growth
--  Appelée par ingest/score.mjs via  db.rpc('recompute_growth_scores')
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
      -- objectif moyen le plus proche de "il y a 30 jours"
      (
        select tr.target_mean
        from target_revisions tr
        where tr.security_id = s.id
          and tr.captured_at <= now() - interval '25 days'
        order by tr.captured_at desc
        limit 1
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
  )
  insert into growth_scores
    (security_id, upside_pct, confidence, momentum, rating_factor, score, computed_at)
  select
    security_id,
    upside_pct,
    confidence,
    momentum,
    rating_factor,
    upside_pct * (0.4 + 0.6 * confidence) * (1 + momentum) * rating_factor as score,
    now()
  from calc
  on conflict (security_id) do update set
    upside_pct    = excluded.upside_pct,
    confidence    = excluded.confidence,
    momentum      = excluded.momentum,
    rating_factor = excluded.rating_factor,
    score         = excluded.score,
    computed_at   = excluded.computed_at;

  select count(*)::int from calc;
$$;

-- ============================================================
--  Purge des vieux articles (> 60 j). Appelée par ingest/news.mjs.
-- ============================================================
create or replace function prune_old_news()
returns integer
language sql
security definer
as $$
  with del as (
    delete from news_articles
    where published_at < now() - interval '60 days'
    returning 1
  )
  select count(*)::int from del;
$$;
