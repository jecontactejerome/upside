import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../lib/useAuth.js';

export default function Login() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState('email'); // 'email' | 'code'
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) {
    return (
      <div className="screen">
        <h1 className="screen-title">Compte</h1>
        <p style={{ fontSize: 14 }}>Connecté en tant que <strong>{user.email}</strong>.</p>
        <button className="chip" onClick={() => supabase.auth.signOut()}>Se déconnecter</button>
      </div>
    );
  }

  async function sendCode(e) {
    e.preventDefault();
    setBusy(true);
    setMsg('');
    const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
    setBusy(false);
    if (error) return setMsg(error.message);
    setStep('code');
    setMsg('Code envoyé par email.');
  }

  async function verify(e) {
    e.preventDefault();
    setBusy(true);
    setMsg('');
    const { error } = await supabase.auth.verifyOtp({ email, token: code.trim(), type: 'email' });
    setBusy(false);
    if (error) return setMsg(error.message);
    navigate('/growth', { replace: true });
  }

  return (
    <div className="screen">
      <h1 className="screen-title">Se connecter</h1>
      <p style={{ fontSize: 13.5, color: 'var(--text-2)', marginBottom: 20 }}>
        Nécessaire uniquement pour gérer vos favoris. Le reste de l’app est consultable sans compte.
      </p>

      {step === 'email' ? (
        <form onSubmit={sendCode}>
          <input
            className="field"
            type="email"
            required
            placeholder="votre@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button className="btn-primary" disabled={busy}>
            {busy ? 'Envoi…' : 'Recevoir un code'}
          </button>
        </form>
      ) : (
        <form onSubmit={verify}>
          <input
            className="field num"
            inputMode="numeric"
            required
            placeholder="Code à 6 chiffres"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <button className="btn-primary" disabled={busy}>
            {busy ? 'Vérification…' : 'Valider'}
          </button>
        </form>
      )}

      {msg && <p style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 12 }}>{msg}</p>}
    </div>
  );
}
