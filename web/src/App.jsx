import { Navigate, Route, Routes } from 'react-router-dom';
import { TabBar } from './components/TabBar.jsx';
import Growth from './routes/Growth.jsx';
import News from './routes/News.jsx';
import Login from './routes/Login.jsx';
import { useAuth } from './lib/useAuth.js';
import { isDemo } from './lib/demo.js';

export default function App() {
  const { loading } = useAuth();
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
        <Route path="/news" element={<News />} />
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/growth" replace />} />
      </Routes>
      {!loading && <TabBar />}
      <p className="disclaimer">
        Données analystes agrégées (Yahoo Finance, Finnhub), potentiellement différées.
        Upside n’est pas un conseil en investissement.
      </p>
    </div>
  );
}
