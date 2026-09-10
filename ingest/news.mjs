// Alimente `news_articles` pour :
//   - les valeurs les plus "bankable" (top N par growth_scores.score) -> brief hebdo
//   - toutes les actions détenues (table holdings)                    -> onglet Track
// Sources : Finnhub company-news + RSS Yahoo. Cadence cible : toutes les 2 h.
import { db, upsertBatched } from './lib/supabase.mjs';
import { companyNews } from './lib/finnhub.mjs';
import { rssUrlFor } from './lib/yahoo.mjs';
import { runPool } from './lib/throttle.mjs';

const TOP_N = 25;

const { data: topScores, error } = await db
  .from('growth_scores')
  .select('security_id, securities!inner(symbol_yahoo, symbol_finnhub)')
  .order('score', { ascending: false })
  .limit(TOP_N);
if (error) throw error;

const { data: held } = await db
  .from('holdings')
  .select('security_id, securities!inner(symbol_yahoo, symbol_finnhub)');

// union top score + actions détenues, dédoublonné par security_id
const bySecId = new Map();
for (const r of [...(topScores || []), ...(held || [])]) {
  if (!bySecId.has(r.security_id)) bySecId.set(r.security_id, r);
}
const top = [...bySecId.values()];
console.log(`News : ${top.length} valeurs (top ${topScores?.length || 0} + ${held?.length || 0} détenues)`);

// --- RSS minimal (pas de dépendance XML) ---
async function rssItems(symbol) {
  try {
    const xml = await (await fetch(rssUrlFor(symbol))).text();
    const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)];
    return items.slice(0, 10).map((m) => {
      const block = m[1];
      const pick = (tag) => {
        const r = block.match(new RegExp(`<${tag}>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`));
        return r ? r[1].trim() : null;
      };
      return {
        headline: pick('title'),
        url: pick('link'),
        source: 'Yahoo Finance',
        summary: pick('description'),
        image_url: null,
        published_at: pick('pubDate') ? new Date(pick('pubDate')).toISOString() : new Date().toISOString(),
        tickers: [symbol],
      };
    }).filter((a) => a.headline && a.url);
  } catch (err) {
    console.warn(`  RSS ${symbol}: ${err.message}`);
    return [];
  }
}

const idBySym = new Map(top.map((t) => [t.securities.symbol_yahoo, t.security_id]));

const perSec = await runPool(
  top,
  async (t) => {
    const sym = t.securities.symbol_yahoo;
    const fh = t.securities.symbol_finnhub
      ? await companyNews(t.securities.symbol_finnhub, 3)
      : [];
    const rss = await rssItems(sym);
    return [...fh, ...rss].map((a) => ({ ...a, __sym: sym }));
  },
  { concurrency: 4, minGapMs: 400 },
);

// aplatit + dédoublonne par URL
const seen = new Set();
const rows = [];
for (const list of perSec) {
  if (!Array.isArray(list)) continue;
  for (const a of list) {
    if (!a.url || seen.has(a.url)) continue;
    seen.add(a.url);
    rows.push({
      security_id: idBySym.get(a.__sym) ?? null,
      headline: a.headline.slice(0, 400),
      url: a.url,
      source: a.source,
      summary: a.summary ? a.summary.replace(/<[^>]+>/g, '').slice(0, 800) : null,
      image_url: a.image_url,
      tickers: a.tickers || [],
      published_at: a.published_at,
    });
  }
}

const n = await upsertBatched('news_articles', rows, { onConflict: 'url' });
const { data: pruned } = await db.rpc('prune_old_news');
console.log(`✓ news_articles: ${n} lignes upsert — ${pruned ?? 0} anciens articles purgés`);
process.exit(0);
