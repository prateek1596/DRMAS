import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import Modal from '../components/Modal';
import PageState from '../components/PageState';
import { useStore } from '../store';
import { useToast } from '../components/Toast';
import HazardMap from '../components/HazardMap';
import { api } from '../api';

const RISK = ['Critical', 'High', 'Moderate', 'Low'];
const STATUS = ['Restricted', 'Monitoring', 'Evacuation', 'Stabilized'];
const REGIONS = ['Zone A', 'Zone B', 'Zone C', 'Zone D', 'Zone E'];
const TYPES = ['Flood', 'Wildfire', 'Chemical Spill', 'Landslide', 'Earthquake', 'Other'];

const BLANK = {
  name: '',
  region: 'Zone A',
  hazardType: 'Flood',
  riskLevel: 'Moderate',
  status: 'Monitoring',
  population: '',
  evacuationPriority: 'P2',
  coordinates: '',
  lastInspection: '',
  notes: '',
};

function riskBadge(riskLevel) {
  if (riskLevel === 'Critical') return 'badge-red';
  if (riskLevel === 'High') return 'badge-orange';
  if (riskLevel === 'Moderate') return 'badge-yellow';
  return 'badge-green';
}

function statusBadge(status) {
  if (status === 'Restricted' || status === 'Evacuation') return 'badge-red';
  if (status === 'Monitoring') return 'badge-orange';
  return 'badge-green';
}

function ZoneForm({ value, onChange, onUseLocation, geocoding }) {
  const set = (key) => (event) => onChange({ ...value, [key]: event.target.value });

  return (
    <>
      <div className="form-group">
        <label className="form-label">Hazard Zone Name *</label>
        <input className="form-control" value={value.name} onChange={set('name')} placeholder="e.g. Riverside Spill Corridor" />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Region</label>
          <select className="form-control" value={value.region} onChange={set('region')}>
            {REGIONS.map((region) => <option key={region}>{region}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Hazard Type</label>
          <select className="form-control" value={value.hazardType} onChange={set('hazardType')}>
            {TYPES.map((type) => <option key={type}>{type}</option>)}
          </select>
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Risk Level</label>
          <select className="form-control" value={value.riskLevel} onChange={set('riskLevel')}>
            {RISK.map((risk) => <option key={risk}>{risk}</option>)}
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
          <label className="form-label">Population at Risk</label>
          <input className="form-control" type="number" min="0" value={value.population} onChange={set('population')} />
        </div>
        <div className="form-group">
          <label className="form-label">Evacuation Priority</label>
          <select className="form-control" value={value.evacuationPriority} onChange={set('evacuationPriority')}>
            <option>P1</option>
            <option>P2</option>
            <option>P3</option>
          </select>
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Coordinates</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="form-control" value={value.coordinates} onChange={set('coordinates')} placeholder="Lat, Long" />
            <button type="button" className="btn btn-outline btn-sm" onClick={onUseLocation} disabled={geocoding}>
              {geocoding ? 'Locating...' : 'Use Location'}
            </button>
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Last Inspection</label>
          <input className="form-control" type="date" value={value.lastInspection} onChange={set('lastInspection')} />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Notes</label>
        <textarea className="form-control" value={value.notes} onChange={set('notes')} placeholder="Terrain constraints, contamination details, and buffer limits..." />
      </div>
    </>
  );
}

export default function HazardZoning({ page, onNav, currentUser, onLogout, featureFlags }) {
  const { hazardZones, disasters, addHazardZone, updateHazardZone, deleteHazardZone, loading, error } = useStore();
  const toast = useToast();

  const [showAdd, setShowAdd] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [search, setSearch] = useState('');
  const [showHeat, setShowHeat] = useState(true);
  const [mapFilters, setMapFilters] = useState({
    showHazards: true,
    showDisasters: true,
    riskLevels: [...RISK],
    severities: ['Critical', 'High', 'Moderate', 'Low'],
    statuses: ['Active', 'Responding', 'Resolved', 'Restricted', 'Monitoring', 'Evacuation', 'Stabilized'],
    types: [],
  });

  const typeOptions = Array.from(new Set([
    ...(hazardZones || []).map((zone) => zone.hazardType).filter(Boolean),
    ...(disasters || []).map((disaster) => disaster.type).filter(Boolean),
  ])).sort();

  const filtered = hazardZones.filter((zone) => {
    const text = `${zone.name} ${zone.region} ${zone.hazardType}`.toLowerCase();
    return text.includes(search.toLowerCase());
  });

  const critical = hazardZones.filter((zone) => zone.riskLevel === 'Critical').length;
  const restricted = hazardZones.filter((zone) => zone.status === 'Restricted' || zone.status === 'Evacuation').length;
  const riskPopulation = hazardZones.reduce((sum, zone) => sum + Number(zone.population || 0), 0);
  const regionPressure = Object.entries(
    hazardZones.reduce((acc, zone) => {
      const key = zone.region || 'Unassigned';
      if (!acc[key]) acc[key] = { region: key, population: 0, critical: 0 };
      acc[key].population += Number(zone.population || 0);
      if (zone.riskLevel === 'Critical') acc[key].critical += 1;
      return acc;
    }, {})
  )
    .map(([, value]) => value)
    .sort((a, b) => b.population - a.population)
    .slice(0, 5);
  const evacuationQueue = [...hazardZones]
    .filter((zone) => zone.status === 'Evacuation' || zone.riskLevel === 'Critical')
    .sort((a, b) => Number(b.population || 0) - Number(a.population || 0))
    .slice(0, 5);
  const stabilized = hazardZones.filter((zone) => zone.status === 'Stabilized').length;

  const openEdit = (zone) => {
    setEditTarget(zone);
    setForm({
      name: zone.name,
      region: zone.region,
      hazardType: zone.hazardType,
      riskLevel: zone.riskLevel,
      status: zone.status,
      population: zone.population,
      evacuationPriority: zone.evacuationPriority || 'P2',
      coordinates: zone.coordinates || '',
      lastInspection: zone.lastInspection || '',
      notes: zone.notes || '',
    });
  };

  const handleCreate = async () => {
    if (!form.name) {
      toast('Zone name is required.', 'error');
      return;
    }

    setSaving(true);
    try {
      await addHazardZone(form);
      setShowAdd(false);
      setForm(BLANK);
      setSaving(false);
      toast('✅ Hazard zone added.', 'success');
    } catch (error) {
      setSaving(false);
      toast(error.message || 'Unable to create hazard zone.', 'error');
    }
  };

  const handleUpdate = async () => {
    if (!editTarget) return;
    if (!form.name) {
      toast('Zone name is required.', 'error');
      return;
    }

    setSaving(true);
    try {
      await updateHazardZone(editTarget.id, form);
      setEditTarget(null);
      setSaving(false);
      toast('✅ Hazard zone updated.', 'success');
    } catch (error) {
      setSaving(false);
      toast(error.message || 'Unable to update hazard zone.', 'error');
    }
  };

  const handleStatusCycle = async (zone) => {
    const sequence = ['Monitoring', 'Restricted', 'Evacuation', 'Stabilized'];
    const index = sequence.indexOf(zone.status);
    const next = sequence[(index + 1) % sequence.length];

    try {
      await updateHazardZone(zone.id, { status: next });
      toast(`Zone status updated to ${next}.`, 'info');
    } catch (error) {
      toast(error.message || 'Unable to update zone status.', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteHazardZone(deleteTarget.id);
      setDeleteTarget(null);
      toast('Hazard zone deleted.', 'info');
    } catch (error) {
      toast(error.message || 'Unable to delete zone.', 'error');
    }
  };

  const toggleFilterItem = (key, value) => {
    setMapFilters((prev) => {
      const current = prev[key] || [];
      const exists = current.includes(value);
      return {
        ...prev,
        [key]: exists ? current.filter((item) => item !== value) : [...current, value],
      };
    });
  };

  const handleUseLocation = async () => {
    const query = String(form.coordinates || '').trim() || String(form.name || '').trim() || String(form.region || '').trim();
    if (!query) {
      toast('Enter a zone name, region, or location text first.', 'error');
      return;
    }

    setGeocoding(true);
    try {
      const result = await api.geocode(query);
      setForm((prev) => ({
        ...prev,
        coordinates: `${result.lat.toFixed(6)}, ${result.lng.toFixed(6)}`,
      }));
      toast('Location mapped to coordinates.', 'success');
    } catch (error) {
      toast(error.message || 'Unable to map location.', 'error');
    } finally {
      setGeocoding(false);
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
      <div className="main-area page-hazard">
        <Topbar
          title="Hazard Zoning"
          subtitle="Map and classify risk corridors for evacuation and response planning."
          currentUser={currentUser}
          onLogout={onLogout}
        />

        <div className="page-body">
          <PageState loading={loading} error={error} />

          <div className="grid-3 mb-4 anim-1">
            <div className="stat-card">
              <div className="stat-label">🧭 Tracked Zones</div>
              <div className="stat-value" style={{ color: 'var(--blue)' }}>{hazardZones.length}</div>
              <div className="stat-delta">Geofenced risk areas</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">🚨 Critical Risk</div>
              <div className="stat-value" style={{ color: 'var(--red)' }}>{critical}</div>
              <div className="stat-delta">Immediate mitigation needed</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">👥 Population Exposed</div>
              <div className="stat-value" style={{ color: 'var(--orange)' }}>{riskPopulation.toLocaleString()}</div>
              <div className="stat-delta">{restricted} zones in restricted/evac state</div>
            </div>
          </div>

          <div className="grid-2 mb-4 anim-2">
            <div className="card">
              <div className="card-header">
                <span className="card-title">Regional Risk Pressure</span>
                <span className="badge badge-blue">Auto Ranked</span>
              </div>
              <div className="mini-kpi-row mb-2">
                <div className="mini-kpi">
                  <div className="mini-kpi-label">Restricted/Evac</div>
                  <div className="mini-kpi-value">{restricted}</div>
                </div>
                <div className="mini-kpi">
                  <div className="mini-kpi-label">Stabilized</div>
                  <div className="mini-kpi-value">{stabilized}</div>
                </div>
                <div className="mini-kpi">
                  <div className="mini-kpi-label">Critical</div>
                  <div className="mini-kpi-value">{critical}</div>
                </div>
              </div>
              <div className="brief-list">
                {regionPressure.map((entry) => (
                  <div className="brief-item" key={entry.region}>
                    <div>
                      <div className="activity-title">{entry.region}</div>
                      <div className="brief-meta">{entry.population.toLocaleString()} people exposed</div>
                    </div>
                    <span className={`badge ${entry.critical > 0 ? 'badge-red' : 'badge-green'}`}>
                      {entry.critical > 0 ? `${entry.critical} critical` : 'Stable'}
                    </span>
                  </div>
                ))}
                {regionPressure.length === 0 && <div className="widget-sub">No regional pressure data yet.</div>}
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <span className="card-title">Evacuation Priority Queue</span>
                <button className="btn btn-ghost btn-sm" onClick={() => setSearch('')}>Reset Filters</button>
              </div>
              <div className="brief-list">
                {evacuationQueue.map((zone) => (
                  <div className="brief-item" key={`evac-${zone.id}`}>
                    <div>
                      <div className="activity-title">{zone.name}</div>
                      <div className="brief-meta">{zone.region} · {Number(zone.population || 0).toLocaleString()} people</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className={`badge ${riskBadge(zone.riskLevel)}`}>{zone.riskLevel}</span>
                      <button className="btn btn-outline btn-sm" onClick={() => openEdit(zone)}>Review</button>
                    </div>
                  </div>
                ))}
                {evacuationQueue.length === 0 && <div className="widget-sub">No zones currently queued for evacuation.</div>}
              </div>
            </div>
          </div>

          <div className="card anim-3 mb-4">
            <div className="card-header" style={{ flexWrap: 'wrap', gap: 12 }}>
              <span className="card-title">Live Hazard & Disaster Map</span>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <label className="map-toggle">
                  <input
                    type="checkbox"
                    checked={showHeat}
                    onChange={(event) => setShowHeat(event.target.checked)}
                  />
                  Heat Layer
                </label>
                <label className="map-toggle">
                  <input
                    type="checkbox"
                    checked={mapFilters.showHazards}
                    onChange={(event) => setMapFilters((prev) => ({ ...prev, showHazards: event.target.checked }))}
                  />
                  Hazard Zones
                </label>
                <label className="map-toggle">
                  <input
                    type="checkbox"
                    checked={mapFilters.showDisasters}
                    onChange={(event) => setMapFilters((prev) => ({ ...prev, showDisasters: event.target.checked }))}
                  />
                  Disasters
                </label>
              </div>
            </div>

            <div className="map-filter-panel">
              <div className="map-filter-group">
                <span className="map-filter-label">Risk</span>
                {RISK.map((level) => (
                  <button
                    key={level}
                    type="button"
                    className={`map-chip ${mapFilters.riskLevels.includes(level) ? 'active' : ''}`}
                    onClick={() => toggleFilterItem('riskLevels', level)}
                  >
                    {level}
                  </button>
                ))}
              </div>

              <div className="map-filter-group">
                <span className="map-filter-label">Severity</span>
                {['Critical', 'High', 'Moderate', 'Low'].map((level) => (
                  <button
                    key={level}
                    type="button"
                    className={`map-chip ${mapFilters.severities.includes(level) ? 'active' : ''}`}
                    onClick={() => toggleFilterItem('severities', level)}
                  >
                    {level}
                  </button>
                ))}
              </div>

              <div className="map-filter-group">
                <span className="map-filter-label">Status</span>
                {['Active', 'Responding', 'Resolved', 'Restricted', 'Monitoring', 'Evacuation', 'Stabilized'].map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={`map-chip ${mapFilters.statuses.includes(value) ? 'active' : ''}`}
                    onClick={() => toggleFilterItem('statuses', value)}
                  >
                    {value}
                  </button>
                ))}
              </div>

              {typeOptions.length > 0 && (
                <div className="map-filter-group">
                  <span className="map-filter-label">Type</span>
                  {typeOptions.map((value) => (
                    <button
                      key={value}
                      type="button"
                      className={`map-chip ${mapFilters.types.includes(value) ? 'active' : ''}`}
                      onClick={() => toggleFilterItem('types', value)}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <HazardMap
              hazardZones={hazardZones}
              disasters={disasters}
              showHeat={showHeat}
              filters={mapFilters}
            />

            <p style={{ color: 'var(--text-secondary)', fontSize: 12, marginTop: 10 }}>
              Hover points for quick incident info, click for full details, and use mouse wheel or pinch to zoom.
            </p>
          </div>

          <div className="card anim-4">
            <div className="card-header" style={{ flexWrap: 'wrap', gap: 12 }}>
              <span className="card-title">Hazard Zone Register ({hazardZones.length})</span>
              <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap' }}>
                <div className="search-wrap" style={{ minWidth: 220 }}>
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>🔍</span>
                  <input placeholder="Search zone, region, hazard type" value={search} onChange={(event) => setSearch(event.target.value)} />
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => { setForm(BLANK); setShowAdd(true); }}>+ Add Hazard Zone</button>
              </div>
            </div>

            <div className="desktop-table" style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Zone Name</th>
                    <th>Region</th>
                    <th>Hazard</th>
                    <th>Risk</th>
                    <th>Population</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((zone) => (
                    <tr key={zone.id}>
                      <td>
                        <div style={{ fontWeight: 700 }}>{zone.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{zone.coordinates || 'No coordinates'} · {zone.evacuationPriority || 'P2'}</div>
                      </td>
                      <td>{zone.region}</td>
                      <td>{zone.hazardType}</td>
                      <td><span className={`badge ${riskBadge(zone.riskLevel)}`}>{zone.riskLevel}</span></td>
                      <td>{Number(zone.population || 0).toLocaleString()}</td>
                      <td>
                        <button className={`badge ${statusBadge(zone.status)}`} style={{ border: 'none', cursor: 'pointer' }} onClick={() => handleStatusCycle(zone)}>
                          {zone.status}
                        </button>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => openEdit(zone)}>✏️</button>
                          <button className="btn btn-ghost btn-sm" style={{ color: 'var(--red)' }} onClick={() => setDeleteTarget(zone)}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No hazard zones found</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mobile-list">
              {filtered.map((zone) => (
                <div className="mobile-entity-card" key={`mobile-${zone.id}`}>
                  <div className="mobile-entity-head">
                    <div>
                      <div className="mobile-entity-title">{zone.name}</div>
                      <div className="mobile-entity-sub">{zone.region} • {zone.hazardType}</div>
                    </div>
                    <span className={`badge ${riskBadge(zone.riskLevel)}`}>{zone.riskLevel}</span>
                  </div>
                  <div className="mobile-entity-meta">
                    <span>Status: {zone.status}</span>
                    <span>Population: {Number(zone.population || 0).toLocaleString()}</span>
                    <span>Coordinates: {zone.coordinates || 'N/A'}</span>
                    <span>Priority: {zone.evacuationPriority || 'P2'}</span>
                  </div>
                  <div className="mobile-entity-actions">
                    <button className="btn btn-ghost btn-sm" onClick={() => openEdit(zone)}>Edit</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => handleStatusCycle(zone)}>Status</button>
                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--red)' }} onClick={() => setDeleteTarget(zone)}>Delete</button>
                  </div>
                </div>
              ))}
              {filtered.length === 0 && <div className="state-banner state-empty">No hazard zones found.</div>}
            </div>
          </div>
        </div>
      </div>

      {showAdd && (
        <Modal
          title="🗺️ Add Hazard Zone"
          onClose={() => setShowAdd(false)}
          size="lg"
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setShowAdd(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreate} disabled={saving}>
                {saving ? <><span className="spinner" /> Saving...</> : 'Create Zone'}
              </button>
            </>
          }
        >
          <ZoneForm value={form} onChange={setForm} onUseLocation={handleUseLocation} geocoding={geocoding} />
        </Modal>
      )}

      {editTarget && (
        <Modal
          title="✏️ Edit Hazard Zone"
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
          <ZoneForm value={form} onChange={setForm} onUseLocation={handleUseLocation} geocoding={geocoding} />
        </Modal>
      )}

      {deleteTarget && (
        <Modal
          title="🗑️ Delete Hazard Zone"
          onClose={() => setDeleteTarget(null)}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleDelete}>Delete</button>
            </>
          }
        >
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Delete zone <strong style={{ color: 'var(--text-primary)' }}>{deleteTarget.name}</strong>? This action cannot be undone.
          </p>
        </Modal>
      )}
    </div>
  );
}
