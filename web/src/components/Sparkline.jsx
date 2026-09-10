// Mini-courbe SVG sans dépendance.
export function Sparkline({ points = [], width = 64, height = 24 }) {
  if (points.length < 2) return <svg width={width} height={height} />;
  const xs = points.map((_, i) => i);
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const path = xs
    .map((x, i) => {
      const px = (x / (xs.length - 1)) * width;
      const py = height - ((points[i] - min) / span) * height;
      return `${i === 0 ? 'M' : 'L'}${px.toFixed(1)},${py.toFixed(1)}`;
    })
    .join(' ');
  const up = points[points.length - 1] >= points[0];
  return (
    <svg width={width} height={height} aria-hidden>
      <path
        d={path}
        fill="none"
        stroke={up ? 'var(--up)' : 'var(--down)'}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
