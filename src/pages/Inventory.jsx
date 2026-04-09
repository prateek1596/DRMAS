import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import Modal from '../components/Modal';
import PageState from '../components/PageState';
import { useStore } from '../store';
import { useToast } from '../components/Toast';

const CATEGORIES = ['Medical', 'Water & Sanitation', 'Shelter', 'Food', 'Power', 'Rescue', 'Communication', 'Transport', 'Other'];
const LOCATIONS = ['Zone A Depot', 'Zone B Depot', 'Zone C Depot', 'Zone D Depot', 'Storage Wing A', 'Storage Wing B', 'Cold Storage A', 'Main Depot', 'HQ Storage'];
const TABS = ['All Resources', 'Low Stock', 'Assigned'];

const BLANK = { name: '', category: '', qty: '', location: '', notes: '' };

function ResourceForm({ value, onChange }) {
  const set = k => e => onChange({ ...value, [k]: e.target.value });
  return (
    <>
      <div className="form-group">
        <label className="form-label">Resource Name *</label>
        <input className="form-control" placeholder="e.g. Field Medical Kit" value={value.name} onChange={set('name')} required />
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Category *</label>
          <select className="form-control" value={value.category} onChange={set('category')} required>
            <option value="">Select category</option>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Quantity *</label>
          <input className="form-control" type="number" min="0" placeholder="0" value={value.qty} onChange={set('qty')} required />
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Storage Location *</label>
        <select className="form-control" value={value.location} onChange={set('location')} required>
          <option value="">Select location</option>
          {LOCATIONS.map(l => <option key={l}>{l}</option>)}
        </select>
      </div>
      <div className="form-group">
        <label className="form-label">Notes</label>
        <textarea className="form-control" placeholder="Additional details..." value={value.notes || ''} onChange={set('notes')} />
      </div>
    </>
  );
}

export default function Inventory({ page, onNav, currentUser, onLogout, featureFlags }) {
  const { resources, addResource, updateResource, deleteResource, assignResource, unassignResource, loading, error } = useStore();
  const toast = useToast();
  const [tab, setTab] = useState('All Resources');
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [assignTarget, setAssignTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState(BLANK);
  const [assignTo, setAssignTo] = useState('');
  const [saving, setSaving] = useState(false);

  const filtered = resources
    .filter(r => tab === 'Low Stock' ? r.status === 'Low' : tab === 'Assigned' ? r.status === 'Assigned' : true)
    .filter(r => r.name.toLowerCase().includes(search.toLowerCase()) || r.location.toLowerCase().includes(search.toLowerCase()));

  const statusClass = s => s === 'Low' ? 'badge-red' : s === 'Assigned' ? 'badge-blue' : 'badge-green';

  const openEdit = (r) => { setEditTarget(r); setForm({ name: r.name, category: r.category, qty: r.qty, location: r.location, notes: r.notes || '' }); };
  const openAssign = (r) => { setAssignTarget(r); setAssignTo(r.assignedTo || ''); };

  const handleAdd = async () => {
    if (!form.name || !form.category || !form.qty || !form.location) { toast('Please fill all required fields.', 'error'); return; }
    setSaving(true);
    try {
      await addResource(form);
      setForm(BLANK); setShowAdd(false); setSaving(false);
      toast(`✅ "${form.name}" added to inventory.`);
    } catch (error) {
      setSaving(false);
      toast(error.message || 'Unable to add resource.', 'error');
    }
  };

  const handleEdit = async () => {
    if (!form.name || !form.category || !form.qty || !form.location) { toast('Please fill all required fields.', 'error'); return; }
    setSaving(true);
    try {
      await updateResource(editTarget.id, { ...form });
      setEditTarget(null); setSaving(false);
      toast(`✅ "${form.name}" updated successfully.`);
    } catch (error) {
      setSaving(false);
      toast(error.message || 'Unable to update resource.', 'error');
    }
  };

  const handleAssign = async () => {
    if (!assignTo.trim()) { toast('Enter a team or person to assign to.', 'error'); return; }
    try {
      await assignResource(assignTarget.id, assignTo.trim());
      setAssignTarget(null);
      toast(`📦 "${assignTarget.name}" assigned to ${assignTo}.`);
    } catch (error) {
      toast(error.message || 'Unable to assign resource.', 'error');
    }
  };

  const handleUnassign = async (r) => {
    try {
      await unassignResource(r.id);
      toast(`"${r.name}" has been unassigned.`, 'info');
    } catch (error) {
      toast(error.message || 'Unable to unassign resource.', 'error');
    }
  };

  const handleDelete = async () => {
    try {
      await deleteResource(deleteTarget.id);
      toast(`🗑️ "${deleteTarget.name}" removed from inventory.`, 'info');
      setDeleteTarget(null);
    } catch (error) {
      toast(error.message || 'Unable to delete resource.', 'error');
    }
  };

  const low = resources.filter(r => r.status === 'Low').length;
  const assigned = resources.filter(r => r.status === 'Assigned').length;
  const total = resources.reduce((s, r) => s + Number(r.qty), 0);

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
      <div className="main-area page-inventory">
        <Topbar title="Resource Inventory" subtitle="Manage and track your organization's assets in real-time." currentUser={currentUser} onLogout={onLogout} />
        <div className="page-body">
          <PageState loading={loading} error={error} />

          {/* Stats */}
          <div className="grid-3 mb-4 anim-1">
            <div className="stat-card">
              <div className="stat-glow" style={{background:'rgba(79,110,255,.2)'}} />
              <div className="stat-label">📦 Total Items</div>
              <div className="stat-value" style={{color:'var(--blue)'}}>{total.toLocaleString()}</div>
              <div className="stat-delta">{resources.length} resource types</div>
            </div>
            <div className="stat-card">
              <div className="stat-glow" style={{background:'rgba(16,232,122,.2)'}} />
              <div className="stat-label">✅ Assigned</div>
              <div className="stat-value" style={{color:'var(--green)'}}>{assigned}</div>
              <div className="stat-delta">Currently deployed</div>
            </div>
            <div className="stat-card">
              <div className="stat-glow" style={{background:'rgba(255,61,85,.2)'}} />
              <div className="stat-label">⚠️ Critical Stock</div>
              <div className="stat-value" style={{color:'var(--red)'}}>{low}</div>
              <div className="stat-delta" style={{color: low > 0 ? 'var(--red)' : 'var(--green)'}}>
                {low > 0 ? 'Requires action' : 'All levels normal'}
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="card anim-2">
            <div className="card-header" style={{flexWrap:'wrap',gap:12}}>
              <div style={{display:'flex',gap:3,background:'var(--bg-base)',borderRadius:8,padding:3,border:'1px solid var(--border)'}}>
                {TABS.map(t => (
                  <button key={t} onClick={() => setTab(t)} style={{padding:'5px 13px',borderRadius:6,border:'none',background:tab===t?'var(--blue)':'transparent',color:tab===t?'#fff':'var(--text-secondary)',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'var(--font-b)',transition:'all .2s'}}>
                    {t}{t==='Low Stock'&&low>0?` (${low})`:t==='Assigned'&&assigned>0?` (${assigned})`:''}
                  </button>
                ))}
              </div>
              <div style={{display:'flex',gap:9,alignItems:'center',flexWrap:'wrap'}}>
                <div className="search-wrap" style={{minWidth:180}}>
                  <span style={{fontSize:13,color:'var(--text-muted)'}}>🔍</span>
                  <input placeholder="Search resources..." value={search} onChange={e=>setSearch(e.target.value)} />
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => { setForm(BLANK); setShowAdd(true); }}>+ Add Resource</button>
              </div>
            </div>

            <div className="desktop-table" style={{overflowX:'auto'}}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Resource Name</th>
                    <th>Category</th>
                    <th>Qty</th>
                    <th>Location</th>
                    <th>Status</th>
                    <th>Assigned To</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(r => (
                    <tr key={r.id}>
                      <td><div style={{fontWeight:600}}>{r.name}</div></td>
                      <td><span className="badge badge-blue">{r.category}</span></td>
                      <td>
                        <span style={{fontFamily:'var(--font-m)',fontWeight:600,color:r.qty<10?'var(--red)':r.qty<20?'var(--orange)':'var(--text-primary)'}}>
                          {r.qty}
                        </span>
                      </td>
                      <td style={{color:'var(--text-secondary)',fontSize:12.5}}>📍 {r.location}</td>
                      <td><span className={`badge ${statusClass(r.status)}`}>● {r.status}</span></td>
                      <td style={{color:'var(--text-secondary)',fontSize:12.5}}>{r.assignedTo || '—'}</td>
                      <td>
                        <div style={{display:'flex',gap:5}}>
                          <button className="btn btn-ghost btn-sm" title="Edit" onClick={() => openEdit(r)}>✏️</button>
                          {r.status !== 'Assigned'
                            ? <button className="btn btn-ghost btn-sm" title="Assign" onClick={() => openAssign(r)}>📤</button>
                            : <button className="btn btn-ghost btn-sm" title="Unassign" onClick={() => handleUnassign(r)}>↩️</button>
                          }
                          <button className="btn btn-ghost btn-sm" title="Delete" onClick={() => setDeleteTarget(r)} style={{color:'var(--red)'}}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr><td colSpan={7} style={{textAlign:'center',padding:'28px 0',color:'var(--text-muted)'}}>No resources found</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mobile-list">
              {filtered.map((resource) => (
                <div className="mobile-entity-card" key={`mobile-${resource.id}`}>
                  <div className="mobile-entity-head">
                    <div>
                      <div className="mobile-entity-title">{resource.name}</div>
                      <div className="mobile-entity-sub">{resource.location}</div>
                    </div>
                    <span className={`badge ${statusClass(resource.status)}`}>{resource.status}</span>
                  </div>
                  <div className="mobile-entity-meta">
                    <span>Category: {resource.category}</span>
                    <span>Qty: {resource.qty}</span>
                    <span>Assigned: {resource.assignedTo || '—'}</span>
                  </div>
                  <div className="mobile-entity-actions">
                    <button className="btn btn-ghost btn-sm" onClick={() => openEdit(resource)}>Edit</button>
                    {resource.status !== 'Assigned'
                      ? <button className="btn btn-ghost btn-sm" onClick={() => openAssign(resource)}>Assign</button>
                      : <button className="btn btn-ghost btn-sm" onClick={() => handleUnassign(resource)}>Unassign</button>}
                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--red)' }} onClick={() => setDeleteTarget(resource)}>Delete</button>
                  </div>
                </div>
              ))}
              {filtered.length === 0 && <div className="state-banner state-empty">No resources found.</div>}
            </div>

            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:14,fontSize:12,color:'var(--text-secondary)'}}>
              <span>Showing {filtered.length} of {resources.length} resources</span>
            </div>
          </div>
        </div>
      </div>

      {/* Add Modal */}
      {showAdd && (
        <Modal title="➕ Add New Resource" onClose={() => setShowAdd(false)}
          footer={<>
            <button className="btn btn-ghost" onClick={() => setShowAdd(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleAdd} disabled={saving}>
              {saving ? <><span className="spinner" /> Saving…</> : 'Add Resource'}
            </button>
          </>}>
          <ResourceForm value={form} onChange={setForm} />
        </Modal>
      )}

      {/* Edit Modal */}
      {editTarget && (
        <Modal title="✏️ Edit Resource" onClose={() => setEditTarget(null)}
          footer={<>
            <button className="btn btn-ghost" onClick={() => setEditTarget(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleEdit} disabled={saving}>
              {saving ? <><span className="spinner" /> Saving…</> : 'Save Changes'}
            </button>
          </>}>
          <ResourceForm value={form} onChange={setForm} />
        </Modal>
      )}

      {/* Assign Modal */}
      {assignTarget && (
        <Modal title="📤 Assign Resource" onClose={() => setAssignTarget(null)}
          footer={<>
            <button className="btn btn-ghost" onClick={() => setAssignTarget(null)}>Cancel</button>
            <button className="btn btn-success" onClick={handleAssign}>Confirm Assignment</button>
          </>}>
          <div style={{background:'var(--bg-raised)',borderRadius:'var(--radius-sm)',padding:'12px 14px',marginBottom:16,fontSize:13}}>
            <div style={{fontWeight:700,marginBottom:3}}>{assignTarget.name}</div>
            <div style={{color:'var(--text-secondary)',fontSize:12}}>{assignTarget.category} · {assignTarget.qty} units · {assignTarget.location}</div>
          </div>
          <div className="form-group">
            <label className="form-label">Assign To (Team / Person)</label>
            <input className="form-control" placeholder="e.g. Team Alpha, Dr. Sarah Lee" value={assignTo} onChange={e => setAssignTo(e.target.value)} />
          </div>
        </Modal>
      )}

      {/* Delete Confirm */}
      {deleteTarget && (
        <Modal title="🗑️ Delete Resource" onClose={() => setDeleteTarget(null)}
          footer={<>
            <button className="btn btn-ghost" onClick={() => setDeleteTarget(null)}>Cancel</button>
            <button className="btn btn-danger" onClick={handleDelete}>Delete</button>
          </>}>
          <p style={{fontSize:13.5,lineHeight:1.6,color:'var(--text-secondary)'}}>
            Are you sure you want to remove <strong style={{color:'var(--text-primary)'}}>{deleteTarget.name}</strong> from inventory? This action cannot be undone.
          </p>
        </Modal>
      )}
    </div>
  );
}
