import { useEffect, useState } from 'react';
import { Sheet } from './Sheet.jsx';
import { TargetRangeBar } from './TargetRangeBar.jsx';
import { money, pct, relDate, RATING_LABEL } from '../lib/format.js';
import { fetchNewsForSecurity, fetchPriceHistory, saveNote } from '../lib/data.js';
import { Sparkline } from './Sparkline.jsx';

export function SecuritySheet({ row, isFav, note, onClose, onNoteSaved }) {
  const [news, setNews] = useState([]);
  const [hist, setHist] = useState([]);
  const [draft, setDraft] = useState(note ?? '');

  useEffect(() => {
    if (!row) return;
    setDraft(note ?? '');
    fetchNewsForSecurity(row.id, 5).then(setNews);
    fetchPriceHistory(row.id, 120).then((h) => setHist(h.map((p) => p.close)));
  }, [row, note]);

  if (!row) return null;

  return (
    <Sheet open={!!row} onClose={onClose}>
      <h2>{row.name}</h2>
      <div className="sub" style={{ color: 'var(--text-2)', fontSize: 13 }}>
        {row.symbol_yahoo} · {row.exchange || row.region} · {row.sector || '—'}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '16px 0 4px' }}>
        <span className={`upside-badge num ${(row.upside_pct ?? 0) < 0 ? 'neg' : ''}`} style={{ fontSize: 18 }}>
          {pct(row.upside_pct, { sign: true })}
        </span>
        <div className="spacer" style={{ flex: 1 }} />
        <Sparkline points={hist} width={110} height={34} />
      </div>

      <TargetRangeBar
        low={row.target_low}
        mean={row.target_mean}
        high={row.target_high}
        price={row.price}
        currency={row.currency}
      />

      <dl className="kv">
        <Row k="Cours actuel" v={money(row.price, row.currency)} />
        <Row k="Objectif moyen" v={money(row.target_mean, row.currency)} />
        <Row k="Fourchette" v={`${money(row.target_low, row.currency)} – ${money(row.target_high, row.currency)}`} />
        <Row k="Analystes" v={row.num_analysts ?? '—'} />
        <Row k="Note consensus" v={RATING_LABEL[row.recommendation_key] || row.recommendation_key || '—'} />
        <Row k="Momentum objectif (~30 j)" v={row.momentum != null ? pct(row.momentum, { sign: true }) : '—'} />
        <Row k="Objectif mis à jour" v={relDate(row.target_as_of)} />
      </dl>

      {isFav && (
        <div style={{ marginTop: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 600 }}>Ma note</label>
          <textarea
            className="field"
            rows={2}
            style={{ marginTop: 6, resize: 'none' }}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Pourquoi cette valeur m'intéresse…"
          />
          <button
            className="chip"
            onClick={async () => {
              await saveNote(row.id, draft);
              onNoteSaved?.(row.id, draft);
            }}
          >
            Enregistrer la note
          </button>
        </div>
      )}

      <h3 style={{ fontSize: 15, fontWeight: 650, margin: '22px 0 4px' }}>Actualité récente</h3>
      {news.length === 0 && <p className="sub" style={{ color: 'var(--text-2)', fontSize: 13 }}>Aucun article pour le moment.</p>}
      {news.map((a) => (
        <a key={a.id} className="news-item" href={a.url} target="_blank" rel="noreferrer">
          <div>
            <div className="headline">{a.headline}</div>
            <div className="meta">{a.source} · {relDate(a.published_at)}</div>
          </div>
        </a>
      ))}
    </Sheet>
  );
}

function Row({ k, v }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--hairline)', fontSize: 13.5 }}>
      <span style={{ color: 'var(--text-2)' }}>{k}</span>
      <span className="num" style={{ fontWeight: 560 }}>{v}</span>
    </div>
  );
}
