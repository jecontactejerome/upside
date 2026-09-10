// Génère ingest/data/sp500.json et complète ingest/data/stoxx600.json.
//
// S&P 500  : liste publique (datasets/s-and-p-500-companies sur GitHub).
// STOXX 600: pas de CSV canonique gratuit. On part d'une base curatée
//            (ingest/data/stoxx600.seed.json) que l'on peut étoffer à la main.
//
// Usage : node scripts/build-universe.mjs
import { writeFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const DATA = resolve(import.meta.dirname, '../ingest/data');
const SP500_CSV =
  'https://raw.githubusercontent.com/datasets/s-and-p-500-companies/main/data/constituents.csv';

function parseCsvLine(l) {
  const out = [];
  let cur = '', q = false;
  for (let i = 0; i < l.length; i++) {
    const c = l[i];
    if (c === '"') q = !q;
    else if (c === ',' && !q) { out.push(cur); cur = ''; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

async function buildSp500() {
  const txt = await (await fetch(SP500_CSV)).text();
  const rows = txt.trim().split('\n').slice(1).map(parseCsvLine).map((cols) => {
    const [symbol, name, sector] = cols;
    const y = symbol.replace(/\./g, '-'); // BRK.B -> BRK-B (convention Yahoo)
    return {
      symbol_yahoo: y,
      symbol_finnhub: y,
      isin: null,
      name,
      exchange: 'US',
      mic: null,
      country: 'US',
      region: 'US',
      currency: 'USD',
      sector: sector || null,
      index_membership: ['SP500'],
    };
  });
  writeFileSync(`${DATA}/sp500.json`, JSON.stringify(rows, null, 2) + '\n');
  console.log(`sp500.json : ${rows.length} valeurs`);
}

function buildStoxx() {
  // Le fichier seed est maintenu à la main (voir README ingest).
  const seed = JSON.parse(readFileSync(`${DATA}/stoxx600.seed.json`, 'utf8'));
  writeFileSync(`${DATA}/stoxx600.json`, JSON.stringify(seed, null, 2) + '\n');
  console.log(`stoxx600.json : ${seed.length} valeurs (seed curaté)`);
}

await buildSp500();
buildStoxx();
