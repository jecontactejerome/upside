import { useCallback, useEffect, useMemo, useState } from 'react';
import { SlidersHorizontal, RefreshCw } from 'lucide-react';
import { SecurityCard } from '../components/SecurityCard.jsx';
import { SecuritySheet } from '../components/SecuritySheet.jsx';
import { FilterSheet } from '../components/FilterSheet.jsx';
import {
  fetchGrowth,
  fetchSectors,
  fetchWatchlist,
  toggleWatch,
  SORTS,
} from '../lib/data.js';

const DEFAULT_FILTERS = {
  sort: 'score', // classement pondéré (upside x couverture x momentum x note) plutôt que l'upside brut
  region: null,
  sector: null,
  minAnalysts: 6, // écarte les valeurs trop peu suivies (paris spéculatifs)
  hideDownside: true,
};

export default function Growth() {
  const [tab, setTab] = useState('all'); // 'all' | 'fav'
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [rows, setRows] = useState(null);
  const [sectors, setSectors] = useState([]);
  const [fav, setFav] = useState(new Map()); // security_id -> note
  const [filterOpen, setFilterOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchSectors().then(setSectors);
  }, []);

  const loadFav = useCallback(async () => {
    const w = await fetchWatchlist();
    setFav(new Map(w.map((r) => [r.security_id, r.note ?? ''])));
  }, []);
  useEffect(() => {
    loadFav();
  }, [loadFav]);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const ids = tab === 'fav' ? [...fav.keys()] : null;
      const data = await fetchGrowth({ ...filters, ids });
      setRows(data);
    } catch (e) {
      console.error(e);
      setRows([]);
    } finally {
      setRefreshing(false);
    }
  }, [filters, tab, fav]);

  useEffect(() => {
    load();
  }, [load]);

  const onToggleFav = async (row) => {
    const on = !fav.has(row.id);
    const next = new Map(fav);
    if (on) next.set(row.id, '');
    else next.delete(row.id);
    setFav(next);
    const { error } = await toggleWatch(row.id, on);
    if (error) {
      console.error(error);
      loadFav(); // resync en cas d'échec
    }
  };

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (filters.region) n++;
    if (filters.sector) n++;
    if (filters.minAnalysts !== DEFAULT_FILTERS.minAnalysts) n++;
    if (filters.hideDownside !== DEFAULT_FILTERS.hideDownside) n++;
    return n;
  }, [filters]);

  return (
    <div className="screen">
      <h1 className="screen-title">Growth</h1>

      <div className="segmented">
        <button aria-selected={tab === 'all'} onClick={() => setTab('all')}>
          Tous
        </button>
        <button aria-selected={tab === 'fav'} onClick={() => setTab('fav')}>
          Favoris{fav.size ? ` (${fav.size})` : ''}
        </button>
      </div>

      <div className="toolbar">
        <button className="chip" onClick={() => setFilterOpen(true)}>
          <SlidersHorizontal size={15} />
          {SORTS[filters.sort].label}
          {activeFilterCount ? ` · ${activeFilterCount}` : ''}
        </button>
        <div style={{ flex: 1 }} />
        <button className="chip" onClick={load} aria-label="Rafraîchir">
          <RefreshCw size={15} className={refreshing ? 'spin' : ''} />
        </button>
      </div>

      {rows === null && <SkeletonList />}

      {rows && rows.length === 0 && (
        <p className="empty">
          {tab === 'fav'
            ? 'Aucun favori pour l’instant. Touchez l’étoile sur une valeur pour l’ajouter.'
            : 'Aucune valeur ne correspond à ces filtres.'}
        </p>
      )}

      {rows &&
        rows.map((row) => (
          <SecurityCard
            key={row.id}
            row={row}
            isFav={fav.has(row.id)}
            onToggleFav={onToggleFav}
            onOpen={setSelected}
          />
        ))}

      <FilterSheet
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        value={filters}
        onChange={setFilters}
        sectors={sectors}
      />

      <SecuritySheet
        row={selected}
        isFav={selected ? fav.has(selected.id) : false}
        note={selected ? fav.get(selected.id) : ''}
        onClose={() => setSelected(null)}
        onNoteSaved={(id, note) => setFav((m) => new Map(m).set(id, note))}
      />
    </div>
  );
}

function SkeletonList() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="skeleton" style={{ height: 96, marginBottom: 10 }} />
      ))}
    </>
  );
}
