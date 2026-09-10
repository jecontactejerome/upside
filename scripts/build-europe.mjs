// Construit ingest/data/europe.json via le screener Yahoo (endpoint public).
// Une passe par pays, triée par capitalisation décroissante, obligations exclues.
//
// Usage : node scripts/build-europe.mjs
import { writeFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const DATA = resolve(import.meta.dirname, '../ingest/data');

// noms de sociétés déjà couvertes côté US → on évite les cotations secondaires européennes
const norm = (s) =>
  (s || '')
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ') // (DE), (Class A)…
    .replace(
      /\b(incorporated|inc|corp|corporation|company|co|plc|sa|nv|ag|se|kgaa|group|holdings?|ord|ordinary|inh|akt|namen|st|reg|registered|common|shares?|stock|class|cl|[abc]|adr|ads|sponsored|depositary|receipts?|ltd|limited|the|und|new)\b/g,
      '',
    )
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 16);
let usNames = new Set();
try {
  usNames = new Set(JSON.parse(readFileSync(`${DATA}/us.json`, 'utf8')).map((r) => norm(r.name)));
} catch {
  console.warn('us.json absent — dédoublonnage US ignoré (lance build-us.mjs d’abord)');
}
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36';

const REGIONS = ['fr', 'de', 'gb', 'nl', 'it', 'es', 'ch', 'se', 'dk', 'fi', 'no', 'be', 'pt', 'ie'];
const MIN_MARKET_CAP = 200_000_000; // 200 M$
const MAX_PER_REGION = 500;

// suffixe Yahoo attendu par pays (place principale) + devise plausible
const HOME = {
  fr: { sfx: ['PA'], cur: ['EUR'] },
  de: { sfx: ['DE'], cur: ['EUR'] },
  gb: { sfx: ['L'], cur: ['GBP', 'GBp'] },
  nl: { sfx: ['AS'], cur: ['EUR'] },
  it: { sfx: ['MI'], cur: ['EUR'] },
  es: { sfx: ['MC'], cur: ['EUR'] },
  ch: { sfx: ['SW'], cur: ['CHF'] },
  se: { sfx: ['ST'], cur: ['SEK'] },
  dk: { sfx: ['CO'], cur: ['DKK'] },
  fi: { sfx: ['HE'], cur: ['EUR'] },
  no: { sfx: ['OL'], cur: ['NOK'] },
  be: { sfx: ['BR'], cur: ['EUR'] },
  pt: { sfx: ['LS'], cur: ['EUR'] },
  ie: { sfx: ['IR', 'L'], cur: ['EUR', 'GBP', 'GBp'] },
};

// méga-caps non-européennes fréquemment cotées en secondaire sur les places EU
const NON_EU = /samsung|tencent|alibaba|taiwan semi|\btsmc\b|toyota|\bsony\b|softbank|nintendo|honda|mitsubishi|hitachi|petrochina|sinopec|bank of china|construction bank|agricultural bank|industrial and commercial|\bccb\b|reliance ind|saudi|nvidia|apple inc|alphabet|microsoft|amazon\.com|\bmeta platforms|tesla|berkshire|broadcom|\bnetflix\b|jpmorgan|visa inc|mastercard|johnson & johnson|exxon|chevron|walmart|coca-cola|pepsico|\bmcdonald|\bnike\b|\bpfizer\b|\bmerck & co|eli lilly|abbvie|\bintel\b|\bcisco\b|\boracle\b|\badobe\b|salesforce|qualcomm|\bamd\b|\bibm\b|\bboeing\b|unitedhealth|\bdisney\b|\bpaypal\b|\bshopify\b|\bpalantir\b|\buber\b/i;

// obligations / produits structurés glissés dans les résultats "EQUITY"
const NOT_EQUITY = /\d+[.,]\d+\s*%|%\s*\d{2}[A-Z]{3}|\b(19|20)\d{2}\b|\bBOND\b|\bOBLIG|\bNOTES?\b|\bZC\b|\bETF\b|\bETP\b|\bETN\b/i;

async function yahooAuth() {
  const c = await fetch('https://fc.yahoo.com', { headers: { 'User-Agent': UA }, redirect: 'manual' });
  const cookie = (c.headers.get('set-cookie') || '').split(';')[0];
  const cr = await fetch('https://query1.finance.yahoo.com/v1/test/getcrumb', {
    headers: { 'User-Agent': UA, cookie },
  });
  return { cookie, crumb: await cr.text() };
}

async function screenRegion(region, { cookie, crumb }) {
  const out = [];
  for (let offset = 0; offset < MAX_PER_REGION; offset += 100) {
    const body = {
      size: Math.min(100, MAX_PER_REGION - offset),
      offset,
      sortField: 'intradaymarketcap',
      sortType: 'DESC',
      quoteType: 'EQUITY',
      query: {
        operator: 'AND',
        operands: [
          { operator: 'EQ', operands: ['region', region] },
          { operator: 'GT', operands: ['intradaymarketcap', MIN_MARKET_CAP] },
        ],
      },
      userId: '',
      userIdType: 'guid',
    };
    const r = await fetch(
      'https://query2.finance.yahoo.com/v1/finance/screener?crumb=' + encodeURIComponent(crumb),
      { method: 'POST', headers: { 'User-Agent': UA, cookie, 'content-type': 'application/json' }, body: JSON.stringify(body) },
    );
    if (!r.ok) break;
    const quotes = (await r.json())?.finance?.result?.[0]?.quotes || [];
    if (!quotes.length) break;
    out.push(...quotes);
    await new Promise((res) => setTimeout(res, 400));
  }
  return out;
}

const auth = await yahooAuth();
const rows = [];
const seen = new Set();

for (const region of REGIONS) {
  const quotes = await screenRegion(region, auth);
  const home = HOME[region];
  let kept = 0;
  for (const q of quotes) {
    const sym = q.symbol;
    if (!sym || seen.has(sym)) continue;
    if (q.quoteType && q.quoteType !== 'EQUITY') continue;
    if (/^\d/.test(sym)) continue; // 0R1I.IL etc. = cotations étrangères secondaires
    const parts = sym.split('.');
    const sfx = parts[1] || '';
    if (parts.length !== 2 || !home.sfx.includes(sfx)) continue; // place non principale
    if (q.currency && !home.cur.includes(q.currency)) continue; // devise incohérente = cross-listing
    // base symbole : lettres, éventuellement classe -A/-B/-C/-D ; pas de ligne devise (-SEK…)
    if (!/^[A-Z]{1,6}(-[ABCD])?$/.test(parts[0])) continue;
    const name = q.longName || q.shortName || sym;
    if (NOT_EQUITY.test(name)) continue;
    if (NON_EU.test(name)) continue; // méga-cap non-européenne cotée en secondaire
    if (usNames.has(norm(name))) continue; // société déjà couverte côté US
    seen.add(sym);
    kept++;
    rows.push({
      symbol_yahoo: sym,
      symbol_finnhub: sym,
      isin: null,
      name,
      exchange: q.fullExchangeName || null,
      mic: null,
      country: (q.region || region).toUpperCase(),
      region: 'EU',
      currency: q.currency || 'EUR',
      sector: q.sector || null,
      market_cap: q.marketCap ?? null,
      index_membership: ['EUROPE'],
    });
  }
  console.log(`  ${region}: ${kept}`);
  await new Promise((res) => setTimeout(res, 500));
}

rows.sort((a, b) => (b.market_cap ?? 0) - (a.market_cap ?? 0));

// --- fusion avec la liste curatée (blue/mid chips vérifiés à la main) ---
// La liste curatée prime ; le screener complète pour les valeurs non couvertes.
let curated = [];
try {
  curated = JSON.parse(readFileSync(`${DATA}/stoxx600.seed.json`, 'utf8'));
} catch {
  console.warn('stoxx600.seed.json absent — fusion curatée ignorée');
}

const bySym = new Set();
const byName = new Set();
const out = [];
const push = (r) => {
  const k = norm(r.name);
  if (bySym.has(r.symbol_yahoo) || byName.has(k)) return;
  bySym.add(r.symbol_yahoo);
  byName.add(k);
  out.push(r);
};
curated.forEach(push); // priorité
rows.forEach(push); // complément screener

writeFileSync(`${DATA}/europe.json`, JSON.stringify(out, null, 2) + '\n');
console.log(
  `europe.json : ${out.length} valeurs (${curated.length} curatées + ${out.length - curated.length} du screener)`,
);
