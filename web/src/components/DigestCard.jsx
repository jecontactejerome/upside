export function DigestCard({ digest }) {
  if (!digest) {
    return (
      <div className="digest-card">
        <div className="b-title">Le brief du jour n’est pas encore disponible.</div>
        <div className="b-detail">Il est généré chaque matin vers 6 h 30 (UTC).</div>
      </div>
    );
  }
  const d = new Date(digest.d).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  return (
    <div className="digest-card">
      <div style={{ fontSize: 12, color: 'var(--text-2)', fontWeight: 600, textTransform: 'capitalize' }}>
        {d} · {digest.generated_by === 'gemini' ? 'synthèse IA' : 'synthèse automatique'}
      </div>
      <ol>
        {(digest.bullets || []).map((b, i) => (
          <li key={i}>
            <div className="b-title">{b.title}</div>
            {b.detail && <div className="b-detail">{b.detail}</div>}
          </li>
        ))}
      </ol>
    </div>
  );
}
