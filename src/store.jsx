import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from './api';

const Store = createContext(null);

function isQueuedMutation(result) {
  return Boolean(result?.queued && result?.offline);
}

export function StoreProvider({ children }) {
  const [resources, setResources] = useState([]);
  const [disasters, setDisasters] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [otsTasks, setOtsTasks] = useState([]);
  const [hazardZones, setHazardZones] = useState([]);
  const [volunteers, setVolunteers] = useState([]);
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
      setVolunteers(data.volunteers || []);
    } catch (e) {
      setError(e.message || 'Failed to load data from backend.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBootstrap();
  }, [loadBootstrap]);

  useEffect(() => {
    const refreshAfterReplay = (event) => {
      if (event.detail?.replayed > 0) {
        loadBootstrap();
      }
    };

    window.addEventListener('drams:queue-replayed', refreshAfterReplay);
    return () => {
      window.removeEventListener('drams:queue-replayed', refreshAfterReplay);
    };
  }, [loadBootstrap]);

  const addResource = async (payload) => {
    const created = await api.createResource(payload);
    if (isQueuedMutation(created)) return created;
    setResources((prev) => [...prev, created]);
    return created;
  };

  const updateResource = async (id, changes) => {
    const updated = await api.updateResource(id, changes);
    if (isQueuedMutation(updated)) return updated;
    setResources((prev) => prev.map((r) => (r.id === id ? updated : r)));
    return updated;
  };

  const deleteResource = async (id) => {
    const result = await api.deleteResource(id);
    if (isQueuedMutation(result)) return result;
    setResources((prev) => prev.filter((r) => r.id !== id));
    return result;
  };

  const assignResource = async (id, assignedTo) => {
    const updated = await api.assignResource(id, assignedTo);
    if (isQueuedMutation(updated)) return updated;
    setResources((prev) => prev.map((r) => (r.id === id ? updated : r)));
    return updated;
  };

  const unassignResource = async (id) => {
    const updated = await api.unassignResource(id);
    if (isQueuedMutation(updated)) return updated;
    setResources((prev) => prev.map((r) => (r.id === id ? updated : r)));
    return updated;
  };

  const addDisaster = async (payload) => {
    const created = await api.createDisaster(payload);
    if (isQueuedMutation(created)) return created;
    setDisasters((prev) => [...prev, created]);
    return created;
  };

  const updateDisaster = async (id, changes) => {
    const updated = await api.updateDisaster(id, changes);
    if (isQueuedMutation(updated)) return updated;
    setDisasters((prev) => prev.map((d) => (d.id === id ? updated : d)));
    return updated;
  };

  const deleteDisaster = async (id) => {
    const result = await api.deleteDisaster(id);
    if (isQueuedMutation(result)) return result;
    setDisasters((prev) => prev.filter((d) => d.id !== id));
    return result;
  };

  const createAllocation = async (payload) => {
    const result = await api.createAllocation(payload);
    if (isQueuedMutation(result)) return result;
    setAllocations((prev) => [result.allocation, ...prev]);
    setResources((prev) => prev.map((r) => (r.id === result.resource.id ? result.resource : r)));
    return result.allocation;
  };

  const addOtsTask = async (payload) => {
    const created = await api.createOtsTask(payload);
    if (isQueuedMutation(created)) return created;
    setOtsTasks((prev) => [created, ...prev]);
    return created;
  };

  const updateOtsTask = async (id, payload) => {
    const updated = await api.updateOtsTask(id, payload);
    if (isQueuedMutation(updated)) return updated;
    setOtsTasks((prev) => prev.map((task) => (task.id === id ? updated : task)));
    return updated;
  };

  const deleteOtsTask = async (id) => {
    const result = await api.deleteOtsTask(id);
    if (isQueuedMutation(result)) return result;
    setOtsTasks((prev) => prev.filter((task) => task.id !== id));
    return result;
  };

  const addHazardZone = async (payload) => {
    const created = await api.createHazardZone(payload);
    if (isQueuedMutation(created)) return created;
    setHazardZones((prev) => [created, ...prev]);
    return created;
  };

  const updateHazardZone = async (id, payload) => {
    const updated = await api.updateHazardZone(id, payload);
    if (isQueuedMutation(updated)) return updated;
    setHazardZones((prev) => prev.map((zone) => (zone.id === id ? updated : zone)));
    return updated;
  };

  const deleteHazardZone = async (id) => {
    const result = await api.deleteHazardZone(id);
    if (isQueuedMutation(result)) return result;
    setHazardZones((prev) => prev.filter((zone) => zone.id !== id));
    return result;
  };

  const addVolunteer = async (payload) => {
    const created = await api.createVolunteer(payload);
    if (isQueuedMutation(created)) return created;
    setVolunteers((prev) => [created, ...prev]);
    return created;
  };

  const updateVolunteer = async (id, payload) => {
    const updated = await api.updateVolunteer(id, payload);
    if (isQueuedMutation(updated)) return updated;
    setVolunteers((prev) => prev.map((volunteer) => (volunteer.id === id ? updated : volunteer)));
    return updated;
  };

  const deleteVolunteer = async (id) => {
    const result = await api.deleteVolunteer(id);
    if (isQueuedMutation(result)) return result;
    setVolunteers((prev) => prev.filter((volunteer) => volunteer.id !== id));
    return result;
  };

  return (
    <Store.Provider
      value={{
        resources,
        disasters,
        allocations,
        otsTasks,
        hazardZones,
        volunteers,
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
        addVolunteer,
        updateVolunteer,
        deleteVolunteer,
      }}
    >
      {children}
    </Store.Provider>
  );
}

export const useStore = () => useContext(Store);
