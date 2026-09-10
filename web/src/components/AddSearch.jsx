import { useEffect, useRef, useState } from 'react';
import { Plus, Search, Loader2 } from 'lucide-react';
import { searchSecurities } from '../lib/data.js';
import { isDemo } from '../lib/demo.js';

// Champ de recherche + liste de résultats pour ajouter une action.
// onAdd(sec)          : ajout d'une valeur déjà en base
// onAddByTicker(sym)  : ajout d'un ticker hors univers (via Yahoo) — renvoie une promesse
export function AddSearch({ heldIds, onAdd, onAddByTicker, autoFocus = false }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState(false);
  const [err, setErr] = useState('');
  const debounce = useRef();
  const inputRef = useRef(null);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  useEffect(() => {
    clearTimeout(debounce.current);
    setErr('');
    if (query.trim().length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    debounce.current = setTimeout(async () => {
      setResults(await searchSecurities(query));
      setSearching(false);
    }, 220);
    return () => clearTimeout(debounce.current);
  }, [query]);

  function pick(sec) {
    setQuery('');
    setResults([]);
    onAdd(sec);
  }

  async function pickTicker() {
    const sym = query.trim();
    setAdding(true);
    setErr('');
    try {
      await onAddByTicker(sym);
      setQuery('');
      setResults([]);
    } catch (e) {
      setErr(e.message || 'Impossible d’ajouter ce ticker');
    } finally {
      setAdding(false);
    }
  }

  const q = query.trim();
  const showTickerRow =
    !isDemo() && onAddByTicker && q.length >= 1 && q.length <= 12 && !/\s/.test(q) && !searching;

  return (
    <div className="search-wrap">
      <div className="search-field">
        <Search size={16} color="var(--text-2)" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Nom, ou ticker (ex : TSM, NANO.PA, HUT)…"
          autoCorrect="off"
          autoCapitalize="off"
        />
      </div>
      {(results.length > 0 || searching || showTickerRow || err) && q.length >= 1 && (
        <div className="search-results">
          {searching && <div className="search-row muted">Recherche…</div>}

          {results.map((s) => {
            const held = heldIds.has(s.id);
            return (
              <button key={s.id} className="search-row" disabled={held} onClick={() => pick(s)}>
                <span>
                  <strong>{s.name}</strong>
                  <span className="muted"> · {s.symbol_yahoo} · {s.exchange || s.region}</span>
                </span>
                {held ? <span className="muted">ajoutée</span> : <Plus size={16} />}
              </button>
            );
          })}

          {showTickerRow && (
            <button className="search-row" disabled={adding} onClick={pickTicker}>
              <span>
                Suivre <strong>{q.toUpperCase()}</strong>
                <span className="muted"> · recherche Yahoo Finance</span>
              </span>
              {adding ? <Loader2 size={16} className="spin" /> : <Plus size={16} />}
            </button>
          )}

          {err && <div className="search-row" style={{ color: 'var(--down)' }}>{err}</div>}
        </div>
      )}
    </div>
  );
}
