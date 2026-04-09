import React, { useEffect, useMemo, useState } from 'react';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import PageState from '../components/PageState';
import { useToast } from '../components/Toast';
import { api } from '../api';

const DEFAULTS = {
  profile: {
    fullName: '',
    email: '',
    callSign: '',
  },
  notifications: {
    lowStockAlerts: true,
    incidentEscalations: true,
    hazardCritical: true,
    digestDaily: false,
  },
  operations: {
    defaultZone: 'Zone A - Riverside',
    autoRefreshSeconds: '30',
    requireDeleteConfirm: true,
    compactTables: false,
  },
};

function makeBase(currentUser) {
  return {
    ...DEFAULTS,
    profile: {
      ...DEFAULTS.profile,
      fullName: currentUser?.fullName || '',
      email: currentUser?.email || '',
      callSign: currentUser?.username || '',
    },
  };
}

function mergeSettings(base, incoming) {
  return {
    ...base,
    ...(incoming || {}),
    profile: { ...base.profile, ...((incoming && incoming.profile) || {}) },
    notifications: { ...base.notifications, ...((incoming && incoming.notifications) || {}) },
    operations: { ...base.operations, ...((incoming && incoming.operations) || {}) },
  };
}

function Toggle({ checked, onChange, label, hint }) {
  return (
    <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,.14)' }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600 }}>{label}</div>
        {hint && <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 3 }}>{hint}</div>}
      </div>
      <button
        type="button"
        onClick={onChange}
        style={{
          width: 48,
          height: 28,
          borderRadius: 999,
          border: '1px solid rgba(255,255,255,.28)',
          background: checked ? 'linear-gradient(135deg,var(--blue),var(--cyan))' : 'rgba(255,255,255,.2)',
          position: 'relative',
          cursor: 'pointer',
        }}
      >
        <span
          style={{
            position: 'absolute',
            width: 20,
            height: 20,
            borderRadius: '50%',
            top: 3,
            left: checked ? 24 : 4,
            background: '#fff',
            transition: 'left .18s ease',
          }}
        />
      </button>
    </label>
  );
}

export default function Settings({ page, onNav, currentUser, onLogout, featureFlags }) {
  const toast = useToast();
  const [settings, setSettings] = useState(() => makeBase(currentUser));
  const [baseline, setBaseline] = useState(() => makeBase(currentUser));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const remote = await api.getSettings();
        if (cancelled) return;
        const base = makeBase(currentUser);
        const merged = mergeSettings(base, remote);
        setSettings(merged);
        setBaseline(merged);
      } catch (loadError) {
        if (cancelled) return;
        setError(loadError.message || 'Unable to load settings.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [currentUser]);

  const hasChanges = useMemo(() => JSON.stringify(settings) !== JSON.stringify(baseline), [settings, baseline]);

  const enabledAlerts = Object.values(settings.notifications || {}).filter(Boolean).length;
  const profileFields = [settings.profile.fullName, settings.profile.email, settings.profile.callSign];
  const profileCompletion = Math.round((profileFields.filter((value) => String(value || '').trim()).length / profileFields.length) * 100);
  const refreshSeconds = Number(settings.operations.autoRefreshSeconds) || 30;

  const setProfile = (key) => (event) => {
    const value = event.target.value;
    setSettings((prev) => ({ ...prev, profile: { ...prev.profile, [key]: value } }));
  };

  const setOperations = (key) => (event) => {
    const value = event.target.value;
    setSettings((prev) => ({ ...prev, operations: { ...prev.operations, [key]: value } }));
  };

  const toggleNotifications = (key) => {
    setSettings((prev) => ({
      ...prev,
      notifications: { ...prev.notifications, [key]: !prev.notifications[key] },
    }));
  };

  const toggleOperations = (key) => {
    setSettings((prev) => ({
      ...prev,
      operations: { ...prev.operations, [key]: !prev.operations[key] },
    }));
  };

  const save = async () => {
    setSaving(true);
    try {
      const updated = await api.updateSettings(settings);
      const merged = mergeSettings(makeBase(currentUser), updated);
      setSettings(merged);
      setBaseline(merged);
      toast('Settings saved successfully.');
    } catch (saveError) {
      toast(saveError.message || 'Unable to save settings.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    const base = makeBase(currentUser);
    setSettings(base);
    toast('Reset to defaults. Click Save to apply.', 'info');
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
      <div className="main-area page-settings">
        <Topbar title="Settings Panel" subtitle="Configure profile, alerts, and operational preferences." currentUser={currentUser} onLogout={onLogout} />

        <div className="page-body">
          <PageState loading={loading} error={error} />

          {!loading && !error && (
            <>
              <div className="widget-grid mb-4 anim-1">
                <div className="widget">
                  <div className="widget-kicker">Alert Rules Enabled</div>
                  <div className="widget-value">{enabledAlerts}/4</div>
                  <div className="widget-sub">Active operational notifications.</div>
                  <div className="widget-meter"><span style={{ width: `${Math.max(8, enabledAlerts * 25)}%` }} /></div>
                </div>
                <div className="widget">
                  <div className="widget-kicker">Profile Completion</div>
                  <div className="widget-value">{profileCompletion}%</div>
                  <div className="widget-sub">Identity fields configured for this account.</div>
                  <div className="widget-meter"><span style={{ width: `${Math.max(8, profileCompletion)}%`, background: 'linear-gradient(90deg,var(--green),var(--cyan))' }} /></div>
                </div>
                <div className="widget">
                  <div className="widget-kicker">Refresh Cadence</div>
                  <div className="widget-value">{refreshSeconds}s</div>
                  <div className="widget-sub">Current auto-refresh interval for dashboards.</div>
                  <div className="widget-meter"><span style={{ width: `${Math.max(8, Math.round((120 - Math.min(120, refreshSeconds)) / 1.2))}%`, background: 'linear-gradient(90deg,var(--orange),var(--yellow))' }} /></div>
                </div>
                <div className="widget">
                  <div className="widget-kicker">Safety Controls</div>
                  <div className="widget-list">
                    <div className="widget-list-item"><span>Delete Confirmation</span><strong>{settings.operations.requireDeleteConfirm ? 'On' : 'Off'}</strong></div>
                    <div className="widget-list-item"><span>Compact Tables</span><strong>{settings.operations.compactTables ? 'On' : 'Off'}</strong></div>
                  </div>
                </div>
              </div>

              <div className="grid-2 anim-1" style={{ alignItems: 'start' }}>
                <div className="card">
                  <div className="card-header">
                    <span className="card-title">Profile Preferences</span>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Full Name</label>
                    <input className="form-control" value={settings.profile.fullName} onChange={setProfile('fullName')} placeholder="Your full name" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input className="form-control" value={settings.profile.email} onChange={setProfile('email')} placeholder="name@agency.org" />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Call Sign</label>
                    <input className="form-control" value={settings.profile.callSign} onChange={setProfile('callSign')} placeholder="ops-lead-01" />
                  </div>
                </div>

                <div className="card">
                  <div className="card-header">
                    <span className="card-title">Notification Rules</span>
                  </div>
                  <Toggle checked={settings.notifications.lowStockAlerts} onChange={() => toggleNotifications('lowStockAlerts')} label="Low Stock Alerts" hint="Instant notification when stock goes below threshold." />
                  <Toggle checked={settings.notifications.incidentEscalations} onChange={() => toggleNotifications('incidentEscalations')} label="Incident Escalations" hint="Alert when incident severity changes to high or critical." />
                  <Toggle checked={settings.notifications.hazardCritical} onChange={() => toggleNotifications('hazardCritical')} label="Critical Hazard Zones" hint="Prioritized alerts for critical-risk zone updates." />
                  <Toggle checked={settings.notifications.digestDaily} onChange={() => toggleNotifications('digestDaily')} label="Daily Digest" hint="Receive one daily operational summary." />
                </div>
              </div>

              <div className="grid-2 anim-2" style={{ marginTop: 16, alignItems: 'start' }}>
                <div className="card">
                  <div className="card-header">
                    <span className="card-title">Operational Defaults</span>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Default Allocation Zone</label>
                    <select className="form-control" value={settings.operations.defaultZone} onChange={setOperations('defaultZone')}>
                      <option>Zone A - Riverside</option>
                      <option>Zone B - Highland</option>
                      <option>Zone C - Downtown</option>
                      <option>Zone D - Coastal</option>
                      <option>Zone E - Industrial</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Auto Refresh (seconds)</label>
                    <select className="form-control" value={settings.operations.autoRefreshSeconds} onChange={setOperations('autoRefreshSeconds')}>
                      <option value="15">15</option>
                      <option value="30">30</option>
                      <option value="60">60</option>
                      <option value="120">120</option>
                    </select>
                  </div>
                  <Toggle checked={settings.operations.requireDeleteConfirm} onChange={() => toggleOperations('requireDeleteConfirm')} label="Require Delete Confirmation" hint="Show extra confirmation before destructive actions." />
                  <Toggle checked={settings.operations.compactTables} onChange={() => toggleOperations('compactTables')} label="Compact Tables" hint="Denser list/table presentation for power users." />
                </div>

                <div className="card">
                  <div className="card-header">
                    <span className="card-title">Environment Summary</span>
                  </div>
                  <div className="state-banner state-empty" style={{ marginBottom: 10 }}>
                    Active User: {currentUser?.username || 'operator'}
                  </div>
                  <div className="state-banner state-empty" style={{ marginBottom: 10 }}>
                    Role: {currentUser?.role || 'Operator'}
                  </div>
                  <div className="state-banner state-empty" style={{ marginBottom: 10 }}>
                    Volunteer Module: {featureFlags?.volunteersModule === false ? 'Disabled' : 'Enabled'}
                  </div>
                  <div className="state-banner state-empty">
                    Dashboard Trends: {featureFlags?.dashboardTrends === false ? 'Disabled' : 'Enabled'}
                  </div>
                </div>
              </div>

              <div className="card anim-3" style={{ marginTop: 16 }}>
                <div className="flex-between" style={{ flexWrap: 'wrap', gap: 10 }}>
                  <div>
                    <div className="card-title">Save Configuration</div>
                    <div className="text-muted" style={{ marginTop: 3 }}>
                      Preferences are now stored on the backend per authenticated user.
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button className="btn btn-ghost" onClick={reset}>Reset Defaults</button>
                    <button className="btn btn-primary" disabled={!hasChanges || saving} onClick={save}>{saving ? 'Saving...' : 'Save Settings'}</button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
