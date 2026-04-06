import React from 'react';

export default function Topbar({ title, subtitle, actions, currentUser, onLogout }) {
  return (
    <header className="topbar">
      <div>
        <div className="page-title">{title}</div>
        {subtitle && <div className="page-subtitle">{subtitle}</div>}
      </div>
      <div className="topbar-right">
        <div className="search-wrap">
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>🔍</span>
          <input placeholder="Search resources or incidents..." />
        </div>
        <div className="topbar-user-chip">
          <span className="badge badge-blue">{currentUser?.role || 'Admin'}</span>
          <strong>{currentUser?.username || 'admin'}</strong>
        </div>
        <button className="icon-btn">🔔</button>
        <button className="icon-btn">⚙️</button>
        {onLogout && <button className="btn btn-ghost btn-sm" onClick={onLogout}>Logout</button>}
        {actions}
      </div>
    </header>
  );
}
