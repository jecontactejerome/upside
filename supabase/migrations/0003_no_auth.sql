-- ============================================================
--  Upside — passage en mono-utilisateur sans authentification
--  Track (holdings) et Favoris (watchlist) deviennent des listes
--  uniques, lisibles ET modifiables avec la clé publique.
--  (App perso, données non confidentielles, URL non publique.)
-- ============================================================

-- Les tables étaient vides (aucun login n'a jamais abouti) : on recrée propre.
drop table if exists holdings;
drop table if exists watchlist;

-- ---------- holdings : actions détenues (onglet Track) ----------
create table holdings (
  security_id  uuid primary key references securities(id) on delete cascade,
  created_at   timestamptz not null default now()
);

-- ---------- watchlist : favoris "à surveiller" (onglet Growth) ----------
create table watchlist (
  security_id  uuid primary key references securities(id) on delete cascade,
  note         text,
  created_at   timestamptz not null default now()
);

alter table holdings  enable row level security;
alter table watchlist enable row level security;

-- lecture + écriture ouvertes (clé publique). Pas de données sensibles.
drop policy if exists "anon_all" on holdings;
create policy "anon_all" on holdings for all using (true) with check (true);

drop policy if exists "anon_all" on watchlist;
create policy "anon_all" on watchlist for all using (true) with check (true);
