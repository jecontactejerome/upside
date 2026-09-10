import { money } from '../lib/format.js';

// Barre visuelle : objectif bas — cours actuel — objectif haut.
export function TargetRangeBar({ low, mean, high, price, currency }) {
  const lo = Math.min(low ?? price, price);
  const hi = Math.max(high ?? price, price);
  const span = hi - lo || 1;
  const pos = (v) => `${(((v - lo) / span) * 100).toFixed(1)}%`;

  return (
    <div className="range">
      <div className="fill" style={{ left: pos(price), right: 0 }} />
      {low != null && (
        <span className="label below" style={{ left: pos(low) }}>
          bas {money(low, currency)}
        </span>
      )}
      <div className="tick" style={{ left: pos(price) }} />
      <span className="label above" style={{ left: pos(price) }}>
        cours {money(price, currency)}
      </span>
      {mean != null && (
        <span className="label below" style={{ left: pos(mean) }}>
          moy. {money(mean, currency)}
        </span>
      )}
      {high != null && (
        <span className="label above" style={{ left: pos(high) }}>
          haut {money(high, currency)}
        </span>
      )}
    </div>
  );
}
