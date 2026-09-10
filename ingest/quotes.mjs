// Rafraîchit `quotes` (dernier prix) pour toutes les valeurs actives.
// 1re exécution de la journée (UTC) : archive aussi la clôture dans price_history.
// Cadence cible : toutes les 20 min (GitHub Actions).
import { db, upsertBatched, selectAll } from './lib/supabase.mjs';
import { quoteMany } from './lib/yahoo.mjs';
import { chunk, sleep } from './lib/throttle.mjs';

const secs = await selectAll('securities', 'id, symbol_yahoo', (q) => q.eq('active', true));

const idBySym = new Map(secs.map((s) => [s.symbol_yahoo, s.id]));
const symbols = [...idBySym.keys()];
console.log(`Cotations : ${symbols.length} valeurs`);

const nowIso = new Date().toISOString();
const today = nowIso.slice(0, 10);
const quoteRows = [];
const histRows = [];

for (const part of chunk(symbols, 50)) {
  const quotes = await quoteMany(part);
  for (const q of quotes) {
    const id = idBySym.get(q?.symbol);
    const price = q?.regularMarketPrice ?? q?.postMarketPrice;
    if (!id || price == null) continue;
    quoteRows.push({
      security_id: id,
      price,
      currency: q.currency || 'USD',
      change_pct_day: q.regularMarketChangePercent ?? null,
      as_of: nowIso,
      source: 'yahoo',
    });
    const close = q.regularMarketPreviousClose ?? price;
    histRows.push({ security_id: id, d: today, close });
  }
  await sleep(250);
}

const nQ = await upsertBatched('quotes', quoteRows, { onConflict: 'security_id' });
const nH = await upsertBatched('price_history', histRows, { onConflict: 'security_id,d' });

// purge de l'historique ancien 1×/jour (1re exécution après 00h05 UTC)
let pruned = 0;
if (nowIso.slice(11, 16) < '00:30') {
  const { data } = await db.rpc('prune_old_history');
  pruned = data ?? 0;
}

console.log(`✓ quotes: ${nQ} — price_history: ${nH} (jour ${today})${pruned ? ` — ${pruned} anciennes lignes purgées` : ''}`);
process.exit(0);
