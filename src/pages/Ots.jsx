import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import Modal from '../components/Modal';
import PageState from '../components/PageState';
import { useStore } from '../store';
import { useToast } from '../components/Toast';

const PRIORITIES = ['Critical', 'High', 'Moderate', 'Low'];
const STATUS = ['Queued', 'In Progress', 'Blocked', 'Completed'];
const ZONES = ['Zone A - Riverside', 'Zone B - Highland', 'Zone C - Downtown', 'Zone D - Coastal', 'Zone E - Industrial'];

const BLANK = {
  title: '',
  incidentId: '',
  zone: '',
  priority: 'Moderate',
  owner: '',
  eta: '',
  status: 'Queued',
  notes: '',
};

function priorityBadge(priority) {
  if (priority === 'Critical') return 'badge-red';
  if (priority === 'High') return 'badge-orange';
  if (priority === 'Moderate') return 'badge-yellow';
  return 'badge-green';
}

function statusBadge(status) {
  if (status === 'Blocked') return 'badge-red';
  if (status === 'In Progress') return 'badge-orange';
  if (status === 'Completed') return 'badge-green';
  return 'badge-blue';
}

function OtsForm({ value, onChange, disasters }) {
  const set = (key) => (event) => onChange({ ...value, [key]: event.target.value });

  return (
    <>
      <div className="form-group">
        <label className="form-label">Task Title *</label>
        <input className="form-control" value={value.title} onChange={set('title')} placeholder="e.g. Deploy triage station near bridge" />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Incident</label>
          <select className="form-control" value={value.incidentId} onChange={set('incidentId')}>
            <option value="">Not linked</option>
            {disasters.map((item) => (
              <option key={item.id} value={item.id}>{item.type} - {item.location}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Zone *</label>
          <select className="form-control" value={value.zone} onChange={set('zone')}>
            <option value="">Select zone</option>
            {ZONES.map((zone) => <option key={zone}>{zone}</option>)}
          </select>
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Priority</label>
          <select className="form-control" value={value.priority} onChange={set('priority')}>
            {PRIORITIES.map((priority) => <option key={priority}>{priority}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Status</label>
          <select className="form-control" value={value.status} onChange={set('status')}>
            {STATUS.map((status) => <option key={status}>{status}</option>)}
          </select>
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Owner</label>
          <input className="form-control" value={value.owner} onChange={set('owner')} placeholder="Team Alpha" />
        </div>
        <div className="form-group">
          <label className="form-label">ETA</label>
          <input className="form-control" type="datetime-local" value={value.eta} onChange={set('eta')} />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Operational Notes</label>
        <textarea className="form-control" value={value.notes} onChange={set('notes')} placeholder="Safety checks, route conditions, and dependencies..." />
      </div>
    </>
  );
}

export default function Ots({ page, onNav, currentUser, onLogout, featureFlags }) {
  const { otsTasks, disasters, addOtsTask, updateOtsTask, deleteOtsTask, loading, error } = useStore();
  const toast = useToast();

  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(BLANK);

  const filtered = otsTasks.filter((task) => {
    const text = `${task.title} ${task.zone} ${task.owner || ''}`.toLowerCase();
    return text.includes(search.toLowerCase());
  });

  const queued = otsTasks.filter((task) => task.status === 'Queued').length;
  const inProgress = otsTasks.filter((task) => task.status === 'In Progress').length;
  const blocked = otsTasks.filter((task) => task.status === 'Blocked').length;

  const openEdit = (task) => {
    setEditTarget(task);
    setForm({
      title: task.title,
      incidentId: task.incidentId || '',
      zone: task.zone,
      priority: task.priority,
      owner: task.owner || '',
      eta: task.eta || '',
      status: task.status,
      notes: task.notes || '',
    });
  };

  const handleCreate = async () => {
    if (!form.title || !form.zone) {
      toast('Task title and zone are required.', 'error');
      return;
    }

    setSaving(true);
    try {
      await addOtsTask({
        ...form,
        incidentId: form.incidentId ? Number(form.incidentId) : null,
      });
      setShowAdd(false);
      setForm(BLANK);
      setSaving(false);
      toast('✅ OTS task created.', 'success');
    } catch (error) {
      setSaving(false);
      toast(error.message || 'Unable to create task.', 'error');
    }
  };

  const handleUpdate = async () => {
    if (!editTarget) return;
    if (!form.title || !form.zone) {
      toast('Task title and zone are required.', 'error');
      return;
    }

    setSaving(true);
    try {
      await updateOtsTask(editTarget.id, {
        ...form,
        incidentId: form.incidentId ? Number(form.incidentId) : null,
      });
      setEditTarget(null);
      setSaving(false);
      toast('✅ OTS task updated.', 'success');
    } catch (error) {
      setSaving(false);
      toast(error.message || 'Unable to update task.', 'error');
    }
  };

  const handleQuickStatus = async (task) => {
    const sequence = ['Queued', 'In Progress', 'Blocked', 'Completed'];
    const index = sequence.indexOf(task.status);
    const next = sequence[(index + 1) % sequence.length];

    try {
      await updateOtsTask(task.id, { status: next });
      toast(`Task moved to ${next}.`, 'info');
    } catch (error) {
      toast(error.message || 'Unable to update task status.', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteOtsTask(deleteTarget.id);
      setDeleteTarget(null);
      toast('Task deleted.', 'info');
    } catch (error) {
      toast(error.message || 'Unable to delete task.', 'error');
    }
  };

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
        <Topbar
          title="OTS Control Room"
          subtitle="Operational Task Scheduling and live response execution board."
          currentUser={currentUser}
          onLogout={onLogout}
        />
        <div className="page-body">
          <PageState loading={loading} error={error} />

          <div className="grid-3 mb-4 anim-1">
            <div className="stat-card">
              <div className="stat-label">📋 Queued Tasks</div>
              <div className="stat-value" style={{ color: 'var(--blue)' }}>{queued}</div>
              <div className="stat-delta">Awaiting deployment</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">🚧 In Progress</div>
              <div className="stat-value" style={{ color: 'var(--orange)' }}>{inProgress}</div>
              <div className="stat-delta">Field units active</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">⛔ Blocked</div>
              <div className="stat-value" style={{ color: 'var(--red)' }}>{blocked}</div>
              <div className="stat-delta">Requires escalation</div>
            </div>
          </div>

          <div className="card anim-2">
            <div className="card-header" style={{ flexWrap: 'wrap', gap: 12 }}>
              <span className="card-title">Operational Tasks ({otsTasks.length})</span>
              <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap' }}>
                <div className="search-wrap" style={{ minWidth: 220 }}>
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>🔍</span>
                  <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by title, zone, owner" />
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => { setForm(BLANK); setShowAdd(true); }}>+ New OTS Task</button>
              </div>
            </div>

            <div className="desktop-table" style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Task</th>
                    <th>Zone</th>
                    <th>Priority</th>
                    <th>Owner</th>
                    <th>ETA</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((task) => (
                    <tr key={task.id}>
                      <td>
                        <div style={{ fontWeight: 700 }}>{task.title}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{task.notes || 'No notes'}</div>
                      </td>
                      <td>{task.zone}</td>
                      <td><span className={`badge ${priorityBadge(task.priority)}`}>{task.priority}</span></td>
                      <td>{task.owner || '-'}</td>
                      <td>{task.eta || '-'}</td>
                      <td>
                        <button className={`badge ${statusBadge(task.status)}`} style={{ border: 'none', cursor: 'pointer' }} onClick={() => handleQuickStatus(task)}>
                          {task.status}
                        </button>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => openEdit(task)}>✏️</button>
                          <button className="btn btn-ghost btn-sm" style={{ color: 'var(--red)' }} onClick={() => setDeleteTarget(task)}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No OTS tasks found</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mobile-list">
              {filtered.map((task) => (
                <div className="mobile-entity-card" key={`mobile-${task.id}`}>
                  <div className="mobile-entity-head">
                    <div>
                      <div className="mobile-entity-title">{task.title}</div>
                      <div className="mobile-entity-sub">{task.zone}</div>
                    </div>
                    <span className={`badge ${priorityBadge(task.priority)}`}>{task.priority}</span>
                  </div>
                  <div className="mobile-entity-meta">
                    <span>Status: {task.status}</span>
                    <span>Owner: {task.owner || '-'}</span>
                    <span>ETA: {task.eta || '-'}</span>
                  </div>
                  <div className="mobile-entity-actions">
                    <button className="btn btn-ghost btn-sm" onClick={() => handleQuickStatus(task)}>Status</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => openEdit(task)}>Edit</button>
                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--red)' }} onClick={() => setDeleteTarget(task)}>Delete</button>
                  </div>
                </div>
              ))}
              {filtered.length === 0 && <div className="state-banner state-empty">No OTS tasks found.</div>}
            </div>
          </div>
        </div>
      </div>

      {showAdd && (
        <Modal
          title="🛰️ Create OTS Task"
          onClose={() => setShowAdd(false)}
          size="lg"
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setShowAdd(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreate} disabled={saving}>
                {saving ? <><span className="spinner" /> Saving...</> : 'Create Task'}
              </button>
            </>
          }
        >
          <OtsForm value={form} onChange={setForm} disasters={disasters} />
        </Modal>
      )}

      {editTarget && (
        <Modal
          title="✏️ Edit OTS Task"
          onClose={() => setEditTarget(null)}
          size="lg"
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setEditTarget(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleUpdate} disabled={saving}>
                {saving ? <><span className="spinner" /> Saving...</> : 'Save Changes'}
              </button>
            </>
          }
        >
          <OtsForm value={form} onChange={setForm} disasters={disasters} />
        </Modal>
      )}

      {deleteTarget && (
        <Modal
          title="🗑️ Delete OTS Task"
          onClose={() => setDeleteTarget(null)}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleDelete}>Delete</button>
            </>
          }
        >
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Delete task <strong style={{ color: 'var(--text-primary)' }}>{deleteTarget.title}</strong>? This cannot be undone.
          </p>
        </Modal>
      )}
    </div>
  );
}
