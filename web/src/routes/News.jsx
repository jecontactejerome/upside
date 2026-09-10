import { useEffect, useState } from 'react';
import { DigestCard } from '../components/DigestCard.jsx';
import { NewsItem } from '../components/NewsItem.jsx';
import { fetchDigest, fetchTopTickerNews } from '../lib/data.js';

export default function News() {
  const [tab, setTab] = useState('feed'); // 'feed' | 'brief'
  const [articles, setArticles] = useState(null);
  const [digest, setDigest] = useState(undefined);

  useEffect(() => {
    fetchTopTickerNews(60).then(setArticles).catch(() => setArticles([]));
    fetchDigest().then(setDigest).catch(() => setDigest(null));
  }, []);

  return (
    <div className="screen">
      <h1 className="screen-title">News</h1>

      <div className="segmented">
        <button aria-selected={tab === 'feed'} onClick={() => setTab('feed')}>
          À la une
        </button>
        <button aria-selected={tab === 'brief'} onClick={() => setTab('brief')}>
          Le brief du jour
        </button>
      </div>

      <div style={{ marginTop: 14 }}>
        {tab === 'brief' && <DigestCard digest={digest || null} />}

        {tab === 'feed' && (
          <>
            {articles === null &&
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="skeleton" style={{ height: 72, marginBottom: 8 }} />
              ))}
            {articles && articles.length === 0 && (
              <p className="empty">Pas encore d’articles. Le flux se remplit toutes les 2 heures.</p>
            )}
            {articles && articles.map((a) => <NewsItem key={a.id} article={a} />)}
          </>
        )}
      </div>
    </div>
  );
}
