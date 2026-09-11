import { AlertTriangle, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { money, pct } from '../lib/format.js';
import { sectorInfo } from '../lib/sectors.js';
import { Sparkline } from './Sparkline.jsx';

const MOM_THRESHOLD = 0.005; // 0,5 % : au-delà on affiche une flèche

// Signal de vigilance (onglet "Mes actions" uniquement) : purement informatif,
// pas un conseil en investissement — juste "la thèse haussière s'affaiblit".
function watchSignal(row) {
  if ((row.upside_pct ?? 0) <= 0) {
    return { label: 'Objectif atteint', cls: 'watch-danger', title: 'Le cours a atteint ou dépassé l’objectif moyen des analystes' };
  }
  const weakConsensus = row.recommendation_mean != null && row.recommendation_mean >= 3;
  const cutRecently = (row.momentum ?? 0) < -MOM_THRESHOLD;
  if (weakConsensus || cutRecently) {
    return { label: 'Consensus faible', cls: 'watch-warn', title: 'La note consensus des analystes est proche de Conserver/Vendre, ou l’objectif a été abaissé récemment' };
  }
  return null;
}

export function SecurityCard({ row, spark = [], onOpen, watch = false }) {
  const line = spark.length >= 2 ? spark : row._spark ?? [];
  const upsideNeg = (row.upside_pct ?? 0) < 0;
  const sec = sectorInfo(row);
  const mom = row.momentum ?? 0;
  const watchInfo = watch ? watchSignal(row) : null;

  return (
    <div className="card" onClick={() => onOpen(row)} role="button" tabIndex={0}>
      <div className="card-row">
        <div className="idcol">
          <div className="name">{row.name}</div>
          <div className="sub">
            {row.symbol_yahoo} · {row.exchange || row.region}
            {row.num_analysts ? ` · ${row.num_analysts} analystes` : ''}
          </div>
        </div>
        {line.length >= 2 && <Sparkline points={line} />}
        <span className={`upside-badge num ${upsideNeg ? 'neg' : ''}`}>
          {pct(row.upside_pct, { sign: true })}
          <small>vs objectif {money(row.target_mean, row.currency)}</small>
        </span>
      </div>

      <div className="card-row card-meta">
        <span className="meta-price num">
          {money(row.price, row.currency)}
          {row.change_pct_day != null && (
            <span className={`delta-sm ${row.change_pct_day >= 0 ? 'pos' : 'neg'}`}>
              {pct(row.change_pct_day / 100, { sign: true })}
            </span>
          )}
        </span>
        {sec && (
          <span className="sector-chip" style={{ background: sec.bg, color: sec.fg }}>
            {sec.label}
          </span>
        )}
        {mom > MOM_THRESHOLD && (
          <span className="mom mom-up" title="Objectif relevé sur ~30 j">
            <ArrowUpRight size={15} strokeWidth={2.5} />
          </span>
        )}
        {mom < -MOM_THRESHOLD && (
          <span className="mom mom-down" title="Objectif abaissé sur ~30 j">
            <ArrowDownRight size={15} strokeWidth={2.5} />
          </span>
        )}
        {watchInfo && (
          <span className={`watch-badge ${watchInfo.cls}`} title={watchInfo.title}>
            <AlertTriangle size={12} strokeWidth={2.5} />
            {watchInfo.label}
          </span>
        )}
      </div>
    </div>
  );
}
