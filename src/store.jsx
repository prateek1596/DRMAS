import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from './api';

const Store = createContext(null);

export function StoreProvider({ children }) {
  const [resources, setResources] = useState([]);
  const [disasters, setDisasters] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [otsTasks, setOtsTasks] = useState([]);
  const [hazardZones, setHazardZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadBootstrap = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.bootstrap();
      setResources(data.resources || []);
      setDisasters(data.disasters || []);
      setAllocations(data.allocations || []);
      setOtsTasks(data.otsTasks || []);
      setHazardZones(data.hazardZones || []);
    } catch (e) {
      setError(e.message || 'Failed to load data from backend.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBootstrap();
  }, [loadBootstrap]);

  const addResource = async (payload) => {
    const created = await api.createResource(payload);
    setResources((prev) => [...prev, created]);
    return created;
  };

  const updateResource = async (id, changes) => {
    const updated = await api.updateResource(id, changes);
    setResources((prev) => prev.map((r) => (r.id === id ? updated : r)));
    return updated;
  };

  const deleteResource = async (id) => {
    await api.deleteResource(id);
    setResources((prev) => prev.filter((r) => r.id !== id));
  };

  const assignResource = async (id, assignedTo) => {
    const updated = await api.assignResource(id, assignedTo);
    setResources((prev) => prev.map((r) => (r.id === id ? updated : r)));
    return updated;
  };

  const unassignResource = async (id) => {
    const updated = await api.unassignResource(id);
    setResources((prev) => prev.map((r) => (r.id === id ? updated : r)));
    return updated;
  };

  const addDisaster = async (payload) => {
    const created = await api.createDisaster(payload);
    setDisasters((prev) => [...prev, created]);
    return created;
  };

  const updateDisaster = async (id, changes) => {
    const updated = await api.updateDisaster(id, changes);
    setDisasters((prev) => prev.map((d) => (d.id === id ? updated : d)));
    return updated;
  };

  const deleteDisaster = async (id) => {
    await api.deleteDisaster(id);
    setDisasters((prev) => prev.filter((d) => d.id !== id));
  };

  const createAllocation = async (payload) => {
    const result = await api.createAllocation(payload);
    setAllocations((prev) => [result.allocation, ...prev]);
    setResources((prev) => prev.map((r) => (r.id === result.resource.id ? result.resource : r)));
    return result.allocation;
  };

  const addOtsTask = async (payload) => {
    const created = await api.createOtsTask(payload);
    setOtsTasks((prev) => [created, ...prev]);
    return created;
  };

  const updateOtsTask = async (id, payload) => {
    const updated = await api.updateOtsTask(id, payload);
    setOtsTasks((prev) => prev.map((task) => (task.id === id ? updated : task)));
    return updated;
  };

  const deleteOtsTask = async (id) => {
    await api.deleteOtsTask(id);
    setOtsTasks((prev) => prev.filter((task) => task.id !== id));
  };

  const addHazardZone = async (payload) => {
    const created = await api.createHazardZone(payload);
    setHazardZones((prev) => [created, ...prev]);
    return created;
  };

  const updateHazardZone = async (id, payload) => {
    const updated = await api.updateHazardZone(id, payload);
    setHazardZones((prev) => prev.map((zone) => (zone.id === id ? updated : zone)));
    return updated;
  };

  const deleteHazardZone = async (id) => {
    await api.deleteHazardZone(id);
    setHazardZones((prev) => prev.filter((zone) => zone.id !== id));
  };

  return (
    <Store.Provider
      value={{
        resources,
        disasters,
        allocations,
        otsTasks,
        hazardZones,
        loading,
        error,
        reload: loadBootstrap,
        addResource,
        updateResource,
        deleteResource,
        assignResource,
        unassignResource,
        addDisaster,
        updateDisaster,
        deleteDisaster,
        createAllocation,
        addOtsTask,
        updateOtsTask,
        deleteOtsTask,
        addHazardZone,
        updateHazardZone,
        deleteHazardZone,
      }}
    >
      {children}
    </Store.Provider>
  );
}

export const useStore = () => useContext(Store);
