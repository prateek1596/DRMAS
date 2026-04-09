import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import PageState from '../components/PageState';
import { useStore } from '../store';
import { useToast } from '../components/Toast';

const ZONES = ['Zone A – Riverside', 'Zone B – Highland', 'Zone C – Downtown', 'Zone D – Coastal', 'Zone E – Industrial'];
const LEADS = ['Sarah Johnson', 'Mike Torres', 'Emma Wilson', 'Chris Park', 'Aditya Kumar'];

export default function Allocation({ page, onNav, currentUser, onLogout, featureFlags }) {
  const { resources, allocations, createAllocation, loading, error } = useStore();
  const toast = useToast();
  const [form, setForm] = useState({ area: '', resourceId: '', qty: '', volunteer: '' });
  const [allocating, setAllocating] = useState(false);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const availableResources = resources.filter(r => r.status !== 'Assigned' && Number(r.qty) > 0);
  const selectedResource = resources.find(r => r.id === Number(form.resourceId));

  const handleAllocate = async () => {
    if (!form.area || !form.resourceId || !form.qty) { toast('Please fill all required fields.', 'error'); return; }
    const qty = Number(form.qty);
    if (qty <= 0) { toast('Quantity must be greater than 0.', 'error'); return; }
    if (selectedResource && qty > Number(selectedResource.qty)) {
      toast(`Only ${selectedResource.qty} units available.`, 'error'); return;
    }
    setAllocating(true);
    try {
      await createAllocation({
        area: form.area,
        resourceId: Number(form.resourceId),
        qty,
        volunteer: form.volunteer,
      });
      setForm({ area: '', resourceId: '', qty: '', volunteer: '' });
      setAllocating(false);
      toast(`✅ ${qty} units of "${selectedResource?.name}" allocated to ${form.area}`);
    } catch (error) {
      setAllocating(false);
      toast(error.message || 'Unable to allocate resources.', 'error');
    }
  };

  const totalStock = resources.reduce((s, r) => s + Number(r.qty), 0);
  const lowCount = resources.filter(r => r.status === 'Low').length;

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
      <div className="main-area page-allocation">
        <Topbar title="Resource Allocation" subtitle="Deploy personnel and supplies to active response zones." currentUser={currentUser} onLogout={onLogout} />
        <div className="page-body">
          <PageState loading={loading} error={error} />

          <div className="grid-auto anim-1">
            {/* Left - Form */}
            <div>
              <div className="card mb-3">
                <div className="card-header"><span className="card-title">📍 Allocation Details</span></div>

                <div className="form-group">
                  <label className="form-label">Target Area *</label>
                  <select className="form-control" value={form.area} onChange={set('area')}>
                    <option value="">Select an area</option>
                    {ZONES.map(z => <option key={z}>{z}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Resource *</label>
                  <select className="form-control" value={form.resourceId} onChange={set('resourceId')}>
                    <option value="">Select resource</option>
                    {availableResources.map(r => (
                      <option key={r.id} value={r.id}>{r.name} ({r.qty} units available)</option>
                    ))}
                  </select>
                  {availableResources.length === 0 && <div style={{fontSize:11,color:'var(--red)',marginTop:5}}>No available resources in inventory.</div>}
                </div>

                {selectedResource && (
                  <div style={{background:'rgba(255,255,255,.18)',borderRadius:'var(--radius-sm)',padding:'10px 13px',marginBottom:14,fontSize:12,color:'var(--text-secondary)',border:'1px solid rgba(255,255,255,.24)',WebkitBackdropFilter:'blur(12px)',backdropFilter:'blur(12px)'}}>
                    📦 {selectedResource.category} · 📍 {selectedResource.location} · <strong style={{color:'var(--text-primary)'}}>{selectedResource.qty} units available</strong>
                  </div>
                )}

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Quantity *</label>
                    <input className="form-control" type="number" min="1" max={selectedResource?.qty || 9999} placeholder="0" value={form.qty} onChange={set('qty')} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Lead Volunteer</label>
                    <select className="form-control" value={form.volunteer} onChange={set('volunteer')}>
                      <option value="">Choose a lead volunteer</option>
                      {LEADS.map(v => <option key={v}>{v}</option>)}
                    </select>
                  </div>
                </div>

                <button className="btn btn-primary btn-lg" style={{width:'100%',justifyContent:'center',marginTop:6}}
                  onClick={handleAllocate} disabled={allocating || !form.area || !form.resourceId || !form.qty}>
                  {allocating ? <><span className="spinner" /> Allocating…</> : '▶ ALLOCATE RESOURCES'}
                </button>
                <p style={{fontSize:11,color:'var(--text-muted)',textAlign:'center',marginTop:9}}>
                  Inventory levels update automatically upon allocation.
                </p>
              </div>

              {/* Current inventory snapshot */}
              <div className="card">
                <div className="card-header">
                  <span className="card-title">📦 Available Inventory</span>
                  <button className="btn btn-ghost btn-sm" onClick={() => onNav('inventory')}>Manage →</button>
                </div>
                {availableResources.slice(0, 5).map(r => (
                  <div key={r.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'9px 0',borderBottom:'1px solid rgba(255,255,255,.16)',fontSize:13}}>
                    <div>
                      <div style={{fontWeight:600,marginBottom:2}}>{r.name}</div>
                      <div style={{fontSize:11,color:'var(--text-secondary)'}}>{r.location}</div>
                    </div>
                    <span style={{fontFamily:'var(--font-m)',fontWeight:700,color:r.qty<10?'var(--red)':r.qty<20?'var(--orange)':'var(--green)'}}>
                      {r.qty} units
                    </span>
                  </div>
                ))}
                {availableResources.length === 0 && <div style={{fontSize:13,color:'var(--text-muted)',textAlign:'center',padding:20}}>No available inventory</div>}
              </div>
            </div>

            {/* Right - Live status + log */}
            <div>
              <div className="card mb-3">
                <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:14}}>
                  <div className="pulse-dot" />
                  <span className="card-title" style={{fontSize:13}}>LIVE STATUS</span>
                </div>
                {[
                  { label: 'Total Stock', val: totalStock.toLocaleString(), color: 'var(--blue)', sub: `${resources.length} resource types` },
                  { label: 'Critical Low', val: lowCount, color: lowCount > 0 ? 'var(--red)' : 'var(--green)', sub: lowCount > 0 ? 'Needs restocking' : 'All levels OK' },
                ].map(s => (
                  <div key={s.label} style={{background:'rgba(255,255,255,.18)',borderRadius:12,padding:'12px 14px',marginBottom:10,border:'1px solid rgba(255,255,255,.24)',WebkitBackdropFilter:'blur(12px)',backdropFilter:'blur(12px)'}}>
                    <div style={{fontSize:11,color:'var(--text-muted)',marginBottom:4,textTransform:'uppercase',letterSpacing:'.08em'}}>{s.label}</div>
                    <div style={{fontFamily:'var(--font-d)',fontSize:28,fontWeight:700,color:s.color,lineHeight:1}}>{s.val}</div>
                    <div style={{fontSize:11,color:'var(--text-secondary)',marginTop:3}}>{s.sub}</div>
                  </div>
                ))}

                <div className="divider" />

                <div style={{fontSize:12,color:'var(--text-secondary)',marginBottom:8}}>Stock by category</div>
                {['Medical','Water & Sanitation','Shelter','Food'].map(cat => {
                  const catRes = resources.filter(r => r.category === cat);
                  const catTotal = catRes.reduce((s, r) => s + Number(r.qty), 0);
                  const pct = Math.min(100, Math.round((catTotal / Math.max(1, totalStock)) * 100 * 4));
                  return (
                    <div key={cat} style={{marginBottom:10}}>
                      <div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:4}}>
                        <span>{cat}</span><span style={{color:'var(--text-secondary)'}}>{catTotal} units</span>
                      </div>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{width:`${Math.max(5,pct)}%`,background:'linear-gradient(90deg,var(--blue),var(--cyan))'}} />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="card">
                <div className="card-header">
                  <span className="card-title">⚡ Allocation Log</span>
                </div>
                {allocations.slice(0, 6).map(l => (
                  <div key={l.id} className="activity-item">
                    <div style={{fontSize:18,flexShrink:0}}>{l.icon}</div>
                    <div className="activity-content">
                      <div className="activity-title">{l.action}</div>
                      <div className="activity-meta">{l.detail}</div>
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
