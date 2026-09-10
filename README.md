# Upside

App perso de suivi du **potentiel de croissance boursier**. 3 onglets :

- **Growth** — classe les actions selon l'écart entre leur cours et l'objectif de cours
  moyen des analystes ; tri, filtres, favoris (⭐) à surveiller.
- **Track** — les actions que tu détiens + leur fil d'actualité.
- **News** — le brief de la semaine en 5 points (généré chaque lundi), centré sur les
  actions suivies dans Track (repli sur le marché si aucune position).

- **Univers v1** : S&P 500 (503) + une sélection STOXX Europe 600 (~194). Extensible.
- **Coût de fonctionnement : 0 €** (Vercel Hobby + Supabase Free + GitHub Actions sur repo public + API gratuites).
- **Totalement séparé de « On se voix »** : autre repo, autre projet Supabase, autre hébergement.

```
web/        front Vite + React (PWA installable)      -> Vercel
ingest/     scripts Node de récupération + scoring    -> GitHub Actions (cron)
supabase/   migrations SQL                            -> projet Supabase dédié
scripts/    outils (listes de constituants, icônes)
```

---

## 1. Créer les comptes (à faire une fois)

| Service | Action | Ce qu'on récupère |
|---|---|---|
| **GitHub** | Nouveau repo **public** `upside` sur ton compte perso (⚠️ pas l'org `onsevoix`) | — |
| **Supabase** | [app.supabase.com](https://app.supabase.com) → *New project* « upside », région `eu-west` | `Project URL`, `anon key`, `service_role key` (Settings → API) |
| **Finnhub** | [finnhub.io](https://finnhub.io) → inscription gratuite → *Dashboard* | `API key` |
| **Google AI Studio** | [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey) → *Create API key* | `GEMINI_API_KEY` |
| **Vercel** | [vercel.com](https://vercel.com) → *Add New… → Project* → importe le repo | — |

## 2. Base de données

Dans Supabase → **SQL Editor**, exécuter dans l'ordre :

1. `supabase/migrations/0001_init.sql`
2. `supabase/migrations/0002_scoring.sql`

Puis **Authentication → Providers → Email** : activer, et laisser « Confirm email » tel quel
(OTP à 6 chiffres). L'app est mono-utilisateur ; l'email autorisé pour les favoris est codé
dans la policy RLS `watchlist` (`0001_init.sql`) — change-le si besoin.

## 3. Secrets GitHub

Repo → **Settings → Secrets and variables → Actions → New repository secret** :

| Secret | Valeur |
|---|---|
| `SUPABASE_URL` | `https://xxxx.supabase.co` |
| `SUPABASE_ANON_KEY` | clé `anon` |
| `SUPABASE_SERVICE_KEY` | clé `service_role` |
| `FINNHUB_API_KEY` | clé Finnhub |
| `GEMINI_API_KEY` | clé Gemini |

## 4. Premier remplissage (en local)

```bash
cd ingest
cp ../.env.example .env      # remplir SUPABASE_URL, SUPABASE_SERVICE_KEY, FINNHUB_API_KEY, GEMINI_API_KEY
npm install
npm run universe            # crée ~700 valeurs (valide chaque symbole contre Yahoo)
npm run quotes              # cours
npm run targets             # objectifs analystes
npm run score               # calcule growth_scores
npm run news                # articles des top valeurs
npm run digest              # brief de la semaine (Gemini, sinon règles)
```

Vérifs rapides dans Supabase → *Table editor* : `securities` rempli, `growth_scores.score`
non nul, `weekly_digest` a une ligne.

## 5. Front

```bash
cd web
cp .env.example .env         # VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
npm install
npm run dev                  # http://localhost:5173
```

Sur **Vercel** : *Project Settings* →
- **Root Directory** : `web`
- **Framework preset** : Vite
- **Environment Variables** : `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

Déploiement → URL gratuite `https://upside-xxxx.vercel.app` (renommable sans frais dans
*Project Settings → Domains*). Aucun nom de domaine à acheter. Sur iPhone : Safari →
Partager → **Ajouter à l'écran d'accueil** (icône + plein écran).

## 6. Automatisation

Les workflows dans `.github/workflows/` tournent tout seuls une fois le repo poussé :

| Workflow | Fréquence | Rôle |
|---|---|---|
| `refresh-quotes` | ~20 min | cours + historique quotidien |
| `refresh-targets` | 06h / 18h UTC | objectifs analystes + recalcul du score |
| `refresh-news` | 2 h | articles des 25 meilleures valeurs |
| `weekly-digest` | lundi 06h UTC | brief de la semaine en 5 points (périmètre = actions détenues) |
| `refresh-universe` | 1er du mois | reconstruit la liste des valeurs |
| `keep-alive` | 3 h | évite la mise en pause du projet Supabase |

> GitHub désactive les workflows planifiés après 60 j sans commit sur le repo — un `git push`
> occasionnel suffit à les réarmer. Le timing des crons GitHub est approximatif (±15 min).

---

## Étendre l'univers européen

`ingest/data/stoxx600.seed.json` est une table curatée à la main. Pour s'approcher des 600 :
ajouter des lignes dans `scripts/build-stoxx-seed.mjs` (`[ticker, suffixeYahoo, nom, secteur]`),
relancer `node scripts/build-stoxx-seed.mjs && node scripts/build-universe.mjs && npm run universe`.
Les symboles non résolus par Yahoo sont insérés `active=false` et listés en fin de run.

## Notes

- **Sources gratuites, non contractuelles** : Yahoo Finance (non-officiel, peut casser
  quelques jours), Finnhub (60 req/min), RSS. L'app dégrade proprement (dernier objectif connu).
- **Cours de Londres** en pence (`GBp`).
- Upside **n'est pas un conseil en investissement** — mention affichée en pied de chaque écran.
