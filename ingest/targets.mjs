// Rafraîchit `price_targets` (consensus analystes) + archive dans target_revisions.
// Yahoo (financialData) est la source ; Finnhub complète recommendation_mean/num_analysts
// quand Yahoo ne les fournit pas.
// Cadence cible : 06h et 18h UTC (les objectifs bougent lentement).
import { db, upsertBatched } from './lib/supabase.mjs';
import { targetFor } from './lib/yahoo.mjs';
import { recommendationMean } from './lib/finnhub.mjs';
import { runPool } from './lib/throttle.mjs';

const { data: secs, error } = await db
  .from('securities')
  .select('id, symbol_yahoo, symbol_finnhub, currency')
  .eq('active', true);
if (error) throw error;
console.log(`Objectifs : ${secs.length} valeurs`);

const nowIso = new Date().toISOString();

const results = await runPool(
  secs,
  async (s) => {
    const t = await targetFor(s.symbol_yahoo);
    if (!t) return null;

    let recMean = t.recommendation_mean;
    let nAnalysts = t.num_analysts;
    if ((recMean == null || nAnalysts == null) && s.symbol_finnhub) {
      const fh = await recommendationMean(s.symbol_finnhub);
      if (fh) {
        recMean = recMean ?? fh.recommendation_mean;
        nAnalysts = nAnalysts ?? fh.num_analysts;
      }
    }

    return {
      security_id: s.id,
      target_mean: t.target_mean,
      target_high: t.target_high,
      target_low: t.target_low,
      target_median: t.target_median,
      num_analysts: nAnalysts,
      recommendation_mean: recMean,
      recommendation_key: t.recommendation_key,
      currency: t.currency || s.currency,
      as_of: nowIso,
      source: 'yahoo',
    };
  },
  { concurrency: 5, minGapMs: 280 },
);

const targetRows = results.filter((r) => r && !r.__error && r.target_mean != null);
const revisionRows = targetRows.map((r) => ({
  security_id: r.security_id,
  captured_at: nowIso,
  target_mean: r.target_mean,
  num_analysts: r.num_analysts,
}));

const nT = await upsertBatched('price_targets', targetRows, { onConflict: 'security_id' });
const nR = await upsertBatched('target_revisions', revisionRows, {
  onConflict: 'security_id,captured_at',
});

const failed = results.filter((r) => r?.__error).length;
const noTarget = results.filter((r) => r && !r.__error && r.target_mean == null).length;
console.log(
  `✓ price_targets: ${nT} — revisions: ${nR} — sans objectif: ${noTarget} — erreurs: ${failed}`,
);
process.exit(0);
