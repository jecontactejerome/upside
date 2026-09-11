import { useCallback, useEffect, useMemo, useState } from 'react';
import { SlidersHorizontal, RefreshCw, Sparkles } from 'lucide-react';
import { SecurityCard } from '../components/SecurityCard.jsx';
import { SecuritySheet } from '../components/SecuritySheet.jsx';
import { FilterSheet } from '../components/FilterSheet.jsx';
import { fetchGrowth, fetchHoldings, SORTS } from '../lib/data.js';
import { sectorInfo, aiExposureFlag } from '../lib/sectors.js';

const DEFAULT_FILTERS = {
  sort: 'upside',
  region: null,
  sector: null, // libellé de bucket (voir lib/sectors.js), filtré côté client
  minAnalysts: 10,
  hideDownside: true,
};

// Raccourci "Sélection" : au moins 10 analystes, >80 % d'avis Achat, servi
// côté serveur. Croissance CA/résultat + exposition IA filtrés côté client
// (voir lib/sectors.js pour le détail éditorial de l'exposition IA).
const QUICK = { sort: 'score', minAnalysts: 10, hideDownside: true, buyPctMin: 0.8 };

function isDurableGrowth(row) {
  return (row.revenue_growth ?? 0) > 0 && (row.earnings_growth == null || row.earnings_growth > 0);
}

export default function Growth() {
  const [tab, setTab] = useState('all'); // 'all' | 'mine'
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [quick, setQuick] = useState(false);
  const [rows, setRows] = useState(null);
  const [mineIds, setMineIds] = useState([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchHoldings().then((h) => setMineIds(h.map((x) => x.id)));
  }, []);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const ids = tab === 'mine' ? mineIds : null;
      const base = quick
        ? { ...filters, ...QUICK, sector: filters.sector, region: filters.region }
        : filters;
      let data = await fetchGrowth({ ...base, ids });
      if (filters.sector) {
        data = data.filter((r) => sectorInfo(r)?.label === filters.sector);
      }
      if (quick) {
        data = data.filter((r) => isDurableGrowth(r) && !aiExposureFlag(r));
      }
      setRows(data);
    } catch (e) {
      console.error(e);
      setRows([]);
    } finally {
      setRefreshing(false);
    }
  }, [filters, quick, tab, mineIds]);

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
        <button className="chip" onClick={() => setFilterOpen(true)} disabled={quick}>
          <SlidersHorizontal size={15} />
          {quick ? 'Sélection' : SORTS[filters.sort]?.label || 'Upside %'}
          {!quick && activeFilterCount ? ` · ${activeFilterCount}` : ''}
        </button>
        <button
          className={`chip icon ${quick ? 'active' : ''}`}
          onClick={() => setQuick((v) => !v)}
          aria-pressed={quick}
          title="Sélection : ≥10 analystes, >80 % d'avis Achat, croissance CA/résultat, hors secteurs très exposés à l'IA"
        >
          <Sparkles size={15} />
        </button>
        <div style={{ flex: 1 }} />
        <button className="chip icon" onClick={load} aria-label="Rafraîchir">
          <RefreshCw size={15} className={refreshing ? 'spin' : ''} />
        </button>
      </div>

      {quick && (
        <p className="quick-note">
          Sélection : au moins 10 analystes, plus de 80 % d'avis « Achat », chiffre d'affaires et
          résultat en croissance, hors secteurs très exposés à l'IA — triée par score.
        </p>
      )}

      {rows === null && <SkeletonList />}

      {rows && rows.length === 0 && (
        <p className="empty">
          {tab === 'mine'
            ? 'Aucune de tes actions suivies n’a d’objectif analystes pour l’instant. Ajoute-les dans l’onglet News.'
            : 'Aucune valeur ne correspond à ces critères.'}
        </p>
      )}

      {rows && rows.map((row) => <SecurityCard key={row.id} row={row} onOpen={setSelected} />)}

      <FilterSheet
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        value={filters}
        onChange={setFilters}
      />

      <SecuritySheet row={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function SkeletonList() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="skeleton" style={{ height: 104, marginBottom: 10 }} />
      ))}
    </>
  );
}
