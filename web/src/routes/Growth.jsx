import { useCallback, useEffect, useMemo, useState } from 'react';
import { SlidersHorizontal, RefreshCw } from 'lucide-react';
import { SecurityCard } from '../components/SecurityCard.jsx';
import { SecuritySheet } from '../components/SecuritySheet.jsx';
import { FilterSheet } from '../components/FilterSheet.jsx';
import { fetchGrowth, fetchSectors, fetchHoldings, SORTS } from '../lib/data.js';

const DEFAULT_FILTERS = {
  sort: 'score', // classement pondéré (upside x couverture x momentum x note) plutôt que l'upside brut
  region: null,
  sector: null,
  minAnalysts: 6, // écarte les valeurs trop peu suivies (paris spéculatifs)
  hideDownside: true,
};

export default function Growth() {
  const [tab, setTab] = useState('all'); // 'all' | 'mine'
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [rows, setRows] = useState(null);
  const [sectors, setSectors] = useState([]);
  const [mineIds, setMineIds] = useState([]); // ids des actions suivies (onglet News)
  const [filterOpen, setFilterOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchSectors().then(setSectors);
    fetchHoldings().then((h) => setMineIds(h.map((x) => x.id)));
  }, []);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const ids = tab === 'mine' ? mineIds : null;
      const data = await fetchGrowth({ ...filters, ids });
      setRows(data);
    } catch (e) {
      console.error(e);
      setRows([]);
    } finally {
      setRefreshing(false);
    }
  }, [filters, tab, mineIds]);

  useEffect(() => {
    load();
  }, [load]);

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
          Toutes
        </button>
        <button aria-selected={tab === 'mine'} onClick={() => setTab('mine')}>
          Mes actions{mineIds.length ? ` (${mineIds.length})` : ''}
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
          {tab === 'mine'
            ? 'Aucune de tes actions suivies n’a d’objectif analystes pour l’instant. Ajoute-les dans l’onglet News.'
            : 'Aucune valeur ne correspond à ces filtres.'}
        </p>
      )}

      {rows &&
        rows.map((row) => <SecurityCard key={row.id} row={row} onOpen={setSelected} />)}

      <FilterSheet
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        value={filters}
        onChange={setFilters}
        sectors={sectors}
      />

      <SecuritySheet row={selected} onClose={() => setSelected(null)} />
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
