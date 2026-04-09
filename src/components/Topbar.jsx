import React from 'react';

export default function Topbar({ title, subtitle, actions, currentUser, onLogout }) {
  const [notice, setNotice] = React.useState('');

  return (
    <header className="topbar">
      <div>
        <div className="page-title">{title}</div>
        {subtitle && <div className="page-subtitle">{subtitle}</div>}
        {notice && <div className="text-muted" style={{ marginTop: 4 }}>{notice}</div>}
      </div>
      <div className="topbar-right">
        <div className="search-wrap">
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>🔍</span>
          <input placeholder="Search resources or incidents..." />
        </div>
        <div className="topbar-user-chip">
          <strong>{currentUser?.username || 'admin'}</strong>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Operator Console</span>
        </div>
        <button className="icon-btn" onClick={() => setNotice('No new alerts. All systems are synced.')}>🔔</button>
        <button className="icon-btn" onClick={() => setNotice('Settings panel coming next: notifications, profile and API preferences.')}>⚙️</button>
        {onLogout && <button className="btn btn-ghost btn-sm" onClick={onLogout}>Logout</button>}
        {actions}
      </div>
    </header>
  );
}
