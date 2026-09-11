// Alimente `news_articles` pour :
//   - les valeurs les plus "bankable" (top N par growth_scores.score) -> brief hebdo
//   - toutes les actions détenues (table holdings)                    -> onglet News
// Sources : Finnhub company-news + RSS Yahoo. Cadence cible : toutes les 2 h.
// L'onglet News n'affiche qu'un article "vedette" par action et par jour (le plus
// récent), traduit en français via Gemini — moins de bruit, plus lisible.
import { db, upsertBatched } from './lib/supabase.mjs';
import { companyNews } from './lib/finnhub.mjs';
import { rssUrlFor } from './lib/yahoo.mjs';
import { runPool } from './lib/throttle.mjs';
import { GEMINI_API_KEY } from './lib/env.mjs';

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

// aplatit + dédoublonne par URL ET par titre normalisé (syndications multiples)
const seenUrl = new Set();
const seenTitle = new Set();
const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().slice(0, 120);
const rows = [];
for (const list of perSec) {
  if (!Array.isArray(list)) continue;
  for (const a of list) {
    if (!a.url || !a.headline) continue;
    const tkey = norm(a.headline);
    if (seenUrl.has(a.url) || seenTitle.has(tkey)) continue;
    seenUrl.add(a.url);
    seenTitle.add(tkey);
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

// --- élit l'article "vedette" du jour par action (le plus récent) ---
const byDay = new Map(); // `${security_id}|${jour}` -> ligne la plus récente
for (const r of rows) {
  if (!r.security_id) continue;
  const day = (r.published_at || '').slice(0, 10);
  const k = `${r.security_id}|${day}`;
  const cur = byDay.get(k);
  if (!cur || r.published_at > cur.published_at) byDay.set(k, r);
}

const toFeature = [];
for (const [k, cand] of byDay) {
  const [securityId, day] = k.split('|');
  const { data: existing } = await db
    .from('news_articles')
    .select('id, published_at')
    .eq('security_id', securityId)
    .eq('featured', true)
    .gte('published_at', `${day}T00:00:00Z`)
    .lt('published_at', `${day}T23:59:59.999Z`)
    .maybeSingle();
  if (existing && existing.published_at >= cand.published_at) continue; // déjà à jour
  if (existing) await db.from('news_articles').update({ featured: false }).eq('id', existing.id);
  toFeature.push(cand);
}

if (toFeature.length) {
  const translated = await translateHeadlines(toFeature.map((f) => f.headline));
  toFeature.forEach((f, i) => {
    f.featured = true;
    f.headline_fr = translated?.[i] || f.headline;
  });
}

const n = await upsertBatched('news_articles', rows, { onConflict: 'url' });
const { data: pruned } = await db.rpc('prune_old_news');
console.log(
  `✓ news_articles: ${n} lignes upsert — ${toFeature.length} vedettes du jour — ${pruned ?? 0} anciens articles purgés`,
);
process.exit(0);

// ============================================================
async function translateHeadlines(headlines) {
  if (!GEMINI_API_KEY || !headlines.length) return null;
  const model = 'gemini-flash-lite-latest';
  const prompt = [
    "Traduis ces titres d'articles financiers en français, de façon concise et naturelle",
    '(pas de traduction mot à mot). Réponds UNIQUEMENT par un tableau JSON de chaînes,',
    'exactement dans le même ordre et la même longueur que la liste fournie.',
    '',
    JSON.stringify(headlines),
  ].join('\n');
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2, responseMimeType: 'application/json' },
        }),
      },
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const txt = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const arr = JSON.parse(txt);
    if (!Array.isArray(arr) || arr.length !== headlines.length) return null;
    return arr.map((s) => String(s || '').slice(0, 400));
  } catch (err) {
    console.warn(`  traduction Gemini: ${err.message}`);
    return null;
  }
}
