import React, { useEffect, useMemo, useState } from 'react';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import PageState from '../components/PageState';
import { api } from '../api';

function formatTime(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

function parseMetadata(raw) {
  if (!raw) return null;
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export default function AuditLogs({ page, onNav, currentUser, onLogout, featureFlags }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const data = await api.getAuditLogs();
        if (!cancelled) setRows(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!cancelled) setError(e.message || 'Unable to load audit logs.');
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
    if (!q) return rows;

    return rows.filter((item) => {
      const text = [
        item.action,
        item.actorUsername,
        item.entityType,
        item.entityId,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return text.includes(q);
    });
  }, [rows, search]);

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
          audit: true,
        }}
      />

      <div className="main-area page-dashboard">
        <Topbar
          title="Audit Logs"
          subtitle="Trace all mutating actions and authentication events across the platform."
          currentUser={currentUser}
          onLogout={onLogout}
        />

        <div className="page-body">
          <PageState loading={loading} error={error} empty={!loading && !error && rows.length === 0} emptyMessage="No audit logs yet." />

          {!loading && !error && (
            <div className="card anim-2">
              <div className="card-header" style={{ flexWrap: 'wrap', gap: 12 }}>
                <span className="card-title">Recent Activity ({filtered.length})</span>
                <div className="search-wrap" style={{ minWidth: 240 }}>
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>🔍</span>
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search action, actor, entity"
                  />
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Action</th>
                      <th>Actor</th>
                      <th>Entity</th>
                      <th>Metadata</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((item) => {
                      const metadata = parseMetadata(item.metadata);
                      return (
                        <tr key={item.id}>
                          <td>{formatTime(item.createdAt)}</td>
                          <td>
                            <span className="badge badge-blue">{item.action || '-'}</span>
                          </td>
                          <td>{item.actorUsername || 'system'}</td>
                          <td>{item.entityType || '-'} {item.entityId ? `#${item.entityId}` : ''}</td>
                          <td>
                            {metadata ? (
                              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'var(--font-m)', fontSize: 11 }}>
                                {JSON.stringify(metadata)}
                              </pre>
                            ) : (
                              '-'
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {filtered.length === 0 && (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                          No matching audit records.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
