import { money, pct } from '../lib/format.js';
import { Sparkline } from './Sparkline.jsx';

export function SecurityCard({ row, spark = [], onOpen }) {
  const line = spark.length >= 2 ? spark : row._spark ?? [];
  const upsideNeg = (row.upside_pct ?? 0) < 0;
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
      <div className="card-row" style={{ marginTop: 12 }}>
        <span className={`upside-badge num ${upsideNeg ? 'neg' : ''}`}>
          {pct(row.upside_pct, { sign: true })}
          <small>vs objectif {money(row.target_mean, row.currency)}</small>
        </span>
      </div>
    </div>
  );
}
