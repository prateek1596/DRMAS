import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import Modal from '../components/Modal';
import PageState from '../components/PageState';
import { useStore } from '../store';
import { useToast } from '../components/Toast';
import { api } from '../api';

const TYPES = ['Flood', 'Earthquake', 'Wildfire', 'Hurricane', 'Tornado', 'Drought', 'Chemical Spill', 'Landslide', 'Tsunami', 'Disease Outbreak', 'Other'];
const SEVERITIES = ['Critical', 'High', 'Moderate', 'Low'];

const BLANK = { type: '', severity: '', location: '', coordinates: '', people: '', time: '', info: '' };

function severityBadge(level) {
  return level === 'Critical' ? 'badge-red' : level === 'High' ? 'badge-orange' : level === 'Moderate' ? 'badge-yellow' : 'badge-green';
}

function statusBadge(status) {
  return status === 'Active' ? 'badge-red' : status === 'Responding' ? 'badge-orange' : 'badge-green';
}

function DisasterForm({ value, onChange, onUseLocation, geocoding }) {
  const set = (key) => (event) => onChange({ ...value, [key]: event.target.value });

  return (
    <>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Disaster Type *</label>
          <select className="form-control" value={value.type} onChange={set('type')} required>
            <option value="">Select Type</option>
            {TYPES.map((type) => <option key={type}>{type}</option>)}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Severity Level *</label>
          <select className="form-control" value={value.severity} onChange={set('severity')} required>
            <option value="">Select Severity</option>
            {SEVERITIES.map((severity) => <option key={severity}>{severity}</option>)}
          </select>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Location *</label>
        <div style={{ position: 'relative', display: 'flex', gap: 8 }}>
          <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', fontSize: 13 }}>📍</span>
          <input
            className="form-control"
            style={{ paddingLeft: 34, flex: 1 }}
            placeholder="Affected area name or GPS coordinates"
            value={value.location}
            onChange={set('location')}
            required
          />
          <button type="button" className="btn btn-outline btn-sm" onClick={onUseLocation} disabled={geocoding}>
            {geocoding ? 'Locating...' : 'Use Location'}
          </button>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Coordinates</label>
        <input className="form-control" placeholder="Auto-filled lat, long" value={value.coordinates} onChange={set('coordinates')} />
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

export default function Report({ page, onNav, currentUser, onLogout, featureFlags }) {
  const { disasters, addDisaster, updateDisaster, deleteDisaster, loading, error } = useStore();
  const toast = useToast();

  const [showAdd, setShowAdd] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [viewTarget, setViewTarget] = useState(null);
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = disasters.filter((disaster) => {
    const text = `${disaster.type} ${disaster.location}`.toLowerCase();
    return text.includes(search.toLowerCase());
  });

  const openEdit = (disaster) => {
    setEditTarget(disaster);
    setForm({
      type: disaster.type,
      severity: disaster.severity,
      location: disaster.location,
      coordinates: disaster.coordinates || '',
      people: disaster.people || '',
      time: disaster.time || '',
      info: disaster.info || '',
    });
  };

  const handleUseLocation = async () => {
    const query = String(form.location || '').trim() || String(form.coordinates || '').trim();
    if (!query) {
      toast('Enter a location first.', 'error');
      return;
    }

    setGeocoding(true);
    try {
      const result = await api.geocode(query);
      setForm((prev) => ({ ...prev, coordinates: `${result.lat.toFixed(6)}, ${result.lng.toFixed(6)}` }));
      toast('Location mapped to coordinates.', 'success');
    } catch (error) {
      toast(error.message || 'Unable to map location.', 'error');
    } finally {
      setGeocoding(false);
    }
  };

  const handleAdd = async () => {
    if (!form.type || !form.severity || !form.location) {
      toast('Please fill all required fields.', 'error');
      return;
    }

    setSaving(true);
    try {
      await addDisaster({ ...form, reportedBy: currentUser?.role || 'Admin' });
      setForm(BLANK);
      setShowAdd(false);
      setSaving(false);
      toast(`Disaster reported: ${form.type} at ${form.location}`, 'success');
    } catch (error) {
      setSaving(false);
      toast(error.message || 'Unable to submit report.', 'error');
    }
  };

  const handleEdit = async () => {
    if (!form.type || !form.severity || !form.location) {
      toast('Please fill all required fields.', 'error');
      return;
    }

    setSaving(true);
    try {
      await updateDisaster(editTarget.id, form);
      setEditTarget(null);
      setSaving(false);
      toast('Disaster report updated.', 'success');
    } catch (error) {
      setSaving(false);
      toast(error.message || 'Unable to update report.', 'error');
    }
  };

  const handleDelete = async () => {
    try {
      await deleteDisaster(deleteTarget.id);
      setDeleteTarget(null);
      toast('Disaster report deleted.', 'info');
    } catch (error) {
      toast(error.message || 'Unable to delete report.', 'error');
    }
  };

  const toggleStatus = async (disaster) => {
    const next = disaster.status === 'Active' ? 'Responding' : disaster.status === 'Responding' ? 'Resolved' : 'Active';
    try {
      await updateDisaster(disaster.id, { status: next });
      toast(`Status set to ${next}.`, 'info');
    } catch (error) {
      toast(error.message || 'Unable to update status.', 'error');
    }
  };

  const active = disasters.filter((d) => d.status === 'Active').length;
  const responding = disasters.filter((d) => d.status === 'Responding').length;
  const resolved = disasters.filter((d) => d.status === 'Resolved').length;

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
      <div className="main-area page-report">
        <Topbar title="Disaster Reports" subtitle="Submit and manage high-priority incident reports." currentUser={currentUser} onLogout={onLogout} />

        <div className="page-body">
          <PageState loading={loading} error={error} />

          <div className="grid-3 mb-4 anim-1">
            <div className="stat-card">
              <div className="stat-glow" style={{ background: 'rgba(255,61,85,.2)' }} />
              <div className="stat-label">Active</div>
              <div className="stat-value" style={{ color: 'var(--red)' }}>{active}</div>
              <div className="stat-delta">Require immediate action</div>
            </div>
            <div className="stat-card">
              <div className="stat-glow" style={{ background: 'rgba(255,140,66,.2)' }} />
              <div className="stat-label">Responding</div>
              <div className="stat-value" style={{ color: 'var(--orange)' }}>{responding}</div>
              <div className="stat-delta">Teams deployed</div>
            </div>
            <div className="stat-card">
              <div className="stat-glow" style={{ background: 'rgba(16,232,122,.2)' }} />
              <div className="stat-label">Resolved</div>
              <div className="stat-value" style={{ color: 'var(--green)' }}>{resolved}</div>
              <div className="stat-delta">Incidents closed</div>
            </div>
          </div>

          <div className="card anim-2">
            <div className="card-header" style={{ flexWrap: 'wrap', gap: 12 }}>
              <span className="card-title">All Incidents ({disasters.length})</span>
              <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap' }}>
                <div className="search-wrap" style={{ minWidth: 190 }}>
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>🔍</span>
                  <input placeholder="Search incidents..." value={search} onChange={(event) => setSearch(event.target.value)} />
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => { setForm(BLANK); setShowAdd(true); }}>Report Disaster</button>
              </div>
            </div>

            <div className="desktop-table" style={{ overflowX: 'auto' }}>
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
                  {filtered.map((disaster) => (
                    <tr key={disaster.id}>
                      <td><span style={{ fontWeight: 700 }}>{disaster.type}</span></td>
                      <td><span className={`badge ${severityBadge(disaster.severity)}`}>{disaster.severity}</span></td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: 12.5 }}>{disaster.location}</td>
                      <td style={{ fontFamily: 'var(--font-m)' }}>{disaster.people ? Number(disaster.people).toLocaleString() : '—'}</td>
                      <td>
                        <button
                          onClick={() => toggleStatus(disaster)}
                          className={`badge ${statusBadge(disaster.status)}`}
                          style={{ cursor: 'pointer', border: 'none' }}
                        >
                          {disaster.status}
                        </button>
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: 12.5 }}>{disaster.reportedBy}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 5 }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => setViewTarget(disaster)}>View</button>
                          <button className="btn btn-ghost btn-sm" onClick={() => openEdit(disaster)}>Edit</button>
                          <button className="btn btn-ghost btn-sm" style={{ color: 'var(--red)' }} onClick={() => setDeleteTarget(disaster)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr><td colSpan={7} style={{ textAlign: 'center', padding: '28px 0', color: 'var(--text-muted)' }}>No incidents found</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mobile-list">
              {filtered.map((disaster) => (
                <div className="mobile-entity-card" key={`mobile-${disaster.id}`}>
                  <div className="mobile-entity-head">
                    <div>
                      <div className="mobile-entity-title">{disaster.type}</div>
                      <div className="mobile-entity-sub">{disaster.location}</div>
                    </div>
                    <span className={`badge ${severityBadge(disaster.severity)}`}>{disaster.severity}</span>
                  </div>
                  <div className="mobile-entity-meta">
                    <span>Status: {disaster.status}</span>
                    <span>People: {disaster.people ? Number(disaster.people).toLocaleString() : '—'}</span>
                    <span>By: {disaster.reportedBy}</span>
                    <span>Coords: {disaster.coordinates || 'N/A'}</span>
                  </div>
                  <div className="mobile-entity-actions">
                    <button className="btn btn-ghost btn-sm" onClick={() => setViewTarget(disaster)}>View</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => openEdit(disaster)}>Edit</button>
                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--red)' }} onClick={() => setDeleteTarget(disaster)}>Delete</button>
                  </div>
                </div>
              ))}
              {filtered.length === 0 && <div className="state-banner state-empty">No incidents found.</div>}
            </div>
          </div>
        </div>
      </div>

      {showAdd && (
        <Modal
          title="Report New Disaster"
          onClose={() => setShowAdd(false)}
          size="lg"
          footer={(
            <>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', flex: 1 }}>False reporting is punishable.</p>
              <button className="btn btn-ghost" onClick={() => setShowAdd(false)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleAdd} disabled={saving}>{saving ? 'Submitting...' : 'Submit Report'}</button>
            </>
          )}
        >
          <DisasterForm value={form} onChange={setForm} onUseLocation={handleUseLocation} geocoding={geocoding} />
        </Modal>
      )}

      {editTarget && (
        <Modal
          title="Edit Disaster Report"
          onClose={() => setEditTarget(null)}
          size="lg"
          footer={(
            <>
              <button className="btn btn-ghost" onClick={() => setEditTarget(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleEdit} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
            </>
          )}
        >
          <DisasterForm value={form} onChange={setForm} onUseLocation={handleUseLocation} geocoding={geocoding} />
        </Modal>
      )}

      {viewTarget && (
        <Modal
          title="Incident Details"
          onClose={() => setViewTarget(null)}
          footer={(
            <>
              <button className="btn btn-ghost" onClick={() => setViewTarget(null)}>Close</button>
              <button className="btn btn-outline" onClick={() => { setViewTarget(null); openEdit(viewTarget); }}>Edit</button>
            </>
          )}
        >
          {[
            ['Type', viewTarget.type],
            ['Severity', viewTarget.severity],
            ['Location', viewTarget.location],
            ['Coordinates', viewTarget.coordinates || 'Not specified'],
            ['People Affected', viewTarget.people ? Number(viewTarget.people).toLocaleString() : 'Unknown'],
            ['Time', viewTarget.time || 'Not specified'],
            ['Status', viewTarget.status],
            ['Reported By', viewTarget.reportedBy],
          ].map(([key, value]) => (
            <div key={key} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
              <span style={{ color: 'var(--text-secondary)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '.06em' }}>{key}</span>
              <span>{value}</span>
            </div>
          ))}
          {viewTarget.info && (
            <div style={{ marginTop: 14, padding: 14, background: 'var(--bg-raised)', borderRadius: 'var(--radius-sm)', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              {viewTarget.info}
            </div>
          )}
        </Modal>
      )}

      {deleteTarget && (
        <Modal
          title="Delete Report"
          onClose={() => setDeleteTarget(null)}
          footer={(
            <>
              <button className="btn btn-ghost" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleDelete}>Delete Report</button>
            </>
          )}
        >
          <p style={{ fontSize: 13.5, lineHeight: 1.6, color: 'var(--text-secondary)' }}>
            Delete the {deleteTarget.type} report at {deleteTarget.location}? This cannot be undone.
          </p>
        </Modal>
      )}
    </div>
  );
}
