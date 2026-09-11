// Fonction serverless Vercel : recherche de tickers par nom d'entreprise via Yahoo,
// pour les valeurs hors univers introuvables par nom dans la base locale
// (ex : "Bastide Confort Medical", "Zalando", "2CRSI"...).
import YahooFinance from 'yahoo-finance2';

const yf = new YahooFinance({
  suppressNotices: ['yahooSurvey'],
  validation: { logErrors: false },
});

export default async function handler(req, res) {
  const q = String(req.query.q || '').trim();
  if (q.length < 2) return res.status(200).json({ results: [] });

  try {
    const r = await yf.search(q, { quotesCount: 8, newsCount: 0 });
    const results = (r.quotes || [])
      .filter((x) => x.symbol && x.quoteType === 'EQUITY')
      .slice(0, 8)
      .map((x) => ({
        symbol: x.symbol,
        name: x.shortname || x.longname || x.symbol,
        exchange: x.exchDisp || x.exchange || '',
      }));
    return res.status(200).json({ results });
  } catch {
    return res.status(200).json({ results: [] });
  }
}
