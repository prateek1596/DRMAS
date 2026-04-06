# DRAMS — Disaster Resource Allocation & Management System

## Quick Start
```bash
npm install
npm start
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

## Stack
React 18 · CSS Variables design system · React Context (no Redux)
Fonts: Rajdhani + DM Sans + DM Mono
