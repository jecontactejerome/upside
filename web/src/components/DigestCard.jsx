export function DigestCard({ digest }) {
  if (!digest) {
    return (
      <div className="digest-card">
        <div className="b-title">Le brief de la semaine n’est pas encore disponible.</div>
        <div className="b-detail">Il est généré chaque lundi matin.</div>
      </div>
    );
  }
  const start = new Date(digest.week_start);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const fmt = (d) => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });

  return (
    <div className="digest-card">
      <div style={{ fontSize: 12, color: 'var(--text-2)', fontWeight: 600 }}>
        Semaine du {fmt(start)} au {fmt(end)} · {digest.generated_by === 'gemini' ? 'synthèse IA' : 'synthèse automatique'}
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
