import React from 'react';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';

const stats = [
  { label: 'Total Disasters', value: '24', delta: '+3 from last month', color: 'var(--red)', icon: '⚠️', glow: 'rgba(255,61,85,0.25)' },
  { label: 'Resources Available', value: '1,280', delta: '↓11 units needed', color: 'var(--blue)', icon: '📦', glow: 'rgba(79,110,255,0.25)' },
  { label: 'Volunteers Active', value: '456', delta: '+24 new sign-ups today', color: 'var(--green)', icon: '👥', glow: 'rgba(16,232,122,0.25)' },
];

const activityLog = [
  { id: 1, title: 'Critical Flooding Reported', meta: 'Sector 6-E, Riverside Area • 12 mins ago', color: 'var(--red)', badge: 'HIGH ALERT', badgeClass: 'badge-red' },
  { id: 2, title: 'Medical Supplies Dispatched', meta: 'To City General Hospital • 40 mins ago', color: 'var(--orange)', badge: 'PROCESSING', badgeClass: 'badge-orange' },
  { id: 3, title: 'New Volunteer Team Registered', meta: 'Team Medical Hooks • 2 hours ago', color: 'var(--green)', badge: 'CONFIRMED', badgeClass: 'badge-green' },
];

export default function Dashboard({ currentPage, onNavigate }) {
  return (
    <div className="app-shell">
      <Sidebar currentPage={currentPage} onNavigate={onNavigate} />
      <div className="main-area">
        <Topbar
          title="Admin Overview"
          subtitle="Real-time resource and disaster tracking panel."
        />
        <div className="page-body">
          {/* Sync status */}
          <div className="anim-1" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 22, fontSize: 12, color: 'var(--text-secondary)' }}>
            <span className="status-pulse" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 8px var(--green)', display: 'inline-block' }} />
            Last sync: Just now
          </div>

          {/* Stats */}
          <div className="grid-3 mb-4 anim-1">
            {stats.map((s) => (
              <div className="stat-card" key={s.label}>
                <div className="stat-glow" style={{ background: s.glow }} />
                <div className="stat-label">{s.label}</div>
                <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
                <div className="stat-delta">{s.delta}</div>
                <div className="stat-icon-wrap" style={{ background: `${s.glow}`, borderRadius: 8 }}>
                  {s.icon}
                </div>
              </div>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="card anim-2 mb-3">
            <div className="card-header">
              <span className="card-title">Quick Operational Actions</span>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button className="btn btn-primary" onClick={() => onNavigate('report')}>
                🚨 Report Disaster
              </button>
              <button className="btn btn-outline" onClick={() => onNavigate('inventory')}>
                📦 Manage Resources
              </button>
              <button className="btn btn-outline">
                📊 View Reports
              </button>
            </div>
          </div>

          {/* Activity Log */}
          <div className="card anim-3">
            <div className="card-header">
              <span className="card-title">Recent Activity Log</span>
              <button className="btn btn-ghost btn-sm">View all logs →</button>
            </div>
            {activityLog.map((item) => (
              <div className="activity-item" key={item.id}>
                <div className="activity-dot" style={{ background: item.color, boxShadow: `0 0 8px ${item.color}` }} />
                <div className="activity-content">
                  <div className="activity-title">{item.title}</div>
                  <div className="activity-meta">{item.meta}</div>
                </div>
                <span className={`badge ${item.badgeClass}`}>{item.badge}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
