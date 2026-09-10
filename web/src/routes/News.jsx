import { useEffect, useState } from 'react';
import { DigestCard } from '../components/DigestCard.jsx';
import { fetchWeeklyDigest } from '../lib/data.js';

export default function News() {
  const [digest, setDigest] = useState(undefined);

  useEffect(() => {
    fetchWeeklyDigest().then(setDigest).catch(() => setDigest(null));
  }, []);

  return (
    <div className="screen">
      <h1 className="screen-title">News</h1>
      <p style={{ fontSize: 13.5, color: 'var(--text-2)', margin: '0 2px 16px' }}>
        Le brief de la semaine : les faits marquants à connaître pour bien investir.
      </p>

      {digest === undefined ? (
        <div className="skeleton" style={{ height: 320 }} />
      ) : (
        <DigestCard digest={digest} />
      )}
    </div>
  );
}
