import { useEffect, useRef, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { searchSecurities } from '../lib/data.js';

// Champ de recherche + liste de résultats pour ajouter une action.
export function AddSearch({ heldIds, onAdd, autoFocus = false }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const debounce = useRef();
  const inputRef = useRef(null);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  useEffect(() => {
    clearTimeout(debounce.current);
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

  return (
    <div className="search-wrap">
      <div className="search-field">
        <Search size={16} color="var(--text-2)" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ajouter une action (nom ou ticker)…"
          autoCorrect="off"
          autoCapitalize="off"
        />
      </div>
      {(results.length > 0 || (searching && query.trim().length >= 2)) && (
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
        </div>
      )}
    </div>
  );
}
