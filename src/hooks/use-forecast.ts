import { useCallback, useEffect, useRef, useState } from 'react';
import type { Place } from '@/lib/harvest';
import { fetchForecast, isStale, sameSpot, type ApiConfig, type Forecast } from '@/lib/weather';

export const FORECAST_CACHE_KEY = 'climora:forecast:v1';

export const apiConfig: ApiConfig = {
  host: import.meta.env.VITE_OPEN_METEO_HOST,
  geocodingHost: import.meta.env.VITE_OPEN_METEO_GEOCODING_HOST,
  archiveHost: import.meta.env.VITE_OPEN_METEO_ARCHIVE_HOST,
  apiKey: import.meta.env.VITE_OPEN_METEO_API_KEY,
};

export type ForecastStatus = 'idle' | 'loading' | 'ok' | 'error';

function readCache(place: Place): Forecast | null {
  try {
    const raw = localStorage.getItem(FORECAST_CACHE_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw) as Forecast;
    return Array.isArray(cached.hours) && Array.isArray(cached.days) && sameSpot(cached, place) ? cached : null;
  } catch {
    return null;
  }
}

/**
 * Real forecast for the farm. Shows the last saved forecast right away (useful
 * with weak signal in the field) and refreshes it when it is older than a few
 * hours, when the app regains focus and when the connection comes back.
 */
export function useForecast(place: Place | null) {
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [status, setStatus] = useState<ForecastStatus>('idle');
  const [error, setError] = useState('');
  const inflight = useRef(false);
  const latest = useRef<Forecast | null>(null);
  latest.current = forecast;

  const refresh = useCallback(async (force = false) => {
    if (!place || inflight.current) return;
    const current = latest.current;
    if (!force && current && sameSpot(current, place) && !isStale(current)) return;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setStatus(current ? 'ok' : 'error');
      setError('Sem conexão. Mostrando a última previsão salva.');
      return;
    }
    inflight.current = true;
    setStatus('loading');
    try {
      const next = await fetchForecast(place, apiConfig);
      setForecast(next);
      setError('');
      setStatus('ok');
      try { localStorage.setItem(FORECAST_CACHE_KEY, JSON.stringify(next)); } catch { /* cache is optional */ }
    } catch {
      setStatus('error');
      setError(current ? 'Não foi possível atualizar. Mostrando a última previsão salva.' : 'Não foi possível buscar a previsão agora. Tente de novo em instantes.');
    } finally {
      inflight.current = false;
    }
  }, [place]);

  useEffect(() => {
    if (!place) { setForecast(null); setStatus('idle'); return; }
    const cached = readCache(place);
    latest.current = cached;
    setForecast(cached);
    if (cached) setStatus('ok');
    void refresh();
  }, [place, refresh]);

  useEffect(() => {
    const onWake = () => { if (document.visibilityState === 'visible') void refresh(); };
    window.addEventListener('online', onWake);
    document.addEventListener('visibilitychange', onWake);
    return () => { window.removeEventListener('online', onWake); document.removeEventListener('visibilitychange', onWake); };
  }, [refresh]);

  return { forecast, status, error, refresh: () => refresh(true) };
}
