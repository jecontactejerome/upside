import { useCallback, useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { NewsItem } from '../components/NewsItem.jsx';
import { AddSearch } from '../components/AddSearch.jsx';
import { Sheet } from '../components/Sheet.jsx';
import {
  fetchHoldings,
  fetchHoldingsNews,
  addHolding,
  removeHolding,
  addTickerViaApi,
} from '../lib/data.js';

export default function Track() {
  const [holdings, setHoldings] = useState(null);
  const [news, setNews] = useState(null);
  const [manageOpen, setManageOpen] = useState(false);

  const reloadNews = useCallback(async () => {
    setNews(await fetchHoldingsNews(60));
  }, []);

  const reload = useCallback(async () => {
    setHoldings(await fetchHoldings());
    reloadNews();
  }, [reloadNews]);

  useEffect(() => {
    reload();
  }, [reload]);

  const heldIds = new Set((holdings ?? []).map((h) => h.id));

  async function add(sec) {
    setHoldings((h) => [{ ...sec, added_at: new Date().toISOString() }, ...(h ?? [])]);
    await addHolding(sec.id);
    reloadNews();
  }

  async function addByTicker(symbol) {
    const sec = await addTickerViaApi(symbol); // lève en cas d'échec
    setHoldings((h) => [{ ...sec, added_at: new Date().toISOString() }, ...(h ?? [])]);
    reloadNews();
  }

  async function remove(id) {
    setHoldings((h) => (h ?? []).filter((x) => x.id !== id));
    await removeHolding(id);
    reloadNews();
  }

  const count = holdings?.length ?? 0;

  return (
    <div className="screen">
      <h1 className="screen-title">Track</h1>

      {/* --- barre compacte : nb d'actions + gérer --- */}
      <button className="track-manage" onClick={() => setManageOpen(true)}>
        <span>
          {holdings === null
            ? 'Chargement…'
            : count === 0
              ? 'Aucune action suivie'
              : `${count} action${count > 1 ? 's' : ''} suivie${count > 1 ? 's' : ''}`}
        </span>
        <span className="track-manage-cta">{count === 0 ? 'Ajouter' : 'Gérer'}</span>
      </button>

      {/* --- fil d'actu (occupe l'écran) --- */}
      <h2 style={{ fontSize: 16, fontWeight: 650, margin: '20px 2px 6px' }}>Fil d’actualité</h2>
      {news === null ? (
        Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 72, marginBottom: 8 }} />
        ))
      ) : news.length === 0 ? (
        <p className="empty">
          {count
            ? 'Pas encore d’article pour ces valeurs. Le fil se met à jour toutes les 2 heures.'
            : 'Ajoute des actions pour voir leur actualité ici.'}
        </p>
      ) : (
        news.map((a) => <NewsItem key={a.id} article={a} />)
      )}

      {/* --- feuille de gestion --- */}
      <Sheet open={manageOpen} onClose={() => setManageOpen(false)}>
        <h2>Mes actions</h2>
        <p style={{ fontSize: 12.5, color: 'var(--text-2)', margin: '2px 0 12px' }}>
          {count} suivie{count > 1 ? 's' : ''} · recherche dans le S&amp;P 500 et le STOXX 600
        </p>

        <AddSearch heldIds={heldIds} onAdd={add} onAddByTicker={addByTicker} autoFocus />

        <div className="manage-list">
          {(holdings ?? []).length === 0 && (
            <p className="muted" style={{ fontSize: 13, padding: '16px 2px' }}>
              Aucune action pour l’instant.
            </p>
          )}
          {(holdings ?? []).map((h) => (
            <div className="manage-row" key={h.id}>
              <span className="manage-name">
                <strong>{h.name}</strong>
                <span className="muted"> · {h.symbol_yahoo} · {h.exchange || h.region}</span>
              </span>
              <button className="manage-remove" aria-label={`Retirer ${h.name}`} onClick={() => remove(h.id)}>
                <X size={15} />
              </button>
            </div>
          ))}
        </div>

        <button className="btn-primary" style={{ marginTop: 16 }} onClick={() => setManageOpen(false)}>
          Terminé
        </button>
      </Sheet>
    </div>
  );
}
