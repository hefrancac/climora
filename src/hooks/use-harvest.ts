import { useEffect, useState } from 'react';
import { initialState, LEGACY_STORAGE_KEY, loadStored, STORAGE_KEY, type AppState } from '@/lib/harvest';

/**
 * Agenda state persisted in this browser. Loads only after mount (SSR-safe),
 * migrates the first demo format once, and never overwrites unreadable data:
 * if storage fails, the session keeps working in memory with a warning.
 */
export function useHarvest() {
  const [state, setState] = useState<AppState>(initialState);
  const [ready, setReady] = useState(false);
  const [storageWarning, setStorageWarning] = useState(false);
  const [memoryOnly, setMemoryOnly] = useState(false);

  useEffect(() => {
    try {
      const stored = loadStored(localStorage.getItem(STORAGE_KEY), localStorage.getItem(LEGACY_STORAGE_KEY));
      if (stored) setState(stored);
    } catch {
      setStorageWarning(true);
      setMemoryOnly(true);
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready || memoryOnly) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      setStorageWarning(true);
      setMemoryOnly(true);
    }
  }, [state, ready, memoryOnly]);

  /** Replaces everything (used by "apagar tudo" and by backup import). */
  function replace(next: AppState) {
    setState(next);
    setMemoryOnly(false);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      localStorage.removeItem(LEGACY_STORAGE_KEY);
      setStorageWarning(false);
    } catch {
      setStorageWarning(true);
      setMemoryOnly(true);
    }
  }

  function reset() {
    replace(initialState());
  }

  return { state, setState, ready, storageWarning, reset, replace };
}
