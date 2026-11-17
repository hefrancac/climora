import { useCallback, useEffect, useState } from 'react';
import type { Place } from '@/lib/harvest';
import { climateMatches, fetchClimate, type Climate } from '@/lib/climate';
import { apiConfig } from '@/hooks/use-forecast';

export const CLIMATE_CACHE_KEY = 'climora:climate:v1';
/** The climate profile changes slowly: refresh once a year is plenty. */
const MAX_AGE_MS = 180 * 24 * 60 * 60 * 1000;

export type ClimateStatus = 'idle' | 'loading' | 'ok' | 'error';

function readCache(place: Place): Climate | null {
  try {
    const raw = localStorage.getItem(CLIMATE_CACHE_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw) as Climate;
    if (!Array.isArray(cached.tmean) || cached.tmean.length !== 365 || !climateMatches(cached, place)) return null;
    if (Date.now() - Date.parse(cached.fetchedAt) > MAX_AGE_MS) return null;
    return cached;
  } catch {
    return null;
  }
}

/** Ten-year climate profile of the farm, cached on the device. */
export function useClimate(place: Place | null) {
  const [climate, setClimate] = useState<Climate | null>(null);
  const [status, setStatus] = useState<ClimateStatus>('idle');

  const load = useCallback(async (target: Place) => {
    setStatus('loading');
    try {
      const next = await fetchClimate(target, apiConfig);
      // The API snaps to its grid; keep the farm's own coordinates for cache matching.
      const stored = { ...next, latitude: target.latitude, longitude: target.longitude };
      setClimate(stored);
      setStatus('ok');
      try { localStorage.setItem(CLIMATE_CACHE_KEY, JSON.stringify(stored)); } catch { /* optional */ }
    } catch {
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    if (!place) { setClimate(null); setStatus('idle'); return; }
    const cached = readCache(place);
    if (cached) { setClimate(cached); setStatus('ok'); return; }
    setClimate(null);
    void load(place);
  }, [place, load]);

  return { climate, status, retry: () => { if (place) void load(place); } };
}
