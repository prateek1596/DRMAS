import React from 'react';

const navSections = [
  {
    label: 'Main Menu',
    items: [
      { icon: '⚡', label: 'Dashboard', page: 'dashboard' },
      { icon: '📦', label: 'Resources', page: 'inventory' },
      { icon: '📋', label: 'Reports', page: 'report' },
    ],
  },
  {
    label: 'Operational',
    items: [
      { icon: '👥', label: 'Volunteers', page: 'allocation' },
      { icon: '🗺️', label: 'Incident Map', page: 'map' },
    ],
  },
];

export default function Sidebar({ currentPage, onNavigate }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-logo">
          <div className="brand-icon">🛡️</div>
          <span className="brand-name">DRAMS</span>
        </div>
        <div className="brand-tagline">Disaster Resource Allocation &amp; Management System</div>
      </div>

      <nav className="sidebar-nav">
        {navSections.map((section) => (
          <div key={section.label}>
            <div className="nav-section-label">{section.label}</div>
            {section.items.map((item) => (
              <button
                key={item.page}
                className={`nav-link${currentPage === item.page ? ' active' : ''}`}
                onClick={() => onNavigate(item.page)}
              >
                <span className="nav-icon">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="system-status">
          <div className="status-pulse" />
          All Nodes Active
        </div>
        <div className="user-card">
          <div className="user-avatar">AM</div>
          <div>
            <div className="user-name">Alex Morgan</div>
            <div className="user-role">System Manager</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
