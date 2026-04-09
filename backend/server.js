const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { initDatabase, run, get, all, nowId, normalizeResource, recordAudit } = require('./database');

const app = express();
const PORT = process.env.PORT || 5000;
const ACCESS_SECRET = process.env.ACCESS_TOKEN_SECRET || 'drams-access-secret-change-me';
const REFRESH_SECRET = process.env.REFRESH_TOKEN_SECRET || 'drams-refresh-secret-change-me';
const ACCESS_EXPIRES = process.env.ACCESS_TOKEN_TTL || '15m';
const REFRESH_EXPIRES_DAYS = Number(process.env.REFRESH_TOKEN_DAYS || 30);

const FEATURE_FLAGS = {
  dashboardTrends: process.env.FLAG_DASHBOARD_TRENDS !== 'false',
  volunteersModule: process.env.FLAG_VOLUNTEERS_MODULE !== 'false',
  hazardModule: process.env.FLAG_HAZARD_MODULE !== 'false',
  otsModule: process.env.FLAG_OTS_MODULE !== 'false',
  allocationModule: process.env.FLAG_ALLOCATION_MODULE !== 'false',
};

const SETTINGS_DEFAULTS = {
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

app.use(cors());
app.use(express.json());

let db;

function expiryDate(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

function buildTokens(user) {
  const payload = {
    userId: user.id,
    username: user.username,
    role: user.role,
  };

  const accessToken = jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES });
  const refreshToken = jwt.sign(payload, REFRESH_SECRET, { expiresIn: `${REFRESH_EXPIRES_DAYS}d` });
  return { accessToken, refreshToken };
}

function parseAuthHeader(req) {
  const auth = String(req.headers.authorization || '');
  if (!auth.startsWith('Bearer ')) return '';
  return auth.slice(7).trim();
}

function requireAuth(req, res, next) {
  const token = parseAuthHeader(req);
  if (!token) return res.status(401).json({ message: 'Missing authorization token.' });

  try {
    const decoded = jwt.verify(token, ACCESS_SECRET);
    req.auth = decoded;
    return next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
}

function withActor(req) {
  return {
    actorUserId: req.auth?.userId || null,
    actorUsername: req.auth?.username || 'system',
  };
}

function minutesAgo(isoDate) {
  const mins = Math.max(1, Math.floor((Date.now() - new Date(isoDate).getTime()) / 60000));
  if (mins < 60) return `${mins} mins ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hrs ago`;
  const days = Math.floor(hours / 24);
  return `${days} days ago`;
}

function toDayKey(dateLike) {
  const d = new Date(dateLike || Date.now());
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function parseJsonObject(raw) {
  if (!raw) return {};
  if (typeof raw === 'object' && !Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(String(raw));
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
    return {};
  } catch {
    return {};
  }
}

async function readSettingsForUser(userId) {
  const user = await get(db, 'SELECT fullName, email, username FROM users WHERE id = ?', [userId]);
  const base = {
    ...SETTINGS_DEFAULTS,
    profile: {
      ...SETTINGS_DEFAULTS.profile,
      fullName: user?.fullName || '',
      email: user?.email || '',
      callSign: user?.username || '',
    },
  };

  const row = await get(db, 'SELECT * FROM user_settings WHERE userId = ?', [userId]);
  if (!row) return base;

  return {
    ...base,
    profile: { ...base.profile, ...parseJsonObject(row.profileJson) },
    notifications: { ...SETTINGS_DEFAULTS.notifications, ...parseJsonObject(row.notificationsJson) },
    operations: { ...SETTINGS_DEFAULTS.operations, ...parseJsonObject(row.operationsJson) },
  };
}

app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'drams-api', timestamp: new Date().toISOString() });
});

app.get('/api/feature-flags', (req, res) => {
  res.json(FEATURE_FLAGS);
});

app.get('/api/geocode', requireAuth, async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (!q) return res.status(400).json({ message: 'Query is required.' });

  try {
    const endpoint = new URL('https://nominatim.openstreetmap.org/search');
    endpoint.searchParams.set('q', q);
    endpoint.searchParams.set('format', 'jsonv2');
    endpoint.searchParams.set('limit', '1');

    const response = await fetch(endpoint.toString(), {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'drams/2.0 (ops-platform)',
      },
    });

    if (!response.ok) {
      return res.status(502).json({ message: 'Geocoding provider unavailable.' });
    }

    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) {
      return res.status(404).json({ message: 'No matching location found.' });
    }

    const top = data[0];
    const lat = Number(top.lat);
    const lng = Number(top.lon);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(422).json({ message: 'Invalid geocoding response.' });
    }

    return res.json({
      lat,
      lng,
      displayName: top.display_name || q,
      source: 'nominatim',
    });
  } catch {
    return res.status(500).json({ message: 'Unable to geocode location.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ message: 'Username and password are required.' });

  const user = await get(db, 'SELECT * FROM users WHERE lower(username) = lower(?)', [String(username)]);
  if (!user) return res.status(404).json({ message: 'User account not found.' });

  const valid = await bcrypt.compare(String(password), String(user.password));
  if (!valid) return res.status(401).json({ message: 'Incorrect password.' });

  const { accessToken, refreshToken } = buildTokens(user);
  await run(
    db,
    'INSERT INTO refresh_tokens (id, userId, token, expiresAt, createdAt) VALUES (?, ?, ?, ?, ?)',
    [nowId(), user.id, refreshToken, expiryDate(REFRESH_EXPIRES_DAYS), new Date().toISOString()]
  );

  await recordAudit(db, {
    actorUserId: user.id,
    actorUsername: user.username,
    action: 'AUTH_LOGIN',
    entityType: 'user',
    entityId: user.id,
  });

  return res.json({
    user: {
      id: user.id,
      fullName: user.fullName,
      username: user.username,
      role: user.role,
      email: user.email,
    },
    accessToken,
    refreshToken,
  });
});

app.post('/api/auth/register', async (req, res) => {
  const { fullName, email, username, password } = req.body || {};
  if (!fullName || !email || !username || !password) {
    return res.status(400).json({ message: 'All registration fields are required.' });
  }

  const existingUsername = await get(db, 'SELECT id FROM users WHERE lower(username) = lower(?)', [String(username)]);
  if (existingUsername) return res.status(409).json({ message: 'Username already exists. Choose another one.' });

  const existingEmail = await get(db, 'SELECT id FROM users WHERE lower(email) = lower(?)', [String(email)]);
  if (existingEmail) return res.status(409).json({ message: 'Email already registered. Try logging in.' });

  const hashedPassword = await bcrypt.hash(String(password), 10);
  const userId = nowId();

  await run(
    db,
    'INSERT INTO users (id, fullName, username, email, password, role, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [userId, String(fullName).trim(), String(username).trim(), String(email).trim(), hashedPassword, 'Operator', new Date().toISOString()]
  );

  await recordAudit(db, {
    actorUserId: userId,
    actorUsername: String(username).trim(),
    action: 'AUTH_REGISTER',
    entityType: 'user',
    entityId: userId,
  });

  res.status(201).json({ message: 'Account created successfully. Please log in.' });
});

app.post('/api/auth/refresh', async (req, res) => {
  const { refreshToken } = req.body || {};
  if (!refreshToken) return res.status(400).json({ message: 'Refresh token is required.' });

  const stored = await get(db, 'SELECT * FROM refresh_tokens WHERE token = ?', [String(refreshToken)]);
  if (!stored) return res.status(401).json({ message: 'Invalid refresh token.' });

  try {
    const decoded = jwt.verify(String(refreshToken), REFRESH_SECRET);
    const user = await get(db, 'SELECT * FROM users WHERE id = ?', [decoded.userId]);
    if (!user) return res.status(401).json({ message: 'Session user not found.' });

    const { accessToken } = buildTokens(user);
    return res.json({ accessToken });
  } catch {
    await run(db, 'DELETE FROM refresh_tokens WHERE token = ?', [String(refreshToken)]);
    return res.status(401).json({ message: 'Expired refresh token.' });
  }
});

app.post('/api/auth/logout', requireAuth, async (req, res) => {
  const { refreshToken } = req.body || {};
  if (refreshToken) {
    await run(db, 'DELETE FROM refresh_tokens WHERE token = ?', [String(refreshToken)]);
  }

  await recordAudit(db, {
    ...withActor(req),
    action: 'AUTH_LOGOUT',
    entityType: 'user',
    entityId: req.auth.userId,
  });

  res.json({ ok: true });
});

app.get('/api/bootstrap', requireAuth, async (req, res) => {
  const resources = await all(db, 'SELECT * FROM resources ORDER BY id ASC');
  const disasters = await all(db, 'SELECT * FROM disasters ORDER BY id ASC');
  const allocations = await all(db, 'SELECT * FROM allocations ORDER BY createdAt DESC');
  const otsTasks = await all(db, 'SELECT * FROM ots_tasks ORDER BY createdAt DESC');
  const hazardZones = await all(db, 'SELECT * FROM hazard_zones ORDER BY id DESC');

  res.json({ resources, disasters, allocations, otsTasks, hazardZones });
});

app.get('/api/trends', requireAuth, async (req, res) => {
  const disasters = await all(db, 'SELECT createdAt, time FROM disasters');
  const allocations = await all(db, 'SELECT createdAt, qty FROM allocations');
  const resources = await all(db, 'SELECT category, qty FROM resources');

  const days = [];
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }

  const incidentsByDay = days.map((day) => ({ day, value: 0 }));
  const allocationsByDay = days.map((day) => ({ day, value: 0 }));

  for (const d of disasters) {
    const key = toDayKey(d.createdAt || d.time);
    const idx = incidentsByDay.findIndex((item) => item.day === key);
    if (idx >= 0) incidentsByDay[idx].value += 1;
  }

  for (const a of allocations) {
    const key = toDayKey(a.createdAt);
    const idx = allocationsByDay.findIndex((item) => item.day === key);
    if (idx >= 0) allocationsByDay[idx].value += Number(a.qty || 0);
  }

  const stockByCategory = {};
  for (const r of resources) {
    const key = r.category || 'Other';
    stockByCategory[key] = (stockByCategory[key] || 0) + Number(r.qty || 0);
  }

  res.json({
    incidentsByDay,
    allocationsByDay,
    stockByCategory: Object.entries(stockByCategory).map(([category, qty]) => ({ category, qty })),
  });
});

app.get('/api/resources', requireAuth, async (req, res) => {
  const resources = await all(db, 'SELECT * FROM resources ORDER BY id ASC');
  res.json(resources);
});

app.post('/api/resources', requireAuth, async (req, res) => {
  const resource = normalizeResource({
    id: nowId(),
    name: req.body.name,
    category: req.body.category,
    qty: req.body.qty,
    location: req.body.location,
    notes: req.body.notes || '',
    assignedTo: '',
    createdAt: new Date().toISOString(),
  });

  await run(
    db,
    'INSERT INTO resources (id, name, category, qty, location, notes, status, assignedTo, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [resource.id, resource.name, resource.category, resource.qty, resource.location, resource.notes, resource.status, resource.assignedTo, resource.createdAt]
  );

  await recordAudit(db, {
    ...withActor(req),
    action: 'RESOURCE_CREATE',
    entityType: 'resource',
    entityId: resource.id,
    metadata: { name: resource.name, qty: resource.qty },
  });

  res.status(201).json(resource);
});

app.put('/api/resources/:id', requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const existing = await get(db, 'SELECT * FROM resources WHERE id = ?', [id]);
  if (!existing) return res.status(404).json({ message: 'Resource not found.' });

  const updated = normalizeResource({ ...existing, ...req.body, id });
  await run(
    db,
    'UPDATE resources SET name = ?, category = ?, qty = ?, location = ?, notes = ?, status = ?, assignedTo = ? WHERE id = ?',
    [updated.name, updated.category, updated.qty, updated.location, updated.notes || '', updated.status, updated.assignedTo || '', id]
  );

  await recordAudit(db, {
    ...withActor(req),
    action: 'RESOURCE_UPDATE',
    entityType: 'resource',
    entityId: id,
    metadata: { qty: updated.qty, status: updated.status },
  });

  res.json(updated);
});

app.delete('/api/resources/:id', requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  await run(db, 'DELETE FROM resources WHERE id = ?', [id]);
  await recordAudit(db, {
    ...withActor(req),
    action: 'RESOURCE_DELETE',
    entityType: 'resource',
    entityId: id,
  });
  res.status(204).send();
});

app.post('/api/resources/:id/assign', requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const existing = await get(db, 'SELECT * FROM resources WHERE id = ?', [id]);
  if (!existing) return res.status(404).json({ message: 'Resource not found.' });

  const updated = normalizeResource({ ...existing, assignedTo: req.body.assignedTo || '' });
  await run(db, 'UPDATE resources SET assignedTo = ?, status = ? WHERE id = ?', [updated.assignedTo, updated.status, id]);

  await recordAudit(db, {
    ...withActor(req),
    action: 'RESOURCE_ASSIGN',
    entityType: 'resource',
    entityId: id,
    metadata: { assignedTo: updated.assignedTo },
  });

  res.json(updated);
});

app.post('/api/resources/:id/unassign', requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const existing = await get(db, 'SELECT * FROM resources WHERE id = ?', [id]);
  if (!existing) return res.status(404).json({ message: 'Resource not found.' });

  const updated = normalizeResource({ ...existing, assignedTo: '' });
  await run(db, 'UPDATE resources SET assignedTo = ?, status = ? WHERE id = ?', ['', updated.status, id]);

  await recordAudit(db, {
    ...withActor(req),
    action: 'RESOURCE_UNASSIGN',
    entityType: 'resource',
    entityId: id,
  });

  res.json(updated);
});

app.get('/api/disasters', requireAuth, async (req, res) => {
  const rows = await all(db, 'SELECT * FROM disasters ORDER BY id DESC');
  res.json(rows);
});

app.post('/api/disasters', requireAuth, async (req, res) => {
  const disaster = {
    id: nowId(),
    type: req.body.type,
    severity: req.body.severity,
    location: req.body.location,
    people: Number(req.body.people) || 0,
    time: req.body.time || '',
    info: req.body.info || '',
    coordinates: req.body.coordinates || '',
    status: req.body.status || 'Active',
    reportedBy: req.body.reportedBy || req.auth.username || 'Operator',
    createdAt: new Date().toISOString(),
  };

  await run(
    db,
    'INSERT INTO disasters (id, type, severity, location, people, time, info, coordinates, status, reportedBy, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [disaster.id, disaster.type, disaster.severity, disaster.location, disaster.people, disaster.time, disaster.info, disaster.coordinates, disaster.status, disaster.reportedBy, disaster.createdAt]
  );

  await recordAudit(db, {
    ...withActor(req),
    action: 'DISASTER_CREATE',
    entityType: 'disaster',
    entityId: disaster.id,
    metadata: { type: disaster.type, severity: disaster.severity },
  });

  res.status(201).json(disaster);
});

app.put('/api/disasters/:id', requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const existing = await get(db, 'SELECT * FROM disasters WHERE id = ?', [id]);
  if (!existing) return res.status(404).json({ message: 'Disaster not found.' });

  const updated = { ...existing, ...req.body, id };
  await run(
    db,
    'UPDATE disasters SET type = ?, severity = ?, location = ?, people = ?, time = ?, info = ?, coordinates = ?, status = ?, reportedBy = ? WHERE id = ?',
    [updated.type, updated.severity, updated.location, Number(updated.people) || 0, updated.time || '', updated.info || '', updated.coordinates || '', updated.status || 'Active', updated.reportedBy || 'Operator', id]
  );

  await recordAudit(db, {
    ...withActor(req),
    action: 'DISASTER_UPDATE',
    entityType: 'disaster',
    entityId: id,
    metadata: { status: updated.status },
  });

  res.json(updated);
});

app.delete('/api/disasters/:id', requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  await run(db, 'DELETE FROM disasters WHERE id = ?', [id]);
  await recordAudit(db, {
    ...withActor(req),
    action: 'DISASTER_DELETE',
    entityType: 'disaster',
    entityId: id,
  });
  res.status(204).send();
});

app.get('/api/allocations', requireAuth, async (req, res) => {
  const rows = await all(db, 'SELECT * FROM allocations ORDER BY createdAt DESC');
  res.json(rows);
});

app.post('/api/allocations', requireAuth, async (req, res) => {
  const { area, resourceId, qty, volunteer } = req.body || {};
  const resourceIdNum = Number(resourceId);
  const qtyNum = Number(qty);

  if (!area || !resourceIdNum || !qtyNum) {
    return res.status(400).json({ message: 'Area, resource and quantity are required.' });
  }

  const resource = await get(db, 'SELECT * FROM resources WHERE id = ?', [resourceIdNum]);
  if (!resource) return res.status(404).json({ message: 'Resource not found.' });
  if (qtyNum > Number(resource.qty)) return res.status(400).json({ message: `Only ${resource.qty} units available.` });

  const nextQty = Number(resource.qty) - qtyNum;
  const updatedResource = normalizeResource({
    ...resource,
    qty: nextQty,
    assignedTo: volunteer || resource.assignedTo || '',
  });

  await run(db, 'UPDATE resources SET qty = ?, assignedTo = ?, status = ? WHERE id = ?', [updatedResource.qty, updatedResource.assignedTo, updatedResource.status, resourceIdNum]);

  const entry = {
    id: nowId(),
    icon: '📦',
    action: `${qtyNum}x ${resource.name} -> ${area}`,
    detail: `${volunteer ? `Lead: ${volunteer} · ` : ''}Just now`,
    area,
    resourceId: resourceIdNum,
    qty: qtyNum,
    volunteer: volunteer || '',
    createdAt: new Date().toISOString(),
  };

  await run(
    db,
    'INSERT INTO allocations (id, icon, action, detail, area, resourceId, qty, volunteer, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [entry.id, entry.icon, entry.action, entry.detail, entry.area, entry.resourceId, entry.qty, entry.volunteer, entry.createdAt]
  );

  const existing = await all(db, 'SELECT id, area, detail, createdAt FROM allocations');
  for (const log of existing) {
    const detail = log.createdAt ? `${log.area || 'Operational zone'} · ${minutesAgo(log.createdAt)}` : log.detail;
    await run(db, 'UPDATE allocations SET detail = ? WHERE id = ?', [detail, log.id]);
  }

  await recordAudit(db, {
    ...withActor(req),
    action: 'ALLOCATION_CREATE',
    entityType: 'allocation',
    entityId: entry.id,
    metadata: { resourceId: resourceIdNum, qty: qtyNum },
  });

  res.status(201).json({ allocation: entry, resource: updatedResource });
});

app.get('/api/ots', requireAuth, async (req, res) => {
  const rows = await all(db, 'SELECT * FROM ots_tasks ORDER BY createdAt DESC');
  res.json(rows);
});

app.post('/api/ots', requireAuth, async (req, res) => {
  const task = {
    id: nowId(),
    title: req.body.title,
    incidentId: req.body.incidentId ? Number(req.body.incidentId) : null,
    zone: req.body.zone,
    priority: req.body.priority || 'Moderate',
    owner: req.body.owner || '',
    eta: req.body.eta || '',
    status: req.body.status || 'Queued',
    notes: req.body.notes || '',
    createdAt: new Date().toISOString(),
  };

  await run(
    db,
    'INSERT INTO ots_tasks (id, title, incidentId, zone, priority, owner, eta, status, notes, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [task.id, task.title, task.incidentId, task.zone, task.priority, task.owner, task.eta, task.status, task.notes, task.createdAt]
  );

  await recordAudit(db, {
    ...withActor(req),
    action: 'OTS_CREATE',
    entityType: 'ots_task',
    entityId: task.id,
  });

  res.status(201).json(task);
});

app.put('/api/ots/:id', requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const existing = await get(db, 'SELECT * FROM ots_tasks WHERE id = ?', [id]);
  if (!existing) return res.status(404).json({ message: 'OTS task not found.' });

  const updated = { ...existing, ...req.body, id };
  await run(
    db,
    'UPDATE ots_tasks SET title = ?, incidentId = ?, zone = ?, priority = ?, owner = ?, eta = ?, status = ?, notes = ? WHERE id = ?',
    [updated.title, updated.incidentId ? Number(updated.incidentId) : null, updated.zone, updated.priority, updated.owner || '', updated.eta || '', updated.status, updated.notes || '', id]
  );

  await recordAudit(db, {
    ...withActor(req),
    action: 'OTS_UPDATE',
    entityType: 'ots_task',
    entityId: id,
    metadata: { status: updated.status },
  });

  res.json(updated);
});

app.delete('/api/ots/:id', requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  await run(db, 'DELETE FROM ots_tasks WHERE id = ?', [id]);
  await recordAudit(db, {
    ...withActor(req),
    action: 'OTS_DELETE',
    entityType: 'ots_task',
    entityId: id,
  });
  res.status(204).send();
});

app.get('/api/hazard-zones', requireAuth, async (req, res) => {
  const rows = await all(db, 'SELECT * FROM hazard_zones ORDER BY id DESC');
  res.json(rows);
});

app.post('/api/hazard-zones', requireAuth, async (req, res) => {
  const zone = {
    id: nowId(),
    name: req.body.name,
    region: req.body.region,
    hazardType: req.body.hazardType,
    riskLevel: req.body.riskLevel,
    status: req.body.status || 'Monitoring',
    population: Number(req.body.population) || 0,
    evacuationPriority: req.body.evacuationPriority || 'P2',
    coordinates: req.body.coordinates || '',
    lastInspection: req.body.lastInspection || '',
    notes: req.body.notes || '',
    createdAt: new Date().toISOString(),
  };

  await run(
    db,
    'INSERT INTO hazard_zones (id, name, region, hazardType, riskLevel, status, population, evacuationPriority, coordinates, lastInspection, notes, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [zone.id, zone.name, zone.region, zone.hazardType, zone.riskLevel, zone.status, zone.population, zone.evacuationPriority, zone.coordinates, zone.lastInspection, zone.notes, zone.createdAt]
  );

  await recordAudit(db, {
    ...withActor(req),
    action: 'HAZARD_CREATE',
    entityType: 'hazard_zone',
    entityId: zone.id,
  });

  res.status(201).json(zone);
});

app.put('/api/hazard-zones/:id', requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const existing = await get(db, 'SELECT * FROM hazard_zones WHERE id = ?', [id]);
  if (!existing) return res.status(404).json({ message: 'Hazard zone not found.' });

  const updated = {
    ...existing,
    ...req.body,
    id,
    population: Number(req.body.population ?? existing.population) || 0,
  };

  await run(
    db,
    'UPDATE hazard_zones SET name = ?, region = ?, hazardType = ?, riskLevel = ?, status = ?, population = ?, evacuationPriority = ?, coordinates = ?, lastInspection = ?, notes = ? WHERE id = ?',
    [updated.name, updated.region, updated.hazardType, updated.riskLevel, updated.status, updated.population, updated.evacuationPriority, updated.coordinates || '', updated.lastInspection || '', updated.notes || '', id]
  );

  await recordAudit(db, {
    ...withActor(req),
    action: 'HAZARD_UPDATE',
    entityType: 'hazard_zone',
    entityId: id,
    metadata: { status: updated.status, riskLevel: updated.riskLevel },
  });

  res.json(updated);
});

app.delete('/api/hazard-zones/:id', requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  await run(db, 'DELETE FROM hazard_zones WHERE id = ?', [id]);
  await recordAudit(db, {
    ...withActor(req),
    action: 'HAZARD_DELETE',
    entityType: 'hazard_zone',
    entityId: id,
  });
  res.status(204).send();
});

app.get('/api/volunteers', requireAuth, async (req, res) => {
  const rows = await all(db, 'SELECT * FROM volunteers ORDER BY updatedAt DESC, id DESC');
  res.json(rows);
});

app.post('/api/volunteers', requireAuth, async (req, res) => {
  const fullName = String(req.body.fullName || '').trim();
  const role = String(req.body.role || '').trim();
  const skill = String(req.body.skill || '').trim();
  const zone = String(req.body.zone || '').trim();

  if (!fullName || !role || !skill || !zone) {
    return res.status(400).json({ message: 'Full name, role, skill, and zone are required.' });
  }

  const volunteer = {
    id: nowId(),
    fullName,
    role,
    skill,
    zone,
    phone: String(req.body.phone || '').trim(),
    status: String(req.body.status || 'Available').trim() || 'Available',
    notes: String(req.body.notes || '').trim(),
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };

  await run(
    db,
    'INSERT INTO volunteers (id, fullName, role, skill, zone, phone, status, notes, updatedAt, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
      volunteer.id,
      volunteer.fullName,
      volunteer.role,
      volunteer.skill,
      volunteer.zone,
      volunteer.phone,
      volunteer.status,
      volunteer.notes,
      volunteer.updatedAt,
      volunteer.createdAt,
    ]
  );

  await recordAudit(db, {
    ...withActor(req),
    action: 'VOLUNTEER_CREATE',
    entityType: 'volunteer',
    entityId: volunteer.id,
    metadata: { role: volunteer.role, zone: volunteer.zone },
  });

  res.status(201).json(volunteer);
});

app.put('/api/volunteers/:id', requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const existing = await get(db, 'SELECT * FROM volunteers WHERE id = ?', [id]);
  if (!existing) return res.status(404).json({ message: 'Volunteer not found.' });

  const updated = {
    ...existing,
    ...req.body,
    id,
    fullName: String(req.body.fullName ?? existing.fullName ?? '').trim(),
    role: String(req.body.role ?? existing.role ?? '').trim(),
    skill: String(req.body.skill ?? existing.skill ?? '').trim(),
    zone: String(req.body.zone ?? existing.zone ?? '').trim(),
    phone: String(req.body.phone ?? existing.phone ?? '').trim(),
    status: String(req.body.status ?? existing.status ?? 'Available').trim() || 'Available',
    notes: String(req.body.notes ?? existing.notes ?? '').trim(),
    updatedAt: new Date().toISOString(),
  };

  if (!updated.fullName || !updated.role || !updated.skill || !updated.zone) {
    return res.status(400).json({ message: 'Full name, role, skill, and zone are required.' });
  }

  await run(
    db,
    'UPDATE volunteers SET fullName = ?, role = ?, skill = ?, zone = ?, phone = ?, status = ?, notes = ?, updatedAt = ? WHERE id = ?',
    [updated.fullName, updated.role, updated.skill, updated.zone, updated.phone, updated.status, updated.notes, updated.updatedAt, id]
  );

  await recordAudit(db, {
    ...withActor(req),
    action: 'VOLUNTEER_UPDATE',
    entityType: 'volunteer',
    entityId: id,
    metadata: { status: updated.status, zone: updated.zone },
  });

  res.json(updated);
});

app.delete('/api/volunteers/:id', requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  await run(db, 'DELETE FROM volunteers WHERE id = ?', [id]);

  await recordAudit(db, {
    ...withActor(req),
    action: 'VOLUNTEER_DELETE',
    entityType: 'volunteer',
    entityId: id,
  });

  res.status(204).send();
});

app.get('/api/settings', requireAuth, async (req, res) => {
  const settings = await readSettingsForUser(req.auth.userId);
  res.json(settings);
});

app.put('/api/settings', requireAuth, async (req, res) => {
  const incomingProfile = parseJsonObject(req.body.profile);
  const incomingNotifications = parseJsonObject(req.body.notifications);
  const incomingOperations = parseJsonObject(req.body.operations);

  const existing = await readSettingsForUser(req.auth.userId);
  const merged = {
    profile: { ...existing.profile, ...incomingProfile },
    notifications: { ...existing.notifications, ...incomingNotifications },
    operations: { ...existing.operations, ...incomingOperations },
  };

  await run(
    db,
    `INSERT INTO user_settings (userId, profileJson, notificationsJson, operationsJson, updatedAt)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(userId) DO UPDATE SET
       profileJson = excluded.profileJson,
       notificationsJson = excluded.notificationsJson,
       operationsJson = excluded.operationsJson,
       updatedAt = excluded.updatedAt`,
    [
      req.auth.userId,
      JSON.stringify(merged.profile),
      JSON.stringify(merged.notifications),
      JSON.stringify(merged.operations),
      new Date().toISOString(),
    ]
  );

  await recordAudit(db, {
    ...withActor(req),
    action: 'SETTINGS_UPDATE',
    entityType: 'user_settings',
    entityId: req.auth.userId,
  });

  res.json(merged);
});

app.get('/api/audit-logs', requireAuth, async (req, res) => {
  const rows = await all(db, 'SELECT * FROM audit_logs ORDER BY createdAt DESC LIMIT 200');
  res.json(rows);
});

async function startServer() {
  db = await initDatabase();
  return new Promise((resolve) => {
    const server = app.listen(PORT, () => {
      console.log(`DRAMS backend listening on port ${PORT}`);
      resolve(server);
    });
  });
}

if (require.main === module) {
  startServer().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}

module.exports = {
  app,
  startServer,
};
