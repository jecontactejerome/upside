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

// SELECT paginé : contourne la limite de 1000 lignes de PostgREST.
export async function selectAll(table, columns, applyFilters = (q) => q, page = 1000) {
  const out = [];
  for (let from = 0; ; from += page) {
    let q = db.from(table).select(columns).range(from, from + page - 1);
    q = applyFilters(q);
    const { data, error } = await q;
    if (error) throw new Error(`select ${table}: ${error.message}`);
    out.push(...(data || []));
    if (!data || data.length < page) break;
  }
  return out;
}
