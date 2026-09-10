// Fonction serverless Vercel : ajoute une action par son ticker Yahoo,
// même si elle n'est pas dans l'univers d'indices.
//  - résout le symbole via Yahoo Finance
//  - crée la ligne dans `securities` (active=true) si besoin
//  - enregistre une cotation immédiate
//  - ajoute la valeur à `holdings`
// Les tâches planifiées (cours, objectifs, news) la prennent ensuite en compte
// automatiquement puisqu'elles balaient toutes les securities actives.
import YahooFinance from 'yahoo-finance2';
import { createClient } from '@supabase/supabase-js';

const yf = new YahooFinance({
  suppressNotices: ['yahooSurvey'],
  validation: { logErrors: false },
});

const EU_CURRENCIES = ['EUR', 'GBP', 'GBp', 'CHF', 'SEK', 'DKK', 'NOK', 'ISK', 'PLN', 'CZK'];

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée' });

  const raw = (req.body && req.body.symbol) || '';
  const symbol = String(raw).trim().toUpperCase();
  if (!symbol || symbol.length > 20 || /\s/.test(symbol)) {
    return res.status(400).json({ error: 'Ticker invalide' });
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return res.status(500).json({ error: 'Config serveur manquante' });
  const db = createClient(url, key, { auth: { persistSession: false } });

  // déjà connue ?
  const found = await db
    .from('securities')
    .select('id, name, symbol_yahoo, exchange, region, currency, sector')
    .eq('symbol_yahoo', symbol)
    .maybeSingle();

  let sec = found.data;

  if (!sec) {
    let q;
    try {
      q = await yf.quote(symbol);
    } catch {
      q = null;
    }
    const price = q && (q.regularMarketPrice ?? q.postMarketPrice);
    if (!q || price == null) {
      return res.status(404).json({ error: `« ${symbol} » introuvable sur Yahoo Finance` });
    }

    const currency = q.currency || 'USD';
    const region = EU_CURRENCIES.includes(currency)
      ? 'EU'
      : currency === 'USD'
        ? 'US'
        : 'OTHER';

    const upserted = await db
      .from('securities')
      .upsert(
        {
          symbol_yahoo: symbol,
          symbol_finnhub: symbol,
          name: q.longName || q.shortName || symbol,
          exchange: q.fullExchangeName || null,
          region,
          currency,
          index_membership: [],
          active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'symbol_yahoo' },
      )
      .select('id, name, symbol_yahoo, exchange, region, currency, sector')
      .single();

    if (upserted.error) return res.status(500).json({ error: upserted.error.message });
    sec = upserted.data;

    // cotation immédiate (best effort, sans bloquer)
    await db.from('quotes').upsert(
      {
        security_id: sec.id,
        price,
        currency,
        change_pct_day: q.regularMarketChangePercent ?? null,
        as_of: new Date().toISOString(),
        source: 'yahoo',
      },
      { onConflict: 'security_id' },
    );
  }

  const added = await db.from('holdings').upsert({ security_id: sec.id }, { onConflict: 'security_id' });
  if (added.error) return res.status(500).json({ error: added.error.message });

  return res.status(200).json({ security: sec });
}
