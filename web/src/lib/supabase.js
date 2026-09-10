import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Sans configuration, l'app tourne en mode démo (voir lib/demo.js).
// On fournit quand même une URL valide pour que createClient ne lève pas.
const FALLBACK_URL = 'https://placeholder.supabase.co';

if (!url || !anon) {
  console.info('Supabase non configuré → mode démo. Renseigne web/.env pour te connecter à ta base.');
}

export const supabase = createClient(url || FALLBACK_URL, anon || 'placeholder-anon-key', {
  auth: { persistSession: true, autoRefreshToken: true },
});
