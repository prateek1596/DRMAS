import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import Modal from '../components/Modal';
import { useStore } from '../store';
import { useToast } from '../components/Toast';

const TYPES = ['Flood', 'Earthquake', 'Wildfire', 'Hurricane', 'Tornado', 'Drought', 'Chemical Spill', 'Landslide', 'Tsunami', 'Disease Outbreak', 'Other'];
const SEVERITIES = ['Critical', 'High', 'Moderate', 'Low'];

const BLANK = { type: '', severity: '', location: '', people: '', time: '', info: '' };

function severityBadge(s) {
  return s === 'Critical' ? 'badge-red' : s === 'High' ? 'badge-orange' : s === 'Moderate' ? 'badge-yellow' : 'badge-green';
}
function statusBadge(s) {
  return s === 'Active' ? 'badge-red' : s === 'Responding' ? 'badge-orange' : 'badge-green';
}

function DisasterForm({ value, onChange }) {
  const set = k => e => onChange({ ...value, [k]: e.target.value });
  return (
    <>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Disaster Type *</label>
          <select className="form-control" value={value.type} onChange={set('type')} required>
            <option value="">Select Type</option>
            {TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Severity Level *</label>
          <select className="form-control" value={value.severity} onChange={set('severity')} required>
            <option value="">Select Severity</option>
            {SEVERITIES.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Location *</label>
        <div style={{position:'relative'}}>
          <span style={{position:'absolute',left:11,top:'50%',transform:'translateY(-50%)',fontSize:13}}>📍</span>
          <input className="form-control" style={{paddingLeft:34}} placeholder="Affected area name or GPS coordinates" value={value.location} onChange={set('location')} required />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">People Affected</label>
          <input className="form-control" type="number" min="0" placeholder="Approximate number" value={value.people} onChange={set('people')} />
        </div>
        <div className="form-group">
          <label className="form-label">Time of Incident</label>
          <input className="form-control" type="datetime-local" value={value.time} onChange={set('time')} />
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Additional Information</label>
        <textarea className="form-control" placeholder="Describe the situation, required resources, or immediate hazards..." value={value.info} onChange={set('info')} />
      </div>
    </>
  );
}

export default function Report({ page, onNav, currentUser, onLogout }) {
  const { disasters, addDisaster, updateDisaster, deleteDisaster } = useStore();
  const toast = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [viewTarget, setViewTarget] = useState(null);
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = disasters.filter(d =>
    d.type.toLowerCase().includes(search.toLowerCase()) ||
    d.location.toLowerCase().includes(search.toLowerCase())
  );

  const openEdit = (d) => {
    setEditTarget(d);
    setForm({ type: d.type, severity: d.severity, location: d.location, people: d.people || '', time: d.time || '', info: d.info || '' });
  };

  const handleAdd = () => {
    if (!form.type || !form.severity || !form.location) { toast('Please fill all required fields.', 'error'); return; }
    setSaving(true);
    setTimeout(() => {
      addDisaster(form);
      setForm(BLANK); setShowAdd(false); setSaving(false);
      toast(`🚨 Disaster report submitted: ${form.type} at ${form.location}`);
    }, 700);
  };

  const handleEdit = () => {
    if (!form.type || !form.severity || !form.location) { toast('Please fill all required fields.', 'error'); return; }
    setSaving(true);
    setTimeout(() => {
      updateDisaster(editTarget.id, form);
      setEditTarget(null); setSaving(false);
      toast('✅ Disaster report updated.');
    }, 600);
  };

  const handleDelete = () => {
    deleteDisaster(deleteTarget.id);
    toast(`🗑️ Disaster report #${deleteTarget.id} removed.`, 'info');
    setDeleteTarget(null);
  };

  const toggleStatus = (d) => {
    const next = d.status === 'Active' ? 'Responding' : d.status === 'Responding' ? 'Resolved' : 'Active';
    updateDisaster(d.id, { status: next });
    toast(`Status updated to "${next}".`, 'info');
  };

  const active = disasters.filter(d => d.status === 'Active').length;
  const responding = disasters.filter(d => d.status === 'Responding').length;
  const resolved = disasters.filter(d => d.status === 'Resolved').length;

  return (
    <div className="app-shell">
      <Sidebar page={page} onNav={onNav} currentUser={currentUser} />
      <div className="main-area page-report">
        <Topbar title="Disaster Reports" subtitle="Submit and manage high-priority incident reports." currentUser={currentUser} onLogout={onLogout} />
        <div className="page-body">

          {/* Stats */}
          <div className="grid-3 mb-4 anim-1">
            <div className="stat-card">
              <div className="stat-glow" style={{background:'rgba(255,61,85,.2)'}} />
              <div className="stat-label">🔴 Active</div>
              <div className="stat-value" style={{color:'var(--red)'}}>{active}</div>
              <div className="stat-delta">Require immediate action</div>
            </div>
            <div className="stat-card">
              <div className="stat-glow" style={{background:'rgba(255,140,66,.2)'}} />
              <div className="stat-label">🟠 Responding</div>
              <div className="stat-value" style={{color:'var(--orange)'}}>{responding}</div>
              <div className="stat-delta">Teams deployed</div>
            </div>
            <div className="stat-card">
              <div className="stat-glow" style={{background:'rgba(16,232,122,.2)'}} />
              <div className="stat-label">✅ Resolved</div>
              <div className="stat-value" style={{color:'var(--green)'}}>{resolved}</div>
              <div className="stat-delta">Incidents closed</div>
            </div>
          </div>

          {/* Table */}
          <div className="card anim-2">
            <div className="card-header" style={{flexWrap:'wrap',gap:12}}>
              <span className="card-title">All Incidents ({disasters.length})</span>
              <div style={{display:'flex',gap:9,flexWrap:'wrap'}}>
                <div className="search-wrap" style={{minWidth:190}}>
                  <span style={{fontSize:13,color:'var(--text-muted)'}}>🔍</span>
                  <input placeholder="Search incidents..." value={search} onChange={e=>setSearch(e.target.value)} />
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => { setForm(BLANK); setShowAdd(true); }}>🚨 Report Disaster</button>
              </div>
            </div>

            <div style={{overflowX:'auto'}}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Severity</th>
                    <th>Location</th>
                    <th>People</th>
                    <th>Status</th>
                    <th>Reported By</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(d => (
                    <tr key={d.id}>
                      <td><span style={{fontWeight:700}}>🌊 {d.type}</span></td>
                      <td><span className={`badge ${severityBadge(d.severity)}`}>{d.severity}</span></td>
                      <td style={{color:'var(--text-secondary)',fontSize:12.5}}>📍 {d.location}</td>
                      <td style={{fontFamily:'var(--font-m)'}}>{d.people ? Number(d.people).toLocaleString() : '—'}</td>
                      <td>
                        <button onClick={() => toggleStatus(d)} title="Click to advance status"
                          className={`badge ${statusBadge(d.status)}`}
                          style={{cursor:'pointer',border:'none',background:undefined}}>
                          ● {d.status}
                        </button>
                      </td>
                      <td style={{color:'var(--text-secondary)',fontSize:12.5}}>{d.reportedBy}</td>
                      <td>
                        <div style={{display:'flex',gap:5}}>
                          <button className="btn btn-ghost btn-sm" title="View" onClick={() => setViewTarget(d)}>👁️</button>
                          <button className="btn btn-ghost btn-sm" title="Edit" onClick={() => openEdit(d)}>✏️</button>
                          <button className="btn btn-ghost btn-sm" title="Delete" onClick={() => setDeleteTarget(d)} style={{color:'var(--red)'}}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr><td colSpan={7} style={{textAlign:'center',padding:'28px 0',color:'var(--text-muted)'}}>No incidents found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Add Modal */}
      {showAdd && (
        <Modal title="🚨 Report New Disaster" onClose={() => setShowAdd(false)} size="lg"
          footer={<>
            <p style={{fontSize:11,color:'var(--text-muted)',flex:1}}>⚠️ False reporting is a punishable offense</p>
            <button className="btn btn-ghost" onClick={() => setShowAdd(false)}>Cancel</button>
            <button className="btn btn-danger" onClick={handleAdd} disabled={saving}>
              {saving ? <><span className="spinner" /> Submitting…</> : '📡 Submit Report'}
            </button>
          </>}>
          <DisasterForm value={form} onChange={setForm} />
        </Modal>
      )}

      {/* Edit Modal */}
      {editTarget && (
        <Modal title="✏️ Edit Disaster Report" onClose={() => setEditTarget(null)} size="lg"
          footer={<>
            <button className="btn btn-ghost" onClick={() => setEditTarget(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleEdit} disabled={saving}>
              {saving ? <><span className="spinner" /> Saving…</> : 'Save Changes'}
            </button>
          </>}>
          <DisasterForm value={form} onChange={setForm} />
        </Modal>
      )}

      {/* View Modal */}
      {viewTarget && (
        <Modal title="📋 Incident Details" onClose={() => setViewTarget(null)}
          footer={<>
            <button className="btn btn-ghost" onClick={() => setViewTarget(null)}>Close</button>
            <button className="btn btn-outline" onClick={() => { setViewTarget(null); openEdit(viewTarget); }}>✏️ Edit</button>
          </>}>
          {[
            ['Type', viewTarget.type],
            ['Severity', viewTarget.severity],
            ['Location', viewTarget.location],
            ['People Affected', viewTarget.people ? Number(viewTarget.people).toLocaleString() : 'Unknown'],
            ['Time of Incident', viewTarget.time || 'Not specified'],
            ['Status', viewTarget.status],
            ['Reported By', viewTarget.reportedBy],
          ].map(([k, v]) => (
            <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'9px 0',borderBottom:'1px solid var(--border)',fontSize:13}}>
              <span style={{color:'var(--text-secondary)',fontWeight:600,fontSize:11,textTransform:'uppercase',letterSpacing:'.06em'}}>{k}</span>
              <span>{v}</span>
            </div>
          ))}
          {viewTarget.info && (
            <div style={{marginTop:14,padding:14,background:'var(--bg-raised)',borderRadius:'var(--radius-sm)',fontSize:13,color:'var(--text-secondary)',lineHeight:1.6}}>
              {viewTarget.info}
            </div>
          )}
        </Modal>
      )}

      {/* Delete Confirm */}
      {deleteTarget && (
        <Modal title="🗑️ Delete Report" onClose={() => setDeleteTarget(null)}
          footer={<>
            <button className="btn btn-ghost" onClick={() => setDeleteTarget(null)}>Cancel</button>
            <button className="btn btn-danger" onClick={handleDelete}>Delete Report</button>
          </>}>
          <p style={{fontSize:13.5,lineHeight:1.6,color:'var(--text-secondary)'}}>
            Are you sure you want to delete the <strong style={{color:'var(--text-primary)'}}>{deleteTarget.type}</strong> report at <strong style={{color:'var(--text-primary)'}}>{deleteTarget.location}</strong>? This cannot be undone.
          </p>
        </Modal>
      )}
    </div>
  );
}
