import React from 'react';

const NAV = [
  { label: 'Main Menu', items: [
    { icon: '⚡', label: 'Dashboard', page: 'dashboard' },
    { icon: '📦', label: 'Resources', page: 'inventory' },
    { icon: '📋', label: 'Report Disaster', page: 'report' },
  ]},
  { label: 'Operational', items: [
    { icon: '🚁', label: 'Allocation', page: 'allocation' },
    { icon: '👥', label: 'Volunteers', page: 'volunteers' },
  ]},
];

export default function Sidebar({ page, onNav, currentUser }) {
  const initials = (currentUser?.fullName || 'Alex Morgan')
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-row">
          <div className="brand-icon">🛡️</div>
          <span className="brand-name">DRAMS</span>
        </div>
        <div className="brand-tag">Disaster Resource Allocation &amp; Management</div>
      </div>
      <nav className="sidebar-nav">
        {NAV.map(s => (
          <div key={s.label}>
            <div className="nav-sec-label">{s.label}</div>
            {s.items.map(i => (
              <button key={i.page} className={`nav-link${page === i.page ? ' active' : ''}`} onClick={() => onNav(i.page)}>
                <span className="nav-icon">{i.icon}</span>{i.label}
              </button>
            ))}
          </div>
        ))}
      </nav>
      <div className="sidebar-footer">
        <div className="sys-status"><div className="pulse-dot" />All Nodes Active</div>
        <div className="user-card">
          <div className="user-avatar">{initials}</div>
          <div>
            <div className="user-name">{currentUser?.fullName || 'Alex Morgan'}</div>
            <div className="user-role">{currentUser?.role || 'System Manager'}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
