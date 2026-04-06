import React, { createContext, useContext, useState } from 'react';

const Store = createContext(null);

const initialResources = [
  { id: 1, name: 'Field Medical Kit', category: 'Medical', qty: 12, location: 'Zone D Depot', status: 'Low', assignedTo: '' },
  { id: 2, name: 'Water Purifier Unit', category: 'Water & Sanitation', qty: 60, location: 'Zone A Depot', status: 'Available', assignedTo: '' },
  { id: 3, name: 'Emergency Tent (10-person)', category: 'Shelter', qty: 34, location: 'Storage Wing B', status: 'Available', assignedTo: '' },
  { id: 4, name: 'Portable Generator 5kW', category: 'Power', qty: 8, location: 'Main Depot', status: 'Available', assignedTo: '' },
  { id: 5, name: 'Rescue Rope & Harness', category: 'Rescue', qty: 3, location: 'Zone C Depot', status: 'Low', assignedTo: '' },
  { id: 6, name: 'Food Ration Pack (7-day)', category: 'Food', qty: 200, location: 'Cold Storage A', status: 'Available', assignedTo: '' },
  { id: 7, name: 'Communication Radio', category: 'Communication', qty: 25, location: 'HQ Storage', status: 'Assigned', assignedTo: 'Team Alpha' },
];

const initialDisasters = [
  { id: 1, type: 'Flood', severity: 'Critical', location: 'Riverside District, Zone 3', people: 1400, time: '2024-12-01T08:30', info: 'Severe flooding, roads cut off. Immediate evacuation needed.', status: 'Active', reportedBy: 'Admin' },
  { id: 2, type: 'Wildfire', severity: 'High', location: 'Northern Forest Grid, Zone 9', people: 320, time: '2024-12-01T06:00', info: 'Fast-moving fire, wind-driven. Air support requested.', status: 'Active', reportedBy: 'NGO' },
  { id: 3, type: 'Earthquake', severity: 'Moderate', location: 'Downtown Core, District 5', people: 80, time: '2024-11-30T22:15', info: 'Structural damage to 3 buildings. Search & rescue underway.', status: 'Responding', reportedBy: 'Admin' },
];

export function StoreProvider({ children }) {
  const [resources, setResources] = useState(initialResources);
  const [disasters, setDisasters] = useState(initialDisasters);

  const addResource = (r) => setResources(prev => [...prev, { ...r, id: Date.now(), status: Number(r.qty) < 10 ? 'Low' : 'Available', assignedTo: '' }]);
  const updateResource = (id, changes) => setResources(prev => prev.map(r => r.id === id ? { ...r, ...changes } : r));
  const deleteResource = (id) => setResources(prev => prev.filter(r => r.id !== id));

  const addDisaster = (d) => setDisasters(prev => [...prev, { ...d, id: Date.now(), status: 'Active', reportedBy: 'Admin' }]);
  const updateDisaster = (id, changes) => setDisasters(prev => prev.map(d => d.id === id ? { ...d, ...changes } : d));
  const deleteDisaster = (id) => setDisasters(prev => prev.filter(d => d.id !== id));

  return (
    <Store.Provider value={{ resources, addResource, updateResource, deleteResource, disasters, addDisaster, updateDisaster, deleteDisaster }}>
      {children}
    </Store.Provider>
  );
}

export const useStore = () => useContext(Store);
