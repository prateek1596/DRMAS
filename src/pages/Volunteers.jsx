import React, { useEffect, useMemo, useState } from 'react';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import Modal from '../components/Modal';
import PageState from '../components/PageState';
import { useToast } from '../components/Toast';
import { api } from '../api';

const BLANK = {
  fullName: '',
  role: '',
  skill: '',
  zone: '',
  phone: '',
  status: 'Available',
  notes: '',
};

function statusClass(status) {
  if (status === 'Available') return 'badge-green';
  if (status === 'On Mission') return 'badge-red';
  return 'badge-blue';
}

export default function Volunteers({ page, onNav, currentUser, onLogout, featureFlags }) {
  const toast = useToast();
  const [volunteers, setVolunteers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [form, setForm] = useState(BLANK);
  const [showAdd, setShowAdd] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const rows = await api.getVolunteers();
        if (!cancelled) setVolunteers(Array.isArray(rows) ? rows : []);
      } catch (loadError) {
        if (!cancelled) setError(loadError.message || 'Unable to load volunteers.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return volunteers.filter((item) => {
      if (statusFilter !== 'All' && item.status !== statusFilter) return false;
      if (!q) return true;
      const hay = [item.fullName, item.role, item.skill, item.zone, item.phone]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [volunteers, search, statusFilter]);

  const available = volunteers.filter((item) => item.status === 'Available').length;
  const onMission = volunteers.filter((item) => item.status === 'On Mission').length;
  const standby = volunteers.filter((item) => item.status === 'Standby').length;
  const coverage = volunteers.length ? Math.round((available / volunteers.length) * 100) : 0;

  const topZones = Object.entries(
    volunteers.reduce((acc, item) => {
      const key = item.zone || 'Unassigned';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {})
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  const topSkills = Object.entries(
    volunteers.reduce((acc, item) => {
      const key = item.skill || 'General';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {})
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);
  const topDeployable = [...volunteers]
    .filter((item) => item.status === 'Available')
    .sort((a, b) => {
      const bySkill = String(a.skill || '').localeCompare(String(b.skill || ''));
      if (bySkill !== 0) return bySkill;
      return String(a.fullName || '').localeCompare(String(b.fullName || ''));
    })
    .slice(0, 5);
  const missionQueue = [...volunteers]
    .filter((item) => item.status === 'On Mission')
    .slice(0, 5);

  const setField = (key) => (event) => {
    setForm((prev) => ({ ...prev, [key]: event.target.value }));
  };

  const validate = () => {
    if (!form.fullName.trim() || !form.role.trim() || !form.skill.trim() || !form.zone.trim()) {
      toast('Please fill all required fields.', 'error');
      return false;
    }
    return true;
  };

  const handleCreate = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const created = await api.createVolunteer({
        fullName: form.fullName.trim(),
        role: form.role.trim(),
        skill: form.skill.trim(),
        zone: form.zone.trim(),
        phone: form.phone.trim(),
        status: form.status,
        notes: form.notes.trim(),
      });
      setVolunteers((prev) => [created, ...prev]);
      setForm(BLANK);
      setShowAdd(false);
      toast('Volunteer added successfully.');
    } catch (createError) {
      toast(createError.message || 'Unable to create volunteer.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (item) => {
    setEditTarget(item);
    setForm({
      fullName: item.fullName || '',
      role: item.role || '',
      skill: item.skill || '',
      zone: item.zone || '',
      phone: item.phone || '',
      status: item.status || 'Available',
      notes: item.notes || '',
    });
  };

  const handleEdit = async () => {
    if (!editTarget || !validate()) return;
    setSaving(true);
    try {
      const updated = await api.updateVolunteer(editTarget.id, {
        fullName: form.fullName.trim(),
        role: form.role.trim(),
        skill: form.skill.trim(),
        zone: form.zone.trim(),
        phone: form.phone.trim(),
        status: form.status,
        notes: form.notes.trim(),
      });
      setVolunteers((prev) => prev.map((item) => (item.id === editTarget.id ? updated : item)));
      setEditTarget(null);
      setForm(BLANK);
      toast('Volunteer updated.', 'info');
    } catch (updateError) {
      toast(updateError.message || 'Unable to update volunteer.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await api.deleteVolunteer(deleteTarget.id);
      setVolunteers((prev) => prev.filter((item) => item.id !== deleteTarget.id));
      setDeleteTarget(null);
      toast('Volunteer removed.', 'info');
    } catch (deleteError) {
      toast(deleteError.message || 'Unable to remove volunteer.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const cycleStatus = async (item) => {
    const order = ['Available', 'On Mission', 'Standby'];
    const idx = order.indexOf(item.status);
    const next = order[(idx + 1) % order.length];
    try {
      const updated = await api.updateVolunteer(item.id, { status: next });
      setVolunteers((prev) => prev.map((v) => (v.id === item.id ? updated : v)));
    } catch (statusError) {
      toast(statusError.message || 'Unable to update status.', 'error');
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
      <div className="main-area page-volunteers">
        <Topbar title="Volunteer Panel" subtitle="Manage responder availability, roles, and deployment readiness." currentUser={currentUser} onLogout={onLogout} />
        <div className="page-body">
          <PageState loading={loading} error={error} empty={!loading && !error && volunteers.length === 0} emptyMessage="No volunteers available." />

          {!loading && !error && (
            <div className="widget-grid mb-4 anim-1">
              <div className="widget">
                <div className="widget-kicker">Readiness Coverage</div>
                <div className="widget-value">{coverage}%</div>
                <div className="widget-sub">Available responders across current roster.</div>
                <div className="widget-meter"><span style={{ width: `${Math.max(8, coverage)}%` }} /></div>
              </div>
              <div className="widget">
                <div className="widget-kicker">Status Mix</div>
                <div style={{ display: 'grid', gap: 6, marginTop: 4 }}>
                  {[
                    ['Available', available, 'var(--green)'],
                    ['On Mission', onMission, 'var(--red)'],
                    ['Standby', standby, 'var(--blue)'],
                  ].map(([label, count, color]) => {
                    const width = volunteers.length ? Math.max(8, Math.round((count / volunteers.length) * 100)) : 8;
                    return (
                      <div key={label}>
                        <div className="widget-list-item"><span>{label}</span><strong>{count}</strong></div>
                        <div className="widget-meter"><span style={{ width: `${width}%`, background: `linear-gradient(90deg, ${color}, rgba(255,255,255,.8))` }} /></div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="widget">
                <div className="widget-kicker">Top Zones</div>
                <div className="widget-list">
                  {topZones.map(([zone, count]) => (
                    <div className="widget-list-item" key={zone}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}><span className="widget-dot" />{zone}</span>
                      <strong>{count}</strong>
                    </div>
                  ))}
                  {topZones.length === 0 && <div className="widget-sub">No zone assignments yet.</div>}
                </div>
              </div>
              <div className="widget">
                <div className="widget-kicker">Skill Hotspots</div>
                <div className="widget-list">
                  {topSkills.map(([skill, count]) => (
                    <div className="widget-list-item" key={skill}>
                      <span>{skill}</span>
                      <strong>{count}</strong>
                    </div>
                  ))}
                  {topSkills.length === 0 && <div className="widget-sub">No skill data available.</div>}
                </div>
              </div>
            </div>
          )}

          {!loading && !error && (
            <>
              <div className="grid-3 mb-4 anim-1">
                <div className="stat-card">
                  <div className="stat-label">👥 Total Volunteers</div>
                  <div className="stat-value" style={{ color: 'var(--blue)' }}>{volunteers.length}</div>
                  <div className="stat-delta">Responder pool</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">🟢 Available</div>
                  <div className="stat-value" style={{ color: 'var(--green)' }}>{available}</div>
                  <div className="stat-delta">Ready for dispatch</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">🔴 On Mission</div>
                  <div className="stat-value" style={{ color: 'var(--red)' }}>{onMission}</div>
                  <div className="stat-delta">{standby} on standby</div>
                </div>
              </div>

              <div className="grid-2 mb-4 anim-2">
                <div className="card">
                  <div className="card-header">
                    <span className="card-title">Deployment Planning Board</span>
                    <span className="badge badge-blue">Shift Ready</span>
                  </div>
                  <div className="mini-kpi-row mb-2">
                    <div className="mini-kpi">
                      <div className="mini-kpi-label">Available</div>
                      <div className="mini-kpi-value">{available}</div>
                    </div>
                    <div className="mini-kpi">
                      <div className="mini-kpi-label">On Mission</div>
                      <div className="mini-kpi-value">{onMission}</div>
                    </div>
                    <div className="mini-kpi">
                      <div className="mini-kpi-label">Standby</div>
                      <div className="mini-kpi-value">{standby}</div>
                    </div>
                  </div>
                  <div className="brief-list">
                    {topDeployable.map((item) => (
                      <div className="brief-item" key={item.id}>
                        <div>
                          <div className="activity-title">{item.fullName}</div>
                          <div className="brief-meta">{item.skill} · {item.zone}</div>
                        </div>
                        <span className="badge badge-green">Deployable</span>
                      </div>
                    ))}
                    {topDeployable.length === 0 && <div className="widget-sub">No available responders right now.</div>}
                  </div>
                </div>

                <div className="card">
                  <div className="card-header">
                    <span className="card-title">Mission Queue Snapshot</span>
                    <button className="btn btn-ghost btn-sm" onClick={() => setStatusFilter('On Mission')}>Filter On Mission</button>
                  </div>
                  <div className="brief-list">
                    {missionQueue.map((item) => (
                      <div className="brief-item" key={`mission-${item.id}`}>
                        <div>
                          <div className="activity-title">{item.fullName}</div>
                          <div className="brief-meta">{item.role} · {item.zone}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button className="btn btn-outline btn-sm" onClick={() => openEdit(item)}>Update</button>
                          <button className="btn btn-ghost btn-sm" onClick={() => cycleStatus(item)}>Cycle</button>
                        </div>
                      </div>
                    ))}
                    {missionQueue.length === 0 && <div className="widget-sub">No active mission queue.</div>}
                  </div>
                </div>
              </div>

              <div className="card anim-3">
                <div className="card-header" style={{ flexWrap: 'wrap', gap: 12 }}>
                  <span className="card-title">Responder Roster ({filtered.length})</span>
                  <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap' }}>
                    <div className="search-wrap" style={{ minWidth: 220 }}>
                      <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>🔍</span>
                      <input placeholder="Search volunteers" value={search} onChange={(event) => setSearch(event.target.value)} />
                    </div>
                    <select className="form-control" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} style={{ width: 150 }}>
                      <option>All</option>
                      <option>Available</option>
                      <option>On Mission</option>
                      <option>Standby</option>
                    </select>
                    <button className="btn btn-primary btn-sm" onClick={() => { setForm(BLANK); setShowAdd(true); }}>+ Add Volunteer</button>
                  </div>
                </div>

                <div className="desktop-table" style={{ overflowX: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Role</th>
                        <th>Skill</th>
                        <th>Assigned Zone</th>
                        <th>Contact</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((item) => (
                        <tr key={item.id}>
                          <td>
                            <div style={{ fontWeight: 700 }}>{item.fullName}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                              Updated {new Date(item.updatedAt || item.createdAt || Date.now()).toLocaleDateString()}
                            </div>
                          </td>
                          <td>{item.role}</td>
                          <td>{item.skill}</td>
                          <td>{item.zone}</td>
                          <td>{item.phone || '—'}</td>
                          <td>
                            <button className={`badge ${statusClass(item.status)}`} style={{ border: 'none', cursor: 'pointer' }} onClick={() => cycleStatus(item)}>
                              {item.status}
                            </button>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button className="btn btn-ghost btn-sm" onClick={() => openEdit(item)}>Edit</button>
                              <button className="btn btn-ghost btn-sm" style={{ color: 'var(--red)' }} onClick={() => setDeleteTarget(item)}>Delete</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filtered.length === 0 && (
                        <tr>
                          <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No volunteers found.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="mobile-list">
                  {filtered.map((item) => (
                    <div className="mobile-entity-card" key={`mobile-${item.id}`}>
                      <div className="mobile-entity-head">
                        <div>
                          <div className="mobile-entity-title">{item.fullName}</div>
                          <div className="mobile-entity-sub">{item.role}</div>
                        </div>
                        <span className={`badge ${statusClass(item.status)}`}>{item.status}</span>
                      </div>
                      <div className="mobile-entity-meta">
                        <span>Skill: {item.skill}</span>
                        <span>Zone: {item.zone}</span>
                        <span>Phone: {item.phone || '—'}</span>
                      </div>
                      <div className="mobile-entity-actions">
                        <button className="btn btn-ghost btn-sm" onClick={() => cycleStatus(item)}>Cycle Status</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(item)}>Edit</button>
                        <button className="btn btn-ghost btn-sm" style={{ color: 'var(--red)' }} onClick={() => setDeleteTarget(item)}>Delete</button>
                      </div>
                    </div>
                  ))}
                  {filtered.length === 0 && <div className="state-banner state-empty">No volunteers found.</div>}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {showAdd && (
        <Modal
          title="Add Volunteer"
          onClose={() => setShowAdd(false)}
          footer={(
            <>
              <button className="btn btn-ghost" onClick={() => setShowAdd(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreate} disabled={saving}>{saving ? 'Saving...' : 'Create Volunteer'}</button>
            </>
          )}
        >
          <VolunteerForm form={form} setField={setField} />
        </Modal>
      )}

      {editTarget && (
        <Modal
          title="Edit Volunteer"
          onClose={() => setEditTarget(null)}
          footer={(
            <>
              <button className="btn btn-ghost" onClick={() => setEditTarget(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleEdit} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
            </>
          )}
        >
          <VolunteerForm form={form} setField={setField} />
        </Modal>
      )}

      {deleteTarget && (
        <Modal
          title="Remove Volunteer"
          onClose={() => setDeleteTarget(null)}
          footer={(
            <>
              <button className="btn btn-ghost" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleDelete} disabled={saving}>{saving ? 'Removing...' : 'Remove'}</button>
            </>
          )}
        >
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            Remove <strong style={{ color: 'var(--text-primary)' }}>{deleteTarget.fullName}</strong> from the volunteer roster?
          </p>
        </Modal>
      )}
    </div>
  );
}

function VolunteerForm({ form, setField }) {
  return (
    <>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Full Name *</label>
          <input className="form-control" value={form.fullName} onChange={setField('fullName')} placeholder="Responder name" />
        </div>
        <div className="form-group">
          <label className="form-label">Role *</label>
          <input className="form-control" value={form.role} onChange={setField('role')} placeholder="Field Medic" />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Skill *</label>
          <input className="form-control" value={form.skill} onChange={setField('skill')} placeholder="Advanced First Aid" />
        </div>
        <div className="form-group">
          <label className="form-label">Assigned Zone *</label>
          <input className="form-control" value={form.zone} onChange={setField('zone')} placeholder="Zone A - Riverside" />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Phone</label>
          <input className="form-control" value={form.phone} onChange={setField('phone')} placeholder="+91 9XXXXXXXXX" />
        </div>
        <div className="form-group">
          <label className="form-label">Status</label>
          <select className="form-control" value={form.status} onChange={setField('status')}>
            <option>Available</option>
            <option>On Mission</option>
            <option>Standby</option>
          </select>
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Notes</label>
        <textarea className="form-control" value={form.notes} onChange={setField('notes')} placeholder="Extra details, certifications, or constraints" />
      </div>
    </>
  );
}
