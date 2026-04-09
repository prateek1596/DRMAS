const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');

const DATA_DIR = process.env.DRAMS_DATA_DIR || path.join(__dirname, 'data');
const SQLITE_PATH = process.env.DRAMS_SQLITE_PATH || path.join(DATA_DIR, 'drams.sqlite');
const LEGACY_JSON_PATH = process.env.DRAMS_LEGACY_JSON_PATH || path.join(DATA_DIR, 'db.json');

const EMPTY_DATA = {
  users: [],
  resources: [],
  disasters: [],
  allocations: [],
  otsTasks: [],
  hazardZones: [],
};

function nowId() {
  return Date.now() + Math.floor(Math.random() * 1000);
}

function normalizeResource(resource) {
  const qty = Number(resource.qty) || 0;
  const status = resource.assignedTo ? 'Assigned' : qty < 10 ? 'Low' : 'Available';
  return { ...resource, qty, status };
}

function loadLegacyData() {
  if (!fs.existsSync(LEGACY_JSON_PATH)) return EMPTY_DATA;
  try {
    const raw = fs.readFileSync(LEGACY_JSON_PATH, 'utf8');
    return raw ? JSON.parse(raw) : EMPTY_DATA;
  } catch {
    return EMPTY_DATA;
  }
}

function run(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) return reject(err);
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function get(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row || null);
    });
  });
}

function all(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });
}

async function createSchema(db) {
  await run(
    db,
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY,
      fullName TEXT NOT NULL,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL,
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    )`
  );

  await run(
    db,
    `CREATE TABLE IF NOT EXISTS resources (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      qty INTEGER NOT NULL,
      location TEXT NOT NULL,
      notes TEXT,
      status TEXT NOT NULL,
      assignedTo TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    )`
  );

  await run(
    db,
    `CREATE TABLE IF NOT EXISTS disasters (
      id INTEGER PRIMARY KEY,
      type TEXT NOT NULL,
      severity TEXT NOT NULL,
      location TEXT NOT NULL,
      people INTEGER NOT NULL,
      time TEXT,
      info TEXT,
      coordinates TEXT,
      status TEXT NOT NULL,
      reportedBy TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    )`
  );

  await run(
    db,
    `CREATE TABLE IF NOT EXISTS allocations (
      id INTEGER PRIMARY KEY,
      icon TEXT,
      action TEXT,
      detail TEXT,
      area TEXT,
      resourceId INTEGER,
      qty INTEGER,
      volunteer TEXT,
      createdAt TEXT NOT NULL
    )`
  );

  await run(
    db,
    `CREATE TABLE IF NOT EXISTS ots_tasks (
      id INTEGER PRIMARY KEY,
      title TEXT NOT NULL,
      incidentId INTEGER,
      zone TEXT NOT NULL,
      priority TEXT NOT NULL,
      owner TEXT,
      eta TEXT,
      status TEXT NOT NULL,
      notes TEXT,
      createdAt TEXT NOT NULL
    )`
  );

  await run(
    db,
    `CREATE TABLE IF NOT EXISTS hazard_zones (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      region TEXT,
      hazardType TEXT,
      riskLevel TEXT,
      status TEXT,
      population INTEGER,
      evacuationPriority TEXT,
      coordinates TEXT,
      lastInspection TEXT,
      notes TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    )`
  );

  await run(
    db,
    `CREATE TABLE IF NOT EXISTS refresh_tokens (
      id INTEGER PRIMARY KEY,
      userId INTEGER NOT NULL,
      token TEXT NOT NULL UNIQUE,
      expiresAt TEXT NOT NULL,
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    )`
  );

  await run(
    db,
    `CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY,
      actorUserId INTEGER,
      actorUsername TEXT,
      action TEXT NOT NULL,
      entityType TEXT,
      entityId TEXT,
      metadata TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    )`
  );
}

async function seedFromLegacyIfNeeded(db) {
  if (process.env.DRAMS_DISABLE_LEGACY_SEED === 'true') return;

  const existing = await get(db, 'SELECT COUNT(*) AS count FROM users');
  if (existing && Number(existing.count) > 0) return;

  const legacy = loadLegacyData();

  for (const user of legacy.users || []) {
    await run(
      db,
      'INSERT INTO users (id, fullName, username, email, password, role, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        user.id || nowId(),
        user.fullName || '',
        user.username || '',
        user.email || '',
        user.password || '',
        user.role || 'Operator',
        user.createdAt || new Date().toISOString(),
      ]
    );
  }

  for (const resource of legacy.resources || []) {
    const normalized = normalizeResource(resource);
    await run(
      db,
      'INSERT INTO resources (id, name, category, qty, location, notes, status, assignedTo, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        normalized.id || nowId(),
        normalized.name || '',
        normalized.category || 'Other',
        normalized.qty,
        normalized.location || 'Main Depot',
        normalized.notes || '',
        normalized.status,
        normalized.assignedTo || '',
        resource.createdAt || new Date().toISOString(),
      ]
    );
  }

  for (const disaster of legacy.disasters || []) {
    await run(
      db,
      'INSERT INTO disasters (id, type, severity, location, people, time, info, coordinates, status, reportedBy, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        disaster.id || nowId(),
        disaster.type || 'Other',
        disaster.severity || 'Low',
        disaster.location || '',
        Number(disaster.people) || 0,
        disaster.time || '',
        disaster.info || '',
        disaster.coordinates || '',
        disaster.status || 'Active',
        disaster.reportedBy || 'System',
        disaster.createdAt || new Date().toISOString(),
      ]
    );
  }

  for (const allocation of legacy.allocations || []) {
    await run(
      db,
      'INSERT INTO allocations (id, icon, action, detail, area, resourceId, qty, volunteer, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        allocation.id || nowId(),
        allocation.icon || '📦',
        allocation.action || '',
        allocation.detail || '',
        allocation.area || '',
        allocation.resourceId || null,
        Number(allocation.qty) || 0,
        allocation.volunteer || '',
        allocation.createdAt || new Date().toISOString(),
      ]
    );
  }

  for (const task of legacy.otsTasks || []) {
    await run(
      db,
      'INSERT INTO ots_tasks (id, title, incidentId, zone, priority, owner, eta, status, notes, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        task.id || nowId(),
        task.title || '',
        task.incidentId || null,
        task.zone || '',
        task.priority || 'Moderate',
        task.owner || '',
        task.eta || '',
        task.status || 'Queued',
        task.notes || '',
        task.createdAt || new Date().toISOString(),
      ]
    );
  }

  for (const zone of legacy.hazardZones || []) {
    await run(
      db,
      'INSERT INTO hazard_zones (id, name, region, hazardType, riskLevel, status, population, evacuationPriority, coordinates, lastInspection, notes, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        zone.id || nowId(),
        zone.name || '',
        zone.region || '',
        zone.hazardType || 'Other',
        zone.riskLevel || 'Low',
        zone.status || 'Monitoring',
        Number(zone.population) || 0,
        zone.evacuationPriority || 'P2',
        zone.coordinates || '',
        zone.lastInspection || '',
        zone.notes || '',
        zone.createdAt || new Date().toISOString(),
      ]
    );
  }
}

async function hashPlainPasswordsIfNeeded(db) {
  const users = await all(db, 'SELECT id, password FROM users');
  for (const user of users) {
    const current = String(user.password || '');
    if (!current || current.startsWith('$2')) continue;
    const hash = await bcrypt.hash(current, 10);
    await run(db, 'UPDATE users SET password = ? WHERE id = ?', [hash, user.id]);
  }
}

async function initDatabase() {
  const sqliteDir = path.dirname(SQLITE_PATH);
  if (!fs.existsSync(sqliteDir)) {
    fs.mkdirSync(sqliteDir, { recursive: true });
  }

  const db = new sqlite3.Database(SQLITE_PATH);
  await createSchema(db);
  await seedFromLegacyIfNeeded(db);
  await hashPlainPasswordsIfNeeded(db);
  return db;
}

async function recordAudit(db, payload = {}) {
  const {
    actorUserId = null,
    actorUsername = '',
    action = 'UNKNOWN',
    entityType = '',
    entityId = '',
    metadata = null,
  } = payload;

  await run(
    db,
    'INSERT INTO audit_logs (id, actorUserId, actorUsername, action, entityType, entityId, metadata, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [
      nowId(),
      actorUserId,
      actorUsername,
      action,
      entityType,
      String(entityId || ''),
      metadata ? JSON.stringify(metadata) : null,
      new Date().toISOString(),
    ]
  );
}

module.exports = {
  initDatabase,
  run,
  get,
  all,
  nowId,
  normalizeResource,
  recordAudit,
};
