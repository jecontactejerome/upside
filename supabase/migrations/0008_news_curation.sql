-- ============================================================
--  Upside — onglet News : 1 article "vedette" par action et par jour,
--  titre traduit en français (headline garde l'original + l'URL source).
-- ============================================================
alter table news_articles add column if not exists featured boolean not null default false;
alter table news_articles add column if not exists headline_fr text;

create index if not exists news_articles_featured_idx
  on news_articles (security_id, published_at desc)
  where featured;
