import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { getQueuedMutationCount, replayQueuedMutations } from '../api';

export default function Topbar({ title, subtitle, actions, currentUser, onLogout }) {
  const navigate = useNavigate();
  const store = useStore();
  const [notice, setNotice] = React.useState('');
  const [query, setQuery] = React.useState('');
  const [focused, setFocused] = React.useState(false);
  const [queuedCount, setQueuedCount] = React.useState(() => getQueuedMutationCount());
  const [isOnline, setIsOnline] = React.useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  const [isSyncing, setIsSyncing] = React.useState(false);

  React.useEffect(() => {
    const syncQueueState = () => {
      setQueuedCount(getQueuedMutationCount());
      setIsOnline(typeof navigator === 'undefined' ? true : navigator.onLine);
    };

    syncQueueState();
    window.addEventListener('online', syncQueueState);
    window.addEventListener('offline', syncQueueState);
    window.addEventListener('drams:queue-changed', syncQueueState);
    window.addEventListener('drams:queue-replayed', syncQueueState);

    return () => {
      window.removeEventListener('online', syncQueueState);
      window.removeEventListener('offline', syncQueueState);
      window.removeEventListener('drams:queue-changed', syncQueueState);
      window.removeEventListener('drams:queue-replayed', syncQueueState);
    };
  }, []);

  const handleSyncQueue = async () => {
    if (isSyncing) return;

    setIsSyncing(true);
    setNotice('Replaying queued field updates...');

    try {
      await replayQueuedMutations();
      const remaining = getQueuedMutationCount();
      setQueuedCount(remaining);
      setNotice(remaining ? `${remaining} updates still queued.` : 'Queued updates synced.');
    } catch (error) {
      setNotice(error?.message || 'Sync failed. Queued updates are still safe.');
    } finally {
      setIsSyncing(false);
    }
  };

  const searchResults = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || !store) return [];

    const records = [
      ...(store.resources || []).map((item) => ({
        id: `resource-${item.id}`,
        label: item.name,
        detail: `${item.category || 'Resource'} - ${item.location || 'Unknown location'} - ${item.status || 'Available'}`,
        page: '/inventory',
        type: 'Resource',
        haystack: [item.name, item.category, item.location, item.status, item.assignedTo],
      })),
      ...(store.disasters || []).map((item) => ({
        id: `incident-${item.id}`,
        label: `${item.type} at ${item.location}`,
        detail: `${item.severity || 'Unrated'} - ${item.status || 'Active'} - ${Number(item.people || 0).toLocaleString()} affected`,
        page: '/report',
        type: 'Incident',
        haystack: [item.type, item.location, item.severity, item.status, item.info],
      })),
      ...(store.otsTasks || []).map((item) => ({
        id: `ots-${item.id}`,
        label: item.title,
        detail: `${item.zone || 'Unassigned zone'} - ${item.priority || 'Priority'} - ${item.status || 'Queued'}`,
        page: '/ots',
        type: 'OTS',
        haystack: [item.title, item.zone, item.priority, item.status, item.owner, item.notes],
      })),
      ...(store.hazardZones || []).map((item) => ({
        id: `hazard-${item.id}`,
        label: item.name,
        detail: `${item.region || 'Unknown region'} - ${item.hazardType || 'Hazard'} - ${item.riskLevel || 'Risk pending'}`,
        page: '/hazard',
        type: 'Hazard',
        haystack: [item.name, item.region, item.hazardType, item.riskLevel, item.status, item.notes],
      })),
      ...(store.volunteers || []).map((item) => ({
        id: `volunteer-${item.id}`,
        label: item.fullName,
        detail: `${item.role || 'Volunteer'} - ${item.skill || 'General'} - ${item.status || 'Available'}`,
        page: '/volunteers',
        type: 'Volunteer',
        haystack: [item.fullName, item.role, item.skill, item.zone, item.status, item.phone],
      })),
    ];

    return records
      .map((record) => {
        const terms = record.haystack.filter(Boolean).map((value) => String(value).toLowerCase());
        const exact = terms.some((term) => term === q);
        const starts = terms.some((term) => term.startsWith(q));
        const includes = terms.some((term) => term.includes(q));
        if (!includes) return null;
        return { ...record, rank: exact ? 0 : starts ? 1 : 2 };
      })
      .filter(Boolean)
      .sort((a, b) => a.rank - b.rank || a.label.localeCompare(b.label))
      .slice(0, 6);
  }, [query, store]);

  const showSearchPanel = focused && query.trim().length > 0;

  const openResult = (result) => {
    if (!result) return;
    navigate(result.page);
    setQuery('');
    setFocused(false);
    setNotice(`Opened ${result.type.toLowerCase()}: ${result.label}`);
  };

  const handleSearchKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      openResult(searchResults[0]);
    }
    if (event.key === 'Escape') {
      setFocused(false);
      setQuery('');
    }
  };

  return (
    <header className="topbar">
      <div>
        <div className="page-title">{title}</div>
        {subtitle && <div className="page-subtitle">{subtitle}</div>}
        {notice && <div className="text-muted" style={{ marginTop: 4 }}>{notice}</div>}
      </div>
      <div className="topbar-right">
        <div className="search-wrap global-search">
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }} aria-hidden="true">&#128269;</span>
          <input
            placeholder="Search resources, incidents, tasks..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={handleSearchKeyDown}
            aria-label="Global search"
          />
          {showSearchPanel && (
            <div className="global-search-panel">
              {searchResults.length > 0 ? (
                searchResults.map((result) => (
                  <button
                    className="global-search-result"
                    key={result.id}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => openResult(result)}
                  >
                    <span>
                      <strong>{result.label}</strong>
                      <small>{result.detail}</small>
                    </span>
                    <em>{result.type}</em>
                  </button>
                ))
              ) : (
                <div className="global-search-empty">No operational records found.</div>
              )}
            </div>
          )}
        </div>
        <button
          className="topbar-user-chip sync-status-chip"
          type="button"
          onClick={queuedCount ? handleSyncQueue : undefined}
          disabled={isSyncing}
          title={queuedCount ? 'Replay queued updates' : isOnline ? 'Online' : 'Offline'}
          style={{ cursor: queuedCount && !isSyncing ? 'pointer' : 'default' }}
        >
          <strong>{isSyncing ? 'Syncing...' : queuedCount ? `${queuedCount} queued` : isOnline ? 'Online' : 'Offline'}</strong>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{queuedCount ? 'Pending sync' : 'Sync status'}</span>
        </button>
        <div className="topbar-user-chip">
          <strong>{currentUser?.username || 'admin'}</strong>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{currentUser?.role || 'Operator'} Console</span>
        </div>
        <button className="icon-btn" type="button" aria-label="Alerts" title="Alerts" onClick={() => setNotice('No new alerts. All systems are synced.')}>
          <span aria-hidden="true">&#128276;</span>
        </button>
        <button className="icon-btn" type="button" aria-label="Settings" title="Settings" onClick={() => navigate('/settings')}>
          <span aria-hidden="true">&#9881;</span>
        </button>
        {onLogout && <button className="btn btn-ghost btn-sm" onClick={onLogout}>Logout</button>}
        {actions}
      </div>
    </header>
  );
}