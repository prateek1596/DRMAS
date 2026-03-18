import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import './Report.css';

const disasterTypes = ['Flood', 'Earthquake', 'Wildfire', 'Hurricane', 'Tornado', 'Drought', 'Chemical Spill', 'Other'];
const severityLevels = ['Critical', 'High', 'Moderate', 'Low'];

export default function Report({ currentPage, onNavigate }) {
  const [form, setForm] = useState({ type: '', severity: '', location: '', people: '', time: '', info: '' });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => { setSubmitting(false); setSubmitted(true); }, 1200);
  };

  return (
    <div className="app-shell">
      <Sidebar currentPage={currentPage} onNavigate={onNavigate} />
      <div className="main-area">
        <Topbar title="Emergency Portal" subtitle="Official Reporting System" />
        <div className="page-body">

          {submitted ? (
            <div className="report-success anim-1">
              <div className="success-icon">✅</div>
              <h2 className="success-title">Report Submitted Successfully</h2>
              <p className="success-desc">Your incident report has been forwarded to the National Emergency Response Coordination Center. Response teams have been notified.</p>
              <div className="success-ref">Reference ID: <span className="text-mono" style={{ color: 'var(--blue)' }}>#DR-{Math.random().toString(36).substring(2,8).toUpperCase()}</span></div>
              <button className="btn btn-outline" style={{ marginTop: 20 }} onClick={() => setSubmitted(false)}>Submit Another Report</button>
            </div>
          ) : (
            <div className="report-layout anim-1">
              <div>
                <div style={{ marginBottom: 6 }}>
                  <nav style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 20 }}>
                    Services &rsaquo; <span style={{ color: 'var(--text-primary)' }}>Disaster Reporting</span>
                  </nav>
                  <h1 className="page-title" style={{ marginBottom: 4 }}>Report Disaster</h1>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 28 }}>Submit high-priority incident reports to the national emergency response coordination center.</p>
                </div>

                <div className="card">
                  {/* Header image placeholder */}
                  <div className="report-hero">
                    <div className="report-hero-overlay">
                      <div className="report-hero-badge">
                        <span>📋</span>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 14 }}>Incident Details</div>
                          <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Required for immediate action</div>
                        </div>
                      </div>
                    </div>
                    {/* Animated wave pattern */}
                    <svg width="100%" height="100%" viewBox="0 0 600 140" preserveAspectRatio="none">
                      <path d="M0,70 C100,20 200,120 300,70 C400,20 500,120 600,70 L600,140 L0,140 Z" fill="rgba(79,110,255,0.08)" />
                      <path d="M0,90 C150,40 250,140 400,80 C500,30 580,100 600,90 L600,140 L0,140 Z" fill="rgba(79,110,255,0.05)" />
                    </svg>
                  </div>

                  <form onSubmit={handleSubmit} style={{ padding: '0 4px' }}>
                    <div className="form-row" style={{ marginTop: 20 }}>
                      <div className="form-group">
                        <label className="form-label">Disaster Type</label>
                        <select className="form-control" value={form.type} onChange={set('type')} required>
                          <option value="">Select Disaster Type</option>
                          {disasterTypes.map(t => <option key={t}>{t}</option>)}
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Severity Level</label>
                        <select className="form-control" value={form.severity} onChange={set('severity')} required>
                          <option value="">Select Severity</option>
                          {severityLevels.map(s => <option key={s}>{s}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Location</label>
                      <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 14 }}>📍</span>
                        <input
                          className="form-control"
                          style={{ paddingLeft: 36 }}
                          placeholder="Enter affected area name or GPS coordinates"
                          value={form.location}
                          onChange={set('location')}
                          required
                        />
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">People Affected</label>
                        <div style={{ position: 'relative' }}>
                          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 14 }}>👥</span>
                          <input
                            className="form-control"
                            style={{ paddingLeft: 36 }}
                            type="number"
                            placeholder="Approx. number"
                            value={form.people}
                            onChange={set('people')}
                          />
                        </div>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Time of Incident</label>
                        <input
                          className="form-control"
                          type="datetime-local"
                          value={form.time}
                          onChange={set('time')}
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Additional Information</label>
                      <textarea
                        className="form-control"
                        placeholder="Describe the situation, required resources, or immediate hazards..."
                        value={form.info}
                        onChange={set('info')}
                      />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                      <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>⚠️ False reporting is a punishable offense</p>
                      <button
                        type="submit"
                        className={`btn btn-primary btn-lg${submitting ? ' loading' : ''}`}
                        disabled={submitting}
                      >
                        {submitting ? <span className="spinner" /> : '📡 SUBMIT REPORT →'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              {/* Side panel */}
              <div>
                <div className="card mb-3" style={{ border: '1px solid rgba(255,61,85,0.3)', background: 'rgba(255,61,85,0.05)' }}>
                  <div className="card-title" style={{ marginBottom: 10, color: 'var(--red)' }}>🚨 Emergency Contacts</div>
                  {[
                    { name: 'National Crisis Line', number: '1-800-DISASTER' },
                    { name: 'Medical Emergency', number: '911' },
                    { name: 'FEMA Operations', number: '1-800-621-3362' },
                  ].map(c => (
                    <div key={c.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                      <span style={{ color: 'var(--text-secondary)' }}>{c.name}</span>
                      <span className="text-mono" style={{ color: 'var(--blue)' }}>{c.number}</span>
                    </div>
                  ))}
                </div>

                <div className="card">
                  <div className="card-title" style={{ marginBottom: 14 }}>📊 Active Incidents</div>
                  {[
                    { name: 'Coastal Flooding — Zone 3', severity: 'Critical', color: 'var(--red)' },
                    { name: 'Forest Fire — Northern Grid', severity: 'High', color: 'var(--orange)' },
                    { name: 'Power Outage — District 9', severity: 'Moderate', color: 'var(--yellow)' },
                  ].map(i => (
                    <div key={i.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ fontSize: 12.5, fontWeight: 500 }}>{i.name}</div>
                      <span style={{ fontSize: 10, fontWeight: 700, color: i.color, background: `${i.color}20`, padding: '2px 8px', borderRadius: 10 }}>{i.severity}</span>
                    </div>
                  ))}
                  <button className="btn btn-ghost btn-sm" style={{ marginTop: 12, width: '100%', justifyContent: 'center' }}>View Incident Map →</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
