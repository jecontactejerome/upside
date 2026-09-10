import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, X, Search } from 'lucide-react';
import { NewsItem } from '../components/NewsItem.jsx';
import {
  fetchHoldings,
  fetchHoldingsNews,
  searchSecurities,
  addHolding,
  removeHolding,
} from '../lib/data.js';
import { useAuth } from '../lib/useAuth.js';
import { isDemo } from '../lib/demo.js';

export default function Track() {
  const { user } = useAuth();
  const gated = !user && !isDemo();

  const [holdings, setHoldings] = useState(null);
  const [news, setNews] = useState(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const debounce = useRef();

  const reload = useCallback(async () => {
    const h = await fetchHoldings();
    setHoldings(h);
    setNews(await fetchHoldingsNews(60));
  }, []);

  useEffect(() => {
    if (!gated) reload();
  }, [gated, reload]);

  useEffect(() => {
    clearTimeout(debounce.current);
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    debounce.current = setTimeout(async () => {
      setResults(await searchSecurities(query));
      setSearching(false);
    }, 220);
    return () => clearTimeout(debounce.current);
  }, [query]);

  const heldIds = new Set((holdings ?? []).map((h) => h.id));

  async function add(sec) {
    setQuery('');
    setResults([]);
    setHoldings((h) => [{ ...sec, added_at: new Date().toISOString() }, ...(h ?? [])]);
    await addHolding(sec.id, user?.id);
    reload();
  }

  async function remove(id) {
    setHoldings((h) => (h ?? []).filter((x) => x.id !== id));
    await removeHolding(id);
    reload();
  }

  if (gated) {
    return (
      <div className="screen">
        <h1 className="screen-title">Track</h1>
        <p className="empty">
          Connecte-toi pour suivre l’actu des actions que tu détiens.
          <br />
          <Link to="/login" style={{ color: 'var(--accent)', fontWeight: 600 }}>Se connecter</Link>
        </p>
      </div>
    );
  }

  return (
    <div className="screen">
      <h1 className="screen-title">Track</h1>
      <p style={{ fontSize: 13.5, color: 'var(--text-2)', margin: '0 2px 14px' }}>
        Ajoute les actions que tu détiens et suis leur actualité.
      </p>

      {/* --- ajout d'une action --- */}
      <div className="search-wrap">
        <div className="search-field">
          <Search size={16} color="var(--text-2)" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ajouter une action (nom ou ticker)…"
            autoCorrect="off"
            autoCapitalize="off"
          />
        </div>
        {(results.length > 0 || (searching && query.length >= 2)) && (
          <div className="search-results">
            {searching && <div className="search-row muted">Recherche…</div>}
            {results.map((s) => (
              <button
                key={s.id}
                className="search-row"
                disabled={heldIds.has(s.id)}
                onClick={() => add(s)}
              >
                <span>
                  <strong>{s.name}</strong>
                  <span className="muted"> · {s.symbol_yahoo} · {s.exchange || s.region}</span>
                </span>
                {heldIds.has(s.id) ? <span className="muted">ajoutée</span> : <Plus size={16} />}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* --- liste des actions détenues --- */}
      {holdings === null ? (
        <div className="skeleton" style={{ height: 44, margin: '12px 0' }} />
      ) : holdings.length === 0 ? (
        <p className="empty" style={{ padding: '24px 20px' }}>
          Aucune action suivie. Utilise la recherche ci-dessus.
        </p>
      ) : (
        <div className="hold-chips">
          {holdings.map((h) => (
            <span className="hold-chip" key={h.id}>
              {h.symbol_yahoo}
              <button aria-label={`Retirer ${h.name}`} onClick={() => remove(h.id)}>
                <X size={13} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* --- fil d'actu --- */}
      <h2 style={{ fontSize: 16, fontWeight: 650, margin: '22px 2px 4px' }}>Fil d’actualité</h2>
      {news === null ? (
        Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 72, marginBottom: 8 }} />
        ))
      ) : news.length === 0 ? (
        <p className="empty">
          {holdings?.length
            ? 'Pas encore d’article pour ces valeurs. Le fil se met à jour toutes les 2 heures.'
            : 'Ajoute une action pour voir son actualité ici.'}
        </p>
      ) : (
        news.map((a) => <NewsItem key={a.id} article={a} />)
      )}
    </div>
  );
}
