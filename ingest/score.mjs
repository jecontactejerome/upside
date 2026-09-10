// Recalcule growth_scores pour toutes les valeurs (fonction SQL côté Postgres).
// À lancer après quotes.mjs + targets.mjs.
import { db } from './lib/supabase.mjs';

const { data, error } = await db.rpc('recompute_growth_scores');
if (error) {
  console.error('✗ recompute_growth_scores:', error.message);
  process.exit(1);
}
console.log(`✓ growth_scores recalculé pour ${data} valeurs`);
process.exit(0);
