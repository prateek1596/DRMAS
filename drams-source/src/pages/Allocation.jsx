import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';

const areas = ['Zone A – Riverside', 'Zone B – Highland', 'Zone C – Downtown', 'Zone D – Coastal', 'Zone E – Industrial'];
const resourceTypes = ['Medical Supplies', 'Water & Food', 'Shelter Kits', 'Communication Equipment', 'Rescue Tools', 'Power Generators'];
const volunteers = ['Sarah Johnson (Lead)', 'Mike Torres (Lead)', 'Emma Wilson (Lead)', 'Chris Park (Lead)'];

const recentActions = [
  { icon: '💧', action: '500L Water Sent', detail: 'North Sector • 12 mins ago', color: 'var(--cyan)' },
  { icon: '🏥', action: 'Medical Kit Refill', detail: 'Central Plaza • 40 mins ago', color: 'var(--orange)' },
  { icon: '⛺', action: 'Shelter Kits Deployed', detail: 'Zone D Coastal • 2 hrs ago', color: 'var(--green)' },
];

export default function Allocation({ currentPage, onNavigate }) {
  const [form, setForm] = useState({ area: '', type: '', qty: 0, volunteer: '' });
  const [allocated, setAllocated] = useState([]);
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleAllocate = () => {
    if (!form.area || !form.type) return;
    setLoading(true);
    setTimeout(() => {
      setAllocated(a => [{ ...form, id: Date.now(), time: 'just now' }, ...a]);
      setForm({ area: '', type: '', qty: 0, volunteer: '' });
      setLoading(false);
    }, 900);
  };

  return (
    <div className="app-shell">
      <Sidebar currentPage={currentPage} onNavigate={onNavigate} />
      <div className="main-area">
        <Topbar title="Resource Allocation" subtitle="Deploy personnel and supplies to active response zones." />
        <div className="page-body">
          <div className="grid-auto">
            {/* Left: Allocation form */}
            <div>
              <div className="card anim-1">
                <div className="card-header" style={{ marginBottom: 20 }}>
                  <span className="card-title">📍 Allocation Details</span>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Target Area</label>
                    <select className="form-control" value={form.area} onChange={set('area')}>
                      <option value="">Select an area</option>
                      {areas.map(a => <option key={a}>{a}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Resource Type</label>
                    <select className="form-control" value={form.type} onChange={set('type')}>
                      <option value="">Select resource type</option>
                      {resourceTypes.map(r => <option key={r}>{r}</option>)}
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Quantity (Units)</label>
                    <input
                      className="form-control"
                      type="number"
                      min={0}
                      value={form.qty}
                      onChange={set('qty')}
                      placeholder="0"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Assign Volunteer</label>
                    <select className="form-control" value={form.volunteer} onChange={set('volunteer')}>
                      <option value="">Choose a lead volunteer</option>
                      {volunteers.map(v => <option key={v}>{v}</option>)}
                    </select>
                  </div>
                </div>

                <button
                  className="btn btn-primary btn-lg"
                  style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
                  onClick={handleAllocate}
                  disabled={loading || !form.area || !form.type}
                >
                  {loading ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Allocating...</> : '▶ ALLOCATE RESOURCES'}
                </button>

                <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', marginTop: 10 }}>
                  System will automatically update real-time inventory levels upon submission.
                </p>
              </div>

              {/* Allocated history */}
              {allocated.length > 0 && (
                <div className="card anim-2" style={{ marginTop: 20 }}>
                  <div className="card-header" style={{ marginBottom: 14 }}>
                    <span className="card-title">✅ Recently Allocated</span>
                  </div>
                  {allocated.slice(0, 5).map(a => (
                    <div key={a.id} className="activity-item">
                      <div className="activity-dot" style={{ background: 'var(--green)', boxShadow: '0 0 6px var(--green)' }} />
                      <div className="activity-content">
                        <div className="activity-title">{a.type} → {a.area}</div>
                        <div className="activity-meta">{a.qty} units{a.volunteer ? ` · ${a.volunteer}` : ''} · {a.time}</div>
                      </div>
                      <span className="badge badge-green">Sent</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Live status */}
            <div>
              <div className="card anim-2 mb-3">
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
                  <div className="status-pulse" style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 8px var(--green)', animation: 'pulse 2s infinite' }} />
                  <span className="card-title" style={{ fontSize: 13 }}>LIVE STATUS</span>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <div className="flex-between mb-2" style={{ fontSize: 12.5 }}>
                    <span>Medical Stock</span>
                    <span style={{ color: 'var(--orange)', fontWeight: 700 }}>64%</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: '64%', background: 'linear-gradient(90deg, var(--orange), #FFB347)' }} />
                  </div>
                </div>

                <div>
                  <div className="flex-between mb-2" style={{ fontSize: 12.5 }}>
                    <span>Personnel Active</span>
                    <span style={{ color: 'var(--blue)', fontWeight: 700 }}>12 / 48</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: '25%', background: 'linear-gradient(90deg, var(--blue), var(--cyan))' }} />
                  </div>
                </div>

                <div className="divider" />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {[
                    { label: 'Zones Active', value: '7', color: 'var(--green)' },
                    { label: 'Pending Dispatches', value: '3', color: 'var(--yellow)' },
                    { label: 'Resources Sent Today', value: '42', color: 'var(--blue)' },
                    { label: 'Critical Zones', value: '2', color: 'var(--red)' },
                  ].map(s => (
                    <div key={s.label} style={{ background: 'var(--bg-base)', borderRadius: 8, padding: '10px 12px', border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{s.label}</div>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card anim-3">
                <div className="card-header" style={{ marginBottom: 14 }}>
                  <span className="card-title">⚡ Recent Actions</span>
                  <button className="btn btn-ghost btn-sm">View All Logs →</button>
                </div>
                {recentActions.map((a) => (
                  <div key={a.action} className="activity-item">
                    <div style={{ fontSize: 18, flexShrink: 0 }}>{a.icon}</div>
                    <div className="activity-content">
                      <div className="activity-title">{a.action}</div>
                      <div className="activity-meta">{a.detail}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
