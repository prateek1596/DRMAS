import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';

const resources = [
  { id: 1, name: 'MacBook Pro M3 Max', sku: 'MBP-M3-MAX-001', qty: 42, location: 'Storage Wing A', status: 'Available', statusClass: 'badge-green' },
  { id: 2, name: 'Dell UltraSharp 32"', sku: 'DEL-US32-002', qty: 19, location: 'Conference Room 4', status: 'Assigned', statusClass: 'badge-blue' },
  { id: 3, name: 'HP LaserJet Enterprise', sku: 'HP-LJE-003', qty: 3, location: 'Main Office Lobby', status: 'Low', statusClass: 'badge-red' },
  { id: 4, name: 'Logitech MX Master 3S', sku: 'LOG-MXM3S-004', qty: 85, location: 'Storage Wing B', status: 'Available', statusClass: 'badge-green' },
  { id: 5, name: 'Field Medical Kit', sku: 'MED-FMK-005', qty: 12, location: 'Zone D Depot', status: 'Low', statusClass: 'badge-red' },
  { id: 6, name: 'Water Purifier Unit', sku: 'WPU-006', qty: 60, location: 'Zone A Depot', status: 'Available', statusClass: 'badge-green' },
];

const tabs = ['All Resources', 'Low Stock', 'Categories'];

export default function Inventory({ currentPage, onNavigate }) {
  const [activeTab, setActiveTab] = useState('All Resources');
  const [search, setSearch] = useState('');

  const filtered = resources.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.location.toLowerCase().includes(search.toLowerCase())
  ).filter(r => activeTab === 'Low Stock' ? r.status === 'Low' : true);

  return (
    <div className="app-shell">
      <Sidebar currentPage={currentPage} onNavigate={onNavigate} />
      <div className="main-area">
        <Topbar
          title="Resource Inventory"
          subtitle="Manage and track your organization's assets in real-time."
        />
        <div className="page-body">
          {/* Stats row */}
          <div className="grid-3 mb-4 anim-1">
            <div className="stat-card">
              <div className="stat-glow" style={{ background: 'rgba(79,110,255,0.2)' }} />
              <div className="stat-label">📦 Total Items</div>
              <div className="stat-value" style={{ color: 'var(--blue)' }}>1,284</div>
              <div className="stat-delta">↑9% this week</div>
            </div>
            <div className="stat-card">
              <div className="stat-glow" style={{ background: 'rgba(16,232,122,0.2)' }} />
              <div className="stat-label">✅ Assigned</div>
              <div className="stat-value" style={{ color: 'var(--green)' }}>856</div>
              <div className="stat-delta">67% utilization</div>
            </div>
            <div className="stat-card">
              <div className="stat-glow" style={{ background: 'rgba(255,61,85,0.2)' }} />
              <div className="stat-label">⚠️ Critical Stock</div>
              <div className="stat-value" style={{ color: 'var(--red)' }}>14</div>
              <div className="stat-delta" style={{ color: 'var(--red)' }}>Requires action</div>
            </div>
          </div>

          {/* Table card */}
          <div className="card anim-2">
            <div className="card-header">
              <div style={{ display: 'flex', gap: 0, background: 'var(--bg-base)', borderRadius: 8, padding: 4, border: '1px solid var(--border)' }}>
                {tabs.map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: 6,
                      border: 'none',
                      background: activeTab === tab ? 'var(--blue)' : 'transparent',
                      color: activeTab === tab ? 'white' : 'var(--text-secondary)',
                      fontSize: 12.5,
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontFamily: 'var(--font-body)',
                      transition: 'all 0.2s',
                    }}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <div className="search-wrap" style={{ minWidth: 180 }}>
                  <span className="search-icon">🔍</span>
                  <input
                    placeholder="Search resources..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>
                <button className="btn btn-outline btn-sm">⚙️ Filter</button>
                <button className="btn btn-primary btn-sm">+ Add Resource</button>
              </div>
            </div>

            <table className="data-table">
              <thead>
                <tr>
                  <th>Resource Name</th>
                  <th>Quantity</th>
                  <th>Location</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 13.5 }}>{r.name}</div>
                      <div className="text-mono" style={{ color: 'var(--text-muted)', marginTop: 2 }}>{r.sku}</div>
                    </td>
                    <td>
                      <span style={{
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 600,
                        color: r.qty < 10 ? 'var(--red)' : r.qty < 20 ? 'var(--orange)' : 'var(--text-primary)'
                      }}>{r.qty}</span>
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>📍 {r.location}</td>
                    <td><span className={`badge ${r.statusClass}`}>● {r.status}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-ghost btn-sm">Edit</button>
                        <button className="btn btn-ghost btn-sm">Assign</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, fontSize: 12, color: 'var(--text-secondary)' }}>
              <span>Showing {filtered.length} of {resources.length} results</span>
              <div style={{ display: 'flex', gap: 4 }}>
                {[1,2,3].map(p => (
                  <button key={p} style={{
                    width: 28, height: 28, borderRadius: 6, border: '1px solid var(--border)',
                    background: p === 1 ? 'var(--blue)' : 'var(--bg-base)',
                    color: p === 1 ? 'white' : 'var(--text-secondary)',
                    fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-body)',
                  }}>{p}</button>
                ))}
                <button style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-base)', color: 'var(--text-secondary)', fontSize: 12, cursor: 'pointer' }}>›</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
