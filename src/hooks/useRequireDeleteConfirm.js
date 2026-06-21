import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';

export default function useRequireDeleteConfirm() {
  const [requireDeleteConfirm, setRequireDeleteConfirm] = useState(true);

  const loadDeletePreference = useCallback(async () => {
    try {
      const settings = await api.getSettings();
      setRequireDeleteConfirm(settings?.operations?.requireDeleteConfirm !== false);
    } catch {
      setRequireDeleteConfirm(true);
    }
  }, []);

  useEffect(() => {
    loadDeletePreference();
  }, [loadDeletePreference]);

  useEffect(() => {
    window.addEventListener('drams:settings-updated', loadDeletePreference);
    return () => {
      window.removeEventListener('drams:settings-updated', loadDeletePreference);
    };
  }, [loadDeletePreference]);

  return requireDeleteConfirm;
}
