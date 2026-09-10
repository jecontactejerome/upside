import { Sheet } from './Sheet.jsx';
import { SORTS } from '../lib/data.js';

export function FilterSheet({ open, onClose, value, onChange, sectors }) {
  const set = (patch) => onChange({ ...value, ...patch });

  return (
    <Sheet open={open} onClose={onClose}>
      <h2>Trier & filtrer</h2>

      <Group title="Trier par">
        <div className="segmented" style={{ flexWrap: 'wrap' }}>
          {Object.entries(SORTS).map(([key, s]) => (
            <button
              key={key}
              aria-selected={value.sort === key}
              onClick={() => set({ sort: key })}
            >
              {s.label}
            </button>
          ))}
        </div>
      </Group>

      <Group title="Région">
        <div className="segmented">
          {[
            ['', 'Toutes'],
            ['US', 'US'],
            ['EU', 'Europe'],
          ].map(([v, l]) => (
            <button key={l} aria-selected={(value.region ?? '') === v} onClick={() => set({ region: v || null })}>
              {l}
            </button>
          ))}
        </div>
      </Group>

      <Group title="Secteur">
        <select className="field" value={value.sector ?? ''} onChange={(e) => set({ sector: e.target.value || null })}>
          <option value="">Tous les secteurs</option>
          {sectors.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </Group>

      <Group title={`Minimum d'analystes : ${value.minAnalysts}`}>
        <input
          type="range"
          min="0"
          max="25"
          value={value.minAnalysts}
          onChange={(e) => set({ minAnalysts: Number(e.target.value) })}
          style={{ width: '100%' }}
        />
      </Group>

      <label style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '10px 0 4px', fontSize: 14 }}>
        <input
          type="checkbox"
          checked={value.hideDownside}
          onChange={(e) => set({ hideDownside: e.target.checked })}
        />
        Masquer le potentiel négatif
      </label>

      <button className="btn-primary" style={{ marginTop: 16 }} onClick={onClose}>
        Voir les résultats
      </button>
    </Sheet>
  );
}

function Group({ title, children }) {
  return (
    <div style={{ margin: '16px 0' }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--text-2)' }}>{title}</div>
      {children}
    </div>
  );
}
