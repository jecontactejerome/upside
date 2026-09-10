// Wrapper yahoo-finance2 (v4). Source non-officielle : on log les erreurs
// mais on ne casse jamais tout le run pour une valeur manquante.
import YahooFinance from 'yahoo-finance2';

const yf = new YahooFinance({
  suppressNotices: ['yahooSurvey'],
  validation: { logErrors: false },
});

export async function quoteMany(symbols) {
  try {
    const res = await yf.quote(symbols);
    return Array.isArray(res) ? res : [res];
  } catch (err) {
    console.warn(`  yahoo.quote lot en échec (${symbols.length} symboles): ${err.message}`);
    return [];
  }
}

export async function targetFor(symbol) {
  try {
    const s = await yf.quoteSummary(symbol, {
      modules: ['financialData', 'recommendationTrend', 'price'],
    });
    const fd = s.financialData || {};
    const px = s.price || {};
    return {
      target_mean: num(fd.targetMeanPrice),
      target_high: num(fd.targetHighPrice),
      target_low: num(fd.targetLowPrice),
      target_median: num(fd.targetMedianPrice),
      num_analysts: int(fd.numberOfAnalystOpinions),
      recommendation_mean: num(fd.recommendationMean),
      recommendation_key: fd.recommendationKey || null,
      currency: fd.financialCurrency || px.currency || null,
    };
  } catch (err) {
    console.warn(`  yahoo.quoteSummary ${symbol}: ${err.message}`);
    return null;
  }
}

// Flux RSS Yahoo Finance par ticker (titres d'actu, gratuit, illimité).
export function rssUrlFor(symbol) {
  return `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${encodeURIComponent(symbol)}&region=US&lang=en-US`;
}

const num = (v) => (typeof v === 'number' && isFinite(v) ? v : (v?.raw ?? null));
const int = (v) => {
  const n = num(v);
  return n == null ? null : Math.round(n);
};
