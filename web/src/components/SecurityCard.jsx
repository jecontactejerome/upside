import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { money, pct } from '../lib/format.js';
import { sectorInfo } from '../lib/sectors.js';
import { Sparkline } from './Sparkline.jsx';

const MOM_THRESHOLD = 0.005; // 0,5 % : au-delà on affiche une flèche

export function SecurityCard({ row, spark = [], onOpen }) {
  const line = spark.length >= 2 ? spark : row._spark ?? [];
  const upsideNeg = (row.upside_pct ?? 0) < 0;
  const sec = sectorInfo(row);
  const mom = row.momentum ?? 0;

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
        <div className="price num">
          {money(row.price, row.currency)}
          {row.change_pct_day != null && (
            <div className={`delta ${row.change_pct_day >= 0 ? 'pos' : 'neg'}`}>
              {pct(row.change_pct_day / 100, { sign: true })}
            </div>
          )}
        </div>
      </div>

      <div className="card-row card-meta">
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
        <div style={{ flex: 1 }} />
        <span className={`upside-badge num ${upsideNeg ? 'neg' : ''}`}>
          {pct(row.upside_pct, { sign: true })}
          <small>vs objectif {money(row.target_mean, row.currency)}</small>
        </span>
      </div>
    </div>
  );
}
