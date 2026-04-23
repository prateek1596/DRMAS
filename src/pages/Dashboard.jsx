import React, { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import PageState from '../components/PageState';
import { useStore } from '../store';
import { api } from '../api';

export default function Dashboard({ page, onNav, currentUser, onLogout, featureFlags }) {
  const { resources, disasters, allocations, otsTasks, hazardZones, loading, error } = useStore();
  const [trends, setTrends] = useState({ incidentsByDay: [], allocationsByDay: [], stockByCategory: [] });

  const critical = resources.filter(r => r.status === 'Low').length;
  const activeDisasters = disasters.filter(d => d.status === 'Active' || d.status === 'Responding').length;
  const available = resources.reduce((s, r) => s + Number(r.qty), 0);
  const blockedOts = otsTasks.filter(t => t.status === 'Blocked').length;
  const criticalHazardZones = hazardZones.filter(z => z.riskLevel === 'Critical').length;
  const assignedCount = resources.filter((r) => r.status === 'Assigned').length;
  const deploymentRate = resources.length ? Math.round((assignedCount / resources.length) * 100) : 0;
  const readinessScore = Math.max(0, Math.min(100, 100 - activeDisasters * 9 - critical * 6 - blockedOts * 8));
  const last24hAllocations = allocations.filter((item) => {
    const stamp = new Date(item.createdAt || 0).getTime();
    if (!Number.isFinite(stamp) || stamp <= 0) return false;
    return Date.now() - stamp <= 24 * 60 * 60 * 1000;
  });
  const topRiskZones = [...hazardZones]
    .sort((a, b) => Number(b.population || 0) - Number(a.population || 0))
    .slice(0, 3);
  const priorityIncidents = [...disasters]
    .sort((a, b) => {
      const rank = { Critical: 4, High: 3, Moderate: 2, Low: 1 };
      return (rank[b.severity] || 0) - (rank[a.severity] || 0);
    })
    .slice(0, 4);
  const resourcesByLocation = Object.entries(
    resources.reduce((acc, item) => {
      const loc = item.location || 'Unassigned';
      const qty = Number(item.qty || 0);
      if (!acc[loc]) acc[loc] = { location: loc, qty: 0, low: 0 };
      acc[loc].qty += qty;
      if (item.status === 'Low') acc[loc].low += 1;
      return acc;
    }, {})
  )
    .map(([, entry]) => entry)
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 4);

  const recentDisasters = [...disasters].reverse().slice(0, 4);

  useEffect(() => {
    if (featureFlags?.dashboardTrends === false) return;
    api
      .getTrends()
      .then((data) => {
        setTrends({
          incidentsByDay: data?.incidentsByDay || [],
          allocationsByDay: data?.allocationsByDay || [],
          stockByCategory: data?.stockByCategory || [],
        });
      })
      .catch(() => {
        setTrends({ incidentsByDay: [], allocationsByDay: [], stockByCategory: [] });
      });
  }, [featureFlags?.dashboardTrends]);

  const severityColor = (s) => s === 'Critical' ? 'var(--red)' : s === 'High' ? 'var(--orange)' : s === 'Moderate' ? 'var(--yellow)' : 'var(--green)';
  const severityClass = (s) => s === 'Critical' ? 'badge-red' : s === 'High' ? 'badge-orange' : s === 'Moderate' ? 'badge-yellow' : 'badge-green';

  return (
    <div className="app-shell">
      <Sidebar
        page={page}
        onNav={onNav}
        currentUser={currentUser}
        enabledPages={{
          allocation: featureFlags?.allocationModule !== false,
          ots: featureFlags?.otsModule !== false,
          hazard: featureFlags?.hazardModule !== false,
          volunteers: featureFlags?.volunteersModule !== false,
        }}
      />
      <div className="main-area page-dashboard">
        <Topbar title="Admin Overview" subtitle="Real-time resource and disaster tracking panel." currentUser={currentUser} onLogout={onLogout} />
        <div className="page-body">
          <PageState loading={loading} error={error} />

          <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:20,fontSize:12,color:'var(--text-secondary)'}} className="anim-1">
            <div className="pulse-dot" />Last sync: Just now
          </div>

          {/* Stats */}
          <div className="grid-3 mb-4 anim-1">
            <div className="stat-card">
              <div className="stat-glow" style={{background:'rgba(221,76,111,.24)'}} />
              <div className="stat-label">⚠️ Total Disasters</div>
              <div className="stat-value" style={{color:'var(--red)'}}>{disasters.length}</div>
              <div className="stat-delta">{activeDisasters} active incidents</div>
            </div>
            <div className="stat-card">
              <div className="stat-glow" style={{background:'rgba(15,143,149,.25)'}} />
              <div className="stat-label">📦 Resources Available</div>
              <div className="stat-value" style={{color:'var(--blue)'}}>{available.toLocaleString()}</div>
              <div className="stat-delta">{critical} items critically low</div>
            </div>
            <div className="stat-card">
              <div className="stat-glow" style={{background:'rgba(47,154,99,.24)'}} />
              <div className="stat-label">🛰️ OTS / Hazard Alerts</div>
              <div className="stat-value" style={{color:'var(--green)'}}>{blockedOts + criticalHazardZones}</div>
              <div className="stat-delta">{blockedOts} blocked tasks · {criticalHazardZones} critical zones</div>
            </div>
          </div>

          <div className="widget-grid mb-4 anim-2">
            <div className="widget">
              <div className="widget-kicker">Readiness Score</div>
              <div className="widget-value">{readinessScore}%</div>
              <div className="widget-sub">Composite signal from incidents, low stock, and blocked operations.</div>
              <div className="widget-meter"><span style={{ width: `${Math.max(6, readinessScore)}%` }} /></div>
            </div>
            <div className="widget">
              <div className="widget-kicker">Deployment Rate</div>
              <div className="widget-value">{deploymentRate}%</div>
              <div className="widget-sub">{assignedCount} of {resources.length || 0} resource lines currently assigned.</div>
              <div className="widget-meter"><span style={{ width: `${Math.max(6, deploymentRate)}%`, background: 'linear-gradient(90deg,var(--green),var(--cyan))' }} /></div>
            </div>
            <div className="widget">
              <div className="widget-kicker">24h Allocation Tempo</div>
              <div className="widget-value">{last24hAllocations.length}</div>
              <div className="widget-sub">{new Set(last24hAllocations.map((a) => a.volunteer).filter(Boolean)).size} active leads in last 24 hours.</div>
              <div className="widget-meter"><span style={{ width: `${Math.min(100, Math.max(8, last24hAllocations.length * 12))}%`, background: 'linear-gradient(90deg,var(--orange),var(--yellow))' }} /></div>
            </div>
            <div className="widget">
              <div className="widget-kicker">Top Risk Zones</div>
              <div className="widget-list">
                {topRiskZones.map((zone) => (
                  <div className="widget-list-item" key={zone.id}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}><span className="widget-dot" />{zone.name}</span>
                    <strong>{Number(zone.population || 0).toLocaleString()}</strong>
                  </div>
                ))}
                {topRiskZones.length === 0 && <div className="widget-sub">No hazard zones recorded.</div>}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="card anim-2 mb-3">
            <div className="card-header"><span className="card-title">Quick Operational Actions</span></div>
            <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
              <button className="btn btn-primary" onClick={() => onNav('report')}>🚨 Report Disaster</button>
              <button className="btn btn-outline" onClick={() => onNav('inventory')}>📦 Manage Resources</button>
              <button className="btn btn-outline" onClick={() => onNav('allocation')}>🚁 Allocate Resources</button>
              <button className="btn btn-outline" onClick={() => onNav('ots')}>🛰️ OTS Board</button>
              <button className="btn btn-outline" onClick={() => onNav('hazard')}>🗺️ Hazard Zoning</button>
            </div>
          </div>

          <div className="grid-2 anim-3 mb-3">
            <div className="card">
              <div className="card-header">
                <span className="card-title">Operational Briefing</span>
                <span className="badge badge-blue">Live</span>
              </div>
              <div className="brief-list">
                {priorityIncidents.map((item) => (
                  <div className="brief-item" key={item.id}>
                    <div>
                      <div className="activity-title">{item.type} at {item.location}</div>
                      <div className="brief-meta">{item.people?.toLocaleString() || 0} impacted · {item.status}</div>
                    </div>
                    <span className={`badge ${severityClass(item.severity)}`}>{item.severity}</span>
                  </div>
                ))}
                {priorityIncidents.length === 0 && <div className="widget-sub">No active incidents to brief.</div>}
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <span className="card-title">Field Coordination Snapshot</span>
              </div>
              <div className="mini-kpi-row mb-2">
                <div className="mini-kpi">
                  <div className="mini-kpi-label">Open Tasks</div>
                  <div className="mini-kpi-value">{otsTasks.filter((task) => task.status !== 'Done').length}</div>
                </div>
                <div className="mini-kpi">
                  <div className="mini-kpi-label">Resource Transfers</div>
                  <div className="mini-kpi-value">{allocations.length}</div>
                </div>
                <div className="mini-kpi">
                  <div className="mini-kpi-label">Critical Zones</div>
                  <div className="mini-kpi-value">{criticalHazardZones}</div>
                </div>
              </div>
              <div className="brief-list">
                {resourcesByLocation.map((entry) => (
                  <div className="brief-item" key={entry.location}>
                    <div>
                      <div className="activity-title">{entry.location}</div>
                      <div className="brief-meta">{entry.qty.toLocaleString()} units staged</div>
                    </div>
                    <span className={`badge ${entry.low > 0 ? 'badge-red' : 'badge-green'}`}>
                      {entry.low > 0 ? `${entry.low} low` : 'Stable'}
                    </span>
                  </div>
                ))}
                {resourcesByLocation.length === 0 && <div className="widget-sub">No location-level resource data yet.</div>}
              </div>
            </div>
          </div>

          <div className="grid-2 anim-4">
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

          {featureFlags?.dashboardTrends !== false && (
            <div className="card anim-3" style={{ marginTop: 16 }}>
              <div className="card-header">
                <span className="card-title">7-Day Trends</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>Incidents per day</div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, minHeight: 92 }}>
                    {trends.incidentsByDay.map((item) => {
                      const height = Math.max(8, item.value * 18);
                      return (
                        <div key={item.day} title={`${item.day}: ${item.value}`} style={{ flex: 1, textAlign: 'center' }}>
                          <div style={{ height, borderRadius: 8, background: 'linear-gradient(180deg, var(--red), rgba(221,76,111,.45))' }} />
                          <div style={{ marginTop: 6, fontSize: 10, color: 'var(--text-muted)' }}>{item.day.slice(5)}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>Allocated units per day</div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, minHeight: 92 }}>
                    {trends.allocationsByDay.map((item) => {
                      const height = Math.max(8, Math.min(120, item.value * 6));
                      return (
                        <div key={item.day} title={`${item.day}: ${item.value}`} style={{ flex: 1, textAlign: 'center' }}>
                          <div style={{ height, borderRadius: 8, background: 'linear-gradient(180deg, var(--blue), rgba(15,143,149,.45))' }} />
                          <div style={{ marginTop: 6, fontSize: 10, color: 'var(--text-muted)' }}>{item.day.slice(5)}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
