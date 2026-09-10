import { relDate } from '../lib/format.js';

export function NewsItem({ article }) {
  const sec = article.securities;
  return (
    <a className="news-item" href={article.url} target="_blank" rel="noreferrer">
      {article.image_url ? (
        <img className="thumb" src={article.image_url} alt="" loading="lazy" />
      ) : (
        <div className="thumb" />
      )}
      <div>
        <div className="headline">{article.headline}</div>
        <div className="meta">
          {sec?.name ? `${sec.name} · ` : ''}
          {article.source} · {relDate(article.published_at)}
        </div>
      </div>
    </a>
  );
}
