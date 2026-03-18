import React from 'react';

export default function Topbar({ title, subtitle, actions }) {
  return (
    <header className="topbar">
      <div className="topbar-left">
        <div className="page-title">{title}</div>
        {subtitle && <div className="page-subtitle">{subtitle}</div>}
      </div>
      <div className="topbar-right">
        <div className="search-wrap">
          <span className="search-icon">🔍</span>
          <input placeholder="Search resources or incidents..." />
        </div>
        <button className="icon-btn" title="Notifications">🔔</button>
        <button className="icon-btn" title="Settings">⚙️</button>
      </div>
      {actions && <div style={{ display: 'flex', gap: 10, marginLeft: 16 }}>{actions}</div>}
    </header>
  );
}
