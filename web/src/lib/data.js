import { supabase } from './supabase';
import {
  isDemo,
  DEMO_SECURITIES,
  DEMO_SECTORS,
  DEMO_NEWS,
  DEMO_WEEKLY_DIGEST,
  demoHoldings,
} from './demo';

// ---------- Growth ----------
export const SORTS = {
  upside: { label: 'Upside %', column: 'upside_pct' },
  score: { label: 'Score', column: 'score' },
  momentum: { label: 'Momentum', column: 'momentum' },
  analysts: { label: "Nb d'analystes", column: 'num_analysts' },
  rating: { label: 'Note consensus', column: 'recommendation_mean', ascending: true },
};

export async function fetchGrowth({ sort = 'upside', region = null, sector = null, minAnalysts = 3, hideDownside = true, ids = null } = {}) {
  const s = SORTS[sort] || SORTS.upside;

  if (isDemo()) {
    let rows = DEMO_SECURITIES.slice();
    if (region) rows = rows.filter((r) => r.region === region);
    if (sector) rows = rows.filter((r) => r.sector === sector);
    if (minAnalysts) rows = rows.filter((r) => (r.num_analysts ?? 0) >= minAnalysts);
    if (hideDownside) rows = rows.filter((r) => r.upside_pct > 0);
    if (ids) rows = rows.filter((r) => ids.includes(r.id));
    rows.sort((a, b) => (s.ascending ? a[s.column] - b[s.column] : b[s.column] - a[s.column]));
    return rows;
  }

  let q = supabase.from('growth_feed').select('*');
  if (region) q = q.eq('region', region);
  if (sector) q = q.eq('sector', sector);
  if (minAnalysts) q = q.gte('num_analysts', minAnalysts);
  if (hideDownside) q = q.gt('upside_pct', 0);
  if (ids) q = q.in('id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000']);
  q = q.order(s.column, { ascending: s.ascending ?? false, nullsFirst: false }).limit(300);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function fetchSectors() {
  if (isDemo()) return DEMO_SECTORS;
  const { data } = await supabase.from('securities').select('sector').eq('active', true).not('sector', 'is', null);
  return [...new Set((data ?? []).map((r) => r.sector))].sort();
}

export async function fetchPriceHistory(securityId, days = 90) {
  if (isDemo()) {
    const sec = DEMO_SECURITIES.find((s) => s.id === securityId);
    return (sec?._spark ?? []).map((close, i) => ({ d: i, close }));
  }
  const since = new Date(Date.now() - days * 864e5).toISOString().slice(0, 10);
  const { data } = await supabase
    .from('price_history')
    .select('d, close')
    .eq('security_id', securityId)
    .gte('d', since)
    .order('d', { ascending: true });
  return data ?? [];
}

// ---------- Favoris ----------
let demoFav = new Set();

export async function fetchWatchlist() {
  if (isDemo()) return [...demoFav].map((id) => ({ security_id: id, note: '' }));
  const { data, error } = await supabase.from('watchlist').select('security_id, note');
  if (error) return [];
  return data ?? [];
}

export async function toggleWatch(securityId, on) {
  if (isDemo()) {
    on ? demoFav.add(securityId) : demoFav.delete(securityId);
    return { error: null };
  }
  if (on) {
    return supabase.from('watchlist').insert({ security_id: securityId });
  }
  return supabase.from('watchlist').delete().eq('security_id', securityId);
}

export async function saveNote(securityId, note) {
  if (isDemo()) return { error: null };
  return supabase.from('watchlist').update({ note }).eq('security_id', securityId);
}

// ---------- Track (actions détenues) ----------
export async function fetchHoldings() {
  if (isDemo()) {
    return [...demoHoldings()]
      .map((id) => DEMO_SECURITIES.find((s) => s.id === id))
      .filter(Boolean);
  }
  const { data, error } = await supabase
    .from('holdings')
    .select('security_id, created_at, securities(id, name, symbol_yahoo, exchange, region, currency, sector)')
    .order('created_at', { ascending: false });
  if (error) return [];
  return (data ?? []).map((r) => ({ ...r.securities, added_at: r.created_at }));
}

export async function searchSecurities(query, limit = 8) {
  const q = query.trim();
  if (q.length < 2) return [];
  if (isDemo()) {
    const low = q.toLowerCase();
    return DEMO_SECURITIES.filter(
      (s) => s.name.toLowerCase().includes(low) || s.symbol_yahoo.toLowerCase().includes(low),
    ).slice(0, limit);
  }
  const { data } = await supabase
    .from('securities')
    .select('id, name, symbol_yahoo, exchange, region, currency, sector')
    .eq('active', true)
    .or(`name.ilike.%${q}%,symbol_yahoo.ilike.%${q}%`)
    .limit(limit);
  return data ?? [];
}

export async function addHolding(securityId) {
  if (isDemo()) {
    demoHoldings().add(securityId);
    return { error: null };
  }
  return supabase.from('holdings').insert({ security_id: securityId });
}

export async function removeHolding(securityId) {
  if (isDemo()) {
    demoHoldings().delete(securityId);
    return { error: null };
  }
  return supabase.from('holdings').delete().eq('security_id', securityId);
}

// Ajoute une action par ticker Yahoo (hors univers d'indices) via la fonction serverless.
export async function addTickerViaApi(symbol) {
  const res = await fetch('/api/add-ticker', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ symbol }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || 'Échec de l’ajout');
  return json.security;
}

export async function fetchHoldingsNews(limit = 60) {
  if (isDemo()) {
    const ids = new Set([...demoHoldings()]);
    return DEMO_NEWS.filter((n) => ids.has(n.security_id)).slice(0, limit);
  }
  const holds = await fetchHoldings();
  const ids = holds.map((h) => h.id);
  if (!ids.length) return [];
  const { data, error } = await supabase
    .from('news_articles')
    .select('id, headline, url, source, image_url, published_at, security_id, securities(name, symbol_yahoo)')
    .in('security_id', ids)
    .order('published_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

// ---------- News (brief de la semaine) ----------
export async function fetchWeeklyDigest() {
  if (isDemo()) return DEMO_WEEKLY_DIGEST;
  const { data } = await supabase
    .from('weekly_digest')
    .select('*')
    .order('week_start', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ?? null;
}

export async function fetchNewsForSecurity(securityId, limit = 5) {
  if (isDemo()) return DEMO_NEWS.filter((n) => n.security_id === securityId).slice(0, limit);
  const { data } = await supabase
    .from('news_articles')
    .select('id, headline, url, source, published_at')
    .eq('security_id', securityId)
    .order('published_at', { ascending: false })
    .limit(limit);
  return data ?? [];
}
