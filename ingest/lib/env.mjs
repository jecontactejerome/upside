// Chargement des variables d'environnement.
// En local : lit ingest/.env (ou .env à la racine) sans dépendance externe.
// En CI (GitHub Actions) : les variables sont déjà injectées, on ne fait rien.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function loadDotEnv() {
  // cherche .env dans ingest/ (à côté du dossier lib) puis à la racine du repo
  const here = import.meta.dirname; // .../ingest/lib
  for (const p of [resolve(here, '../.env'), resolve(here, '../../.env')]) {
    try {
      const txt = readFileSync(p, 'utf8');
      for (const line of txt.split('\n')) {
        const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
        if (!m) continue;
        const key = m[1];
        let val = m[2].replace(/^["']|["']$/g, '');
        if (!(key in process.env)) process.env[key] = val;
      }
      return;
    } catch { /* fichier absent : on continue */ }
  }
}
loadDotEnv();

export function need(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`✗ Variable d'environnement manquante : ${name}`);
    process.exit(1);
  }
  return v;
}

export const SUPABASE_URL = need('SUPABASE_URL');
export const SUPABASE_SERVICE_KEY = need('SUPABASE_SERVICE_KEY');
export const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY || '';
export const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
