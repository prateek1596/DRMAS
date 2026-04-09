# DRAMS — Disaster Resource Allocation & Management System

## Quick Start
```bash
npm install
npm run dev
```

## Frontend + Backend
- Frontend: React app at `http://localhost:3000`
- Backend: Express API at `http://localhost:5000`
- Persistent data store: `backend/data/db.json`

### Run Commands
```bash
# Run frontend and backend together
npm run dev

# Run backend only
npm run backend

# Build frontend bundle
npm run build
```

## All Button Functionality

### Login
- Role selector (Admin / NGO / Volunteer) + validation

### Dashboard
- Stats update live from shared state
- Quick action buttons navigate to correct pages
- Recent incidents & low-stock widgets reflect real data

### Resource Inventory (/inventory)
- **+ Add Resource** — modal with name, category, qty, location, notes
- **✏️ Edit** — pre-filled modal, updates inventory on save
- **📤 Assign** — assign to a team/person, status → Assigned
- **↩️ Unassign** — returns to Available
- **🗑️ Delete** — confirmation modal
- Tab filters: All / Low Stock / Assigned
- Live search by name or location

### Disaster Reports (/report)
- **🚨 Report Disaster** — full modal: type, severity, location, people, time, info
- **👁️ View** — read-only detail modal
- **✏️ Edit** — pre-filled edit modal
- **● Status badge** — click to cycle Active → Responding → Resolved
- **🗑️ Delete** — confirmation modal

### Resource Allocation (/allocation)
- Select zone, resource (with live available count), quantity, volunteer
- Deducts from inventory in real time on allocate
- Live stock panel + per-category progress bars
- Running allocation log

### OTS Control (/ots)
- Full **Operational Task Scheduling** board
- Create/edit/delete operations tasks linked to incidents and zones
- Priority and status pipeline (Queued → In Progress → Blocked → Completed)
- Task ownership, ETA and notes for field execution

### Hazard Zoning (/hazard)
- Full hazard zoning register for high-risk corridors
- Create/edit/delete hazard zones with risk metadata
- Track hazard type, risk level, status, coordinates and exposed population
- One-click zone status progression for rapid response updates

## Backend API Coverage
- Auth: login/register
- Resources: CRUD + assign/unassign
- Disasters: CRUD + status updates
- Allocations: create + live inventory deduction + audit log
- OTS tasks: CRUD and status transitions
- Hazard zones: CRUD and status transitions

## Stack
React 18 · Express 4 · CSS Variables design system · React Context
Fonts: Rajdhani + DM Sans + DM Mono
