-- ============================================================
--  Upside — rétention de l'historique de cours
--  Univers élargi (~5 000 valeurs) → on limite price_history à 120 jours
--  pour tenir dans le quota Supabase gratuit (500 Mo).
--  Appelée 1×/jour par ingest/quotes.mjs.
-- ============================================================
create or replace function prune_old_history()
returns integer
language sql
security definer
as $$
  with del as (
    delete from price_history
    where d < (current_date - 120)
    returning 1
  )
  select count(*)::int from del;
$$;
