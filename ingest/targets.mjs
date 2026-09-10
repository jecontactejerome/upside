// Rafraîchit `price_targets` (consensus analystes) + archive dans target_revisions.
// Yahoo (financialData) est la source ; Finnhub complète recommendation_mean/num_analysts
// quand Yahoo ne les fournit pas.
//
// Univers volumineux (~5 000) : on traite en TRANCHES pour étaler la charge Yahoo.
//   SHARD_COUNT tranches, SHARD_INDEX = celle traitée par ce run (0..SHARD_COUNT-1).
// Cadence cible : une tranche toutes les ~2 h (les objectifs bougent lentement).
import { db, upsertBatched, selectAll } from './lib/supabase.mjs';
import { targetFor } from './lib/yahoo.mjs';
import { runPool } from './lib/throttle.mjs';

// Repli Finnhub désactivé : /stock/recommendation renvoie 403 sur le tier gratuit,
// et Yahoo fournit déjà recommendation_mean/num_analysts quand il y a un objectif.

const SHARD_COUNT = Math.max(1, parseInt(process.env.SHARD_COUNT || '1', 10));
const SHARD_INDEX = Math.max(0, parseInt(process.env.SHARD_INDEX || '0', 10)) % SHARD_COUNT;

const all = await selectAll(
  'securities',
  'id, symbol_yahoo, symbol_finnhub, currency',
  (q) => q.eq('active', true).order('id', { ascending: true }),
);

const secs = all.filter((_, i) => i % SHARD_COUNT === SHARD_INDEX);
console.log(
  `Objectifs : tranche ${SHARD_INDEX + 1}/${SHARD_COUNT} — ${secs.length} valeurs sur ${all.length}`,
);

const nowIso = new Date().toISOString();

const results = await runPool(
  secs,
  async (s) => {
    const t = await targetFor(s.symbol_yahoo);
    if (!t) return null;
    return {
      security_id: s.id,
      target_mean: t.target_mean,
      target_high: t.target_high,
      target_low: t.target_low,
      target_median: t.target_median,
      num_analysts: t.num_analysts,
      recommendation_mean: t.recommendation_mean,
      recommendation_key: t.recommendation_key,
      currency: t.currency || s.currency,
      as_of: nowIso,
      source: 'yahoo',
    };
  },
  { concurrency: 6, minGapMs: 180 },
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
