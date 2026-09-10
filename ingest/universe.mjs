// Construit / met à jour la table `securities` à partir des fichiers
//   ingest/data/us.json  +  ingest/data/europe.json
// Chaque symbole est validé contre Yahoo : ceux qui ne renvoient pas de
// cotation sont insérés avec active=false.
//
// À lancer ponctuellement (création initiale) puis ~1×/mois après
// reconstruction des listes (build-us.mjs / build-europe.mjs).
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { db, upsertBatched } from './lib/supabase.mjs';
import { quoteMany } from './lib/yahoo.mjs';
import { chunk, sleep } from './lib/throttle.mjs';

function load(name) {
  // relatif au fichier, pas au cwd : marche depuis ingest/ comme depuis la racine
  const p = resolve(import.meta.dirname, 'data', name);
  return JSON.parse(readFileSync(p, 'utf8'));
}

const rows = [...load('us.json'), ...load('europe.json')];
// dédoublonnage par symbol_yahoo (au cas où une valeur serait dans 2 listes)
const bySym = new Map();
for (const r of rows) {
  const cur = bySym.get(r.symbol_yahoo);
  if (cur) {
    cur.index_membership = [...new Set([...cur.index_membership, ...r.index_membership])];
  } else {
    bySym.set(r.symbol_yahoo, { ...r });
  }
}
const universe = [...bySym.values()];
console.log(`Univers : ${universe.length} valeurs à valider`);

// --- validation Yahoo par lots ---
const valid = new Set();
const priceBySym = new Map();
for (const part of chunk(universe.map((u) => u.symbol_yahoo), 50)) {
  const quotes = await quoteMany(part);
  for (const q of quotes) {
    if (q?.symbol && (q.regularMarketPrice != null || q.postMarketPrice != null)) {
      valid.add(q.symbol);
      priceBySym.set(q.symbol, {
        currency: q.currency || null,
        marketCap: q.marketCap ?? null,
        exchange: q.fullExchangeName || null,
      });
    }
  }
  await sleep(300);
}

const now = new Date().toISOString();
const toUpsert = universe.map((u) => {
  const px = priceBySym.get(u.symbol_yahoo);
  return {
    symbol_yahoo: u.symbol_yahoo,
    symbol_finnhub: u.symbol_finnhub || u.symbol_yahoo,
    isin: u.isin || null,
    name: u.name,
    exchange: px?.exchange || u.exchange || null,
    mic: u.mic || null,
    country: u.country || null,
    region: u.region,
    currency: px?.currency || u.currency || 'USD',
    sector: u.sector || null,
    market_cap: px?.marketCap ?? null,
    index_membership: u.index_membership,
    active: valid.has(u.symbol_yahoo),
    updated_at: now,
  };
});

const n = await upsertBatched('securities', toUpsert, { onConflict: 'symbol_yahoo' });
const invalid = universe.filter((u) => !valid.has(u.symbol_yahoo)).map((u) => u.symbol_yahoo);

console.log(`✓ ${n} valeurs écrites — ${valid.size} actives, ${invalid.length} inactives`);
if (invalid.length) {
  console.log('  Symboles non résolus par Yahoo (active=false) :');
  console.log('   ' + invalid.join(', '));
}

// coupe la connexion realtime éventuelle
await db.auth.stopAutoRefresh?.();
process.exit(0);
