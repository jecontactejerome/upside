// Client Supabase côté ingestion : clé service_role (contourne la RLS).
// NE JAMAIS exposer cette clé au front.
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_SERVICE_KEY } from './env.mjs';

export const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// upsert par lots pour rester sous les limites de payload
export async function upsertBatched(table, rows, { onConflict, chunk = 500 } = {}) {
  let done = 0;
  for (let i = 0; i < rows.length; i += chunk) {
    const slice = rows.slice(i, i + chunk);
    const { error } = await db.from(table).upsert(slice, { onConflict });
    if (error) throw new Error(`upsert ${table}: ${error.message}`);
    done += slice.length;
  }
  return done;
}
