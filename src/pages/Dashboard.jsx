import React from 'react';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import { useStore } from '../store';

export default function Dashboard({ page, onNav, currentUser, onLogout }) {
  const { resources, disasters } = useStore();

  const critical = resources.filter(r => r.status === 'Low').length;
  const activeDisasters = disasters.filter(d => d.status === 'Active' || d.status === 'Responding').length;
  const available = resources.reduce((s, r) => s + Number(r.qty), 0);

  const recentDisasters = [...disasters].reverse().slice(0, 4);

  const severityColor = (s) => s === 'Critical' ? 'var(--red)' : s === 'High' ? 'var(--orange)' : s === 'Moderate' ? 'var(--yellow)' : 'var(--green)';
  const severityClass = (s) => s === 'Critical' ? 'badge-red' : s === 'High' ? 'badge-orange' : s === 'Moderate' ? 'badge-yellow' : 'badge-green';

  return (
    <div className="app-shell">
      <Sidebar page={page} onNav={onNav} currentUser={currentUser} />
      <div className="main-area page-dashboard">
        <Topbar title="Admin Overview" subtitle="Real-time resource and disaster tracking panel." currentUser={currentUser} onLogout={onLogout} />
        <div className="page-body">
          <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:20,fontSize:12,color:'var(--text-secondary)'}} className="anim-1">
            <div className="pulse-dot" />Last sync: Just now
          </div>

          {/* Stats */}
          <div className="grid-3 mb-4 anim-1">
            <div className="stat-card">
              <div className="stat-glow" style={{background:'rgba(255,61,85,.25)'}} />
              <div className="stat-label">⚠️ Total Disasters</div>
              <div className="stat-value" style={{color:'var(--red)'}}>{disasters.length}</div>
              <div className="stat-delta">{activeDisasters} active incidents</div>
            </div>
            <div className="stat-card">
              <div className="stat-glow" style={{background:'rgba(79,110,255,.25)'}} />
              <div className="stat-label">📦 Resources Available</div>
              <div className="stat-value" style={{color:'var(--blue)'}}>{available.toLocaleString()}</div>
              <div className="stat-delta">{critical} items critically low</div>
            </div>
            <div className="stat-card">
              <div className="stat-glow" style={{background:'rgba(16,232,122,.25)'}} />
              <div className="stat-label">👥 Volunteers Active</div>
              <div className="stat-value" style={{color:'var(--green)'}}>456</div>
              <div className="stat-delta">+24 new sign-ups today</div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="card anim-2 mb-3">
            <div className="card-header"><span className="card-title">Quick Operational Actions</span></div>
            <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
              <button className="btn btn-primary" onClick={() => onNav('report')}>🚨 Report Disaster</button>
              <button className="btn btn-outline" onClick={() => onNav('inventory')}>📦 Manage Resources</button>
              <button className="btn btn-outline" onClick={() => onNav('allocation')}>🚁 Allocate Resources</button>
            </div>
          </div>

          <div className="grid-2 anim-3">
            {/* Recent disasters */}
            <div className="card">
              <div className="card-header">
                <span className="card-title">Recent Incidents</span>
                <button className="btn btn-ghost btn-sm" onClick={() => onNav('report')}>View all →</button>
              </div>
              {recentDisasters.map(d => (
                <div key={d.id} className="activity-item">
                  <div className="activity-dot" style={{background:severityColor(d.severity),boxShadow:`0 0 6px ${severityColor(d.severity)}`}} />
                  <div className="activity-content">
                    <div className="activity-title">{d.type} — {d.location}</div>
                    <div className="activity-meta">{d.people?.toLocaleString()} people affected · {d.status}</div>
                  </div>
                  <span className={`badge ${severityClass(d.severity)}`}>{d.severity}</span>
                </div>
              ))}
              {disasters.length === 0 && <div style={{fontSize:13,color:'var(--text-muted)',textAlign:'center',padding:'20px 0'}}>No incidents reported</div>}
            </div>

            {/* Low stock */}
            <div className="card">
              <div className="card-header">
                <span className="card-title">⚠️ Low Stock Alerts</span>
                <button className="btn btn-ghost btn-sm" onClick={() => onNav('inventory')}>Manage →</button>
              </div>
              {resources.filter(r => r.status === 'Low').map(r => (
                <div key={r.id} className="activity-item">
                  <div className="activity-dot" style={{background:'var(--red)',boxShadow:'0 0 6px var(--red)'}} />
                  <div className="activity-content">
                    <div className="activity-title">{r.name}</div>
                    <div className="activity-meta">{r.location} · Only {r.qty} units left</div>
                  </div>
                  <span className="badge badge-red">Low</span>
                </div>
              ))}
              {resources.filter(r => r.status === 'Low').length === 0 && (
                <div style={{fontSize:13,color:'var(--text-muted)',textAlign:'center',padding:'20px 0'}}>✅ All stock levels normal</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
