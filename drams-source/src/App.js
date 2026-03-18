import React, { useState } from 'react';
import './styles/global.css';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Report from './pages/Report';
import Allocation from './pages/Allocation';

export default function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [page, setPage] = useState('dashboard');

  if (!loggedIn) return <Login onLogin={() => setLoggedIn(true)} />;

  const sharedProps = { currentPage: page, onNavigate: setPage };

  return (
    <>
      {page === 'dashboard' && <Dashboard {...sharedProps} />}
      {page === 'inventory' && <Inventory {...sharedProps} />}
      {page === 'report' && <Report {...sharedProps} />}
      {page === 'allocation' && <Allocation {...sharedProps} />}
      {page === 'map' && (
        <div className="app-shell">
          {/* Placeholder for sidebar on map page */}
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, marginLeft: 230, alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--text-secondary)', gap: 12 }}>
            <span style={{ fontSize: 52 }}>🗺️</span>
            <div style={{ fontSize: 18, fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--text-primary)' }}>Incident Map</div>
            <div>Map integration coming soon</div>
            <button className="btn btn-outline" onClick={() => setPage('dashboard')}>← Back to Dashboard</button>
          </div>
        </div>
      )}
    </>
  );
}
