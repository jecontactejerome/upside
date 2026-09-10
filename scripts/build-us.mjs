// Construit ingest/data/us.json à partir des listes publiques NASDAQ + NYSE + AMEX
// (dépôt GitHub rreichel3/US-Stock-Symbols, mis à jour en continu, sans clé).
// Filtre : actions ordinaires, capitalisation > seuil, hors ETF/fonds/SPAC vides.
//
// Usage : node scripts/build-us.mjs
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const DATA = resolve(import.meta.dirname, '../ingest/data');
const MIN_MARKET_CAP = 100_000_000; // 100 M$

const SOURCES = {
  NASDAQ: 'https://raw.githubusercontent.com/rreichel3/US-Stock-Symbols/main/nasdaq/nasdaq_full_tickers.json',
  NYSE: 'https://raw.githubusercontent.com/rreichel3/US-Stock-Symbols/main/nyse/nyse_full_tickers.json',
  AMEX: 'https://raw.githubusercontent.com/rreichel3/US-Stock-Symbols/main/amex/amex_full_tickers.json',
};

const EXCLUDE_NAME = /\b(ETF|ETN|Fund|Trust|Acquisition Corp|SPAC|Warrant|Right|Unit|Preferred|Depositary|Notes?|Bond)\b/i;

const rows = [];
const seen = new Set();

for (const [exchange, url] of Object.entries(SOURCES)) {
  const list = await (await fetch(url)).json();
  for (const r of list) {
    const symbol = (r.symbol || '').trim().toUpperCase();
    if (!symbol || seen.has(symbol)) continue;
    // symboles "propres" : lettres, éventuellement un point (BRK.B) ; pas de ^ $ / espace
    if (!/^[A-Z]{1,5}(\.[A-Z])?$/.test(symbol)) continue;
    if (EXCLUDE_NAME.test(r.name || '')) continue;
    const cap = parseFloat(r.marketCap || '0');
    if (!(cap >= MIN_MARKET_CAP)) continue;

    seen.add(symbol);
    rows.push({
      symbol_yahoo: symbol.replace('.', '-'), // BRK.B -> BRK-B
      symbol_finnhub: symbol.replace('.', '-'),
      isin: null,
      name: r.name || symbol,
      exchange,
      mic: null,
      country: 'US',
      region: 'US',
      currency: 'USD',
      sector: r.sector || null,
      market_cap: cap,
      index_membership: ['US'],
    });
  }
}

rows.sort((a, b) => (b.market_cap ?? 0) - (a.market_cap ?? 0));
writeFileSync(`${DATA}/us.json`, JSON.stringify(rows, null, 2) + '\n');
console.log(`us.json : ${rows.length} valeurs (cap > ${(MIN_MARKET_CAP / 1e6).toFixed(0)} M$)`);
