import { Navigate, Route, Routes } from 'react-router-dom';
import { TabBar } from './components/TabBar.jsx';
import Growth from './routes/Growth.jsx';
import Track from './routes/Track.jsx';
import News from './routes/News.jsx';
import { isDemo } from './lib/demo.js';

export default function App() {
  const demo = isDemo();

  return (
    <div className="app">
      {demo && (
        <div style={{
          position: 'sticky', top: 0, zIndex: 40, textAlign: 'center',
          fontSize: 11, fontWeight: 600, letterSpacing: '0.02em', color: 'var(--accent)',
          background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(8px)',
          padding: '4px 0', borderBottom: '1px solid var(--hairline)',
        }}>
          MODE DÉMO · données fictives
        </div>
      )}
      <Routes>
        <Route path="/" element={<Navigate to="/growth" replace />} />
        <Route path="/growth" element={<Growth />} />
        <Route path="/track" element={<Track />} />
        <Route path="/news" element={<News />} />
        <Route path="*" element={<Navigate to="/growth" replace />} />
      </Routes>
      <TabBar />
      <p className="disclaimer">
        Données analystes agrégées (Yahoo Finance, Finnhub), potentiellement différées.
        Upside n’est pas un conseil en investissement.
      </p>
    </div>
  );
}
