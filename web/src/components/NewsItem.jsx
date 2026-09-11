import { useState } from 'react';
import { relDate } from '../lib/format.js';

// Logos d'actions par ticker, sans clé : FMP puis Parqet en secours, sinon monogramme.
function logoSources(symbol) {
  if (!symbol) return [];
  const s = encodeURIComponent(symbol);
  return [
    `https://financialmodelingprep.com/image-stock/${s}.png`,
    `https://assets.parqet.com/logos/symbol/${s}`,
  ];
}

function StockLogo({ symbol, name }) {
  const sources = logoSources(symbol);
  const [idx, setIdx] = useState(0);

  if (idx >= sources.length) {
    const letter = (name || symbol || '?').trim().charAt(0).toUpperCase();
    return <div className="thumb thumb-mono">{letter}</div>;
  }
  return (
    <img
      className="thumb thumb-logo"
      src={sources[idx]}
      alt=""
      loading="lazy"
      onError={() => setIdx((i) => i + 1)}
    />
  );
}

export function NewsItem({ article }) {
  const sec = article.securities;
  return (
    <a className="news-item" href={article.url} target="_blank" rel="noreferrer">
      <StockLogo symbol={sec?.symbol_yahoo} name={sec?.name} />
      <div>
        <div className="headline">{article.headline_fr || article.headline}</div>
        <div className="meta">
          {sec?.name ? `${sec.name} · ` : ''}
          {article.source} · {relDate(article.published_at)}
        </div>
      </div>
    </a>
  );
}
