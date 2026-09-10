import { useEffect, useState } from 'react';
import { supabase } from './supabase';

// Auth minimale (app perso) : OTP email via Supabase.
export function useAuth() {
  const [session, setSession] = useState(undefined); // undefined = en cours de chargement

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  return {
    session,
    loading: session === undefined,
    user: session?.user ?? null,
    signOut: () => supabase.auth.signOut(),
  };
}
