// Finnhub — tier gratuit (60 req/min). Sert de repli pour la note consensus
// et de source d'articles (endpoint company-news, gratuit).
import { FINNHUB_API_KEY } from './env.mjs';

const BASE = 'https://finnhub.io/api/v1';

async function fh(path, params = {}) {
  if (!FINNHUB_API_KEY) return null;
  const qs = new URLSearchParams({ ...params, token: FINNHUB_API_KEY });
  const res = await fetch(`${BASE}${path}?${qs}`);
  if (res.status === 429) {
    console.warn('  finnhub 429 (rate limit) — on patiente 2 s');
    await new Promise((r) => setTimeout(r, 2000));
    return fh(path, params);
  }
  if (!res.ok) {
    console.warn(`  finnhub ${path} → HTTP ${res.status}`);
    return null;
  }
  return res.json();
}

// Tendance des recommandations : [{buy, hold, sell, strongBuy, strongSell, period}, ...]
// On en dérive un recommendation_mean 1..5 comparable à Yahoo.
export async function recommendationMean(symbol) {
  const rows = await fh('/stock/recommendation', { symbol });
  if (!Array.isArray(rows) || rows.length === 0) return null;
  const r = rows[0]; // le plus récent
  const total = (r.strongBuy || 0) + (r.buy || 0) + (r.hold || 0) + (r.sell || 0) + (r.strongSell || 0);
  if (!total) return null;
  const weighted =
    1 * (r.strongBuy || 0) +
    2 * (r.buy || 0) +
    3 * (r.hold || 0) +
    4 * (r.sell || 0) +
    5 * (r.strongSell || 0);
  return { recommendation_mean: weighted / total, num_analysts: total };
}

// Articles liés à une valeur sur les N derniers jours.
export async function companyNews(symbol, days = 3) {
  const to = new Date();
  const from = new Date(to.getTime() - days * 864e5);
  const fmt = (d) => d.toISOString().slice(0, 10);
  const rows = await fh('/company-news', { symbol, from: fmt(from), to: fmt(to) });
  if (!Array.isArray(rows)) return [];
  return rows
    .filter((a) => a.headline && a.url)
    .map((a) => ({
      headline: a.headline,
      url: a.url,
      source: a.source || 'Finnhub',
      summary: a.summary || null,
      image_url: a.image || null,
      published_at: new Date((a.datetime || 0) * 1000).toISOString(),
      tickers: [symbol],
    }));
}
