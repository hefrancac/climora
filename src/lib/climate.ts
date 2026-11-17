// Local climate profile ("normal" year) built from 10 years of daily history
// (Open-Meteo Historical Weather API, ERA5 reanalysis). Each array has 365
// entries, one per day of the year (29 Feb is folded into 28 Feb).
import type { Place } from './harvest';
import type { ApiConfig } from './weather';

export const CLIMATE_YEARS = 10;
/** Air temperature (2 m) at or below which frost on plants becomes likely. */
export const FROST_AIR_TEMP = 3;

export type Climate = {
  latitude: number;
  longitude: number;
  years: readonly [number, number];
  fetchedAt: string;
  tmean: number[];
  tmin: number[];
  tmax: number[];
  /** mm/day */
  rain: number[];
  /** Reference evapotranspiration, mm/day */
  et0: number[];
  /** Chance (0–1) of at least one frost within ±7 days, in a given year. */
  frost: number[];
};

// ---------- Day of year without leap days ----------

function isLeap(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/** 0 = 1 Jan … 364 = 31 Dec; 29 Feb counts as 28 Feb. */
export function doyOf(date: string): number {
  const [y = 0, m = 1, d = 1] = date.split('-').map(Number);
  const raw = Math.round((Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 1)) / 86_400_000);
  if (isLeap(y) && raw >= 59) return raw - 1;
  return raw;
}

export function dateOfDoy(year: number, doy: number): string {
  const offset = isLeap(year) && doy >= 59 ? doy + 1 : doy;
  return new Date(Date.UTC(year, 0, 1 + offset)).toISOString().slice(0, 10);
}

/** The next calendar date, from `today` on, that falls on this day of the year. */
export function nextDateOf(doy: number, today: string): string {
  const year = Number(today.slice(0, 4));
  const candidate = dateOfDoy(year, doy);
  return candidate >= today ? candidate : dateOfDoy(year + 1, doy);
}

export const wrap = (doy: number): number => ((doy % 365) + 365) % 365;

// ---------- Building the profile ----------

export function climateUrl(latitude: number, longitude: number, fromYear: number, toYear: number, config: ApiConfig = {}): string {
  const host = config.archiveHost || 'https://archive-api.open-meteo.com';
  const params = new URLSearchParams({
    latitude: latitude.toFixed(4),
    longitude: longitude.toFixed(4),
    start_date: `${fromYear}-01-01`,
    end_date: `${toYear}-12-31`,
    daily: 'temperature_2m_mean,temperature_2m_min,temperature_2m_max,precipitation_sum,et0_fao_evapotranspiration',
    timezone: 'auto',
  });
  if (config.apiKey) params.set('apikey', config.apiKey);
  return `${host}/v1/archive?${params}`;
}

function smooth(values: number[], radius: number): number[] {
  return values.map((_, i) => {
    let sum = 0;
    for (let k = -radius; k <= radius; k++) sum += values[wrap(i + k)] ?? 0;
    return sum / (2 * radius + 1);
  });
}

type Daily = { date: string; tmean: number | null; tmin: number | null; tmax: number | null; rain: number | null; et0: number | null };

export function climateFromDaily(rows: Daily[], meta: { latitude: number; longitude: number; fetchedAt: string }): Climate {
  const sums = { tmean: new Array(365).fill(0), tmin: new Array(365).fill(0), tmax: new Array(365).fill(0), rain: new Array(365).fill(0), et0: new Array(365).fill(0) };
  const counts = { tmean: new Array(365).fill(0), tmin: new Array(365).fill(0), tmax: new Array(365).fill(0), rain: new Array(365).fill(0), et0: new Array(365).fill(0) };
  const coldDays = new Map<number, Set<number>>(); // year -> days of year with frost-level minimum
  const years = new Set<number>();
  for (const row of rows) {
    const doy = doyOf(row.date);
    const year = Number(row.date.slice(0, 4));
    years.add(year);
    for (const key of ['tmean', 'tmin', 'tmax', 'rain', 'et0'] as const) {
      const value = row[key];
      if (value === null) continue;
      sums[key][doy] += value;
      counts[key][doy] += 1;
    }
    if (row.tmin !== null && row.tmin <= FROST_AIR_TEMP) {
      if (!coldDays.has(year)) coldDays.set(year, new Set());
      coldDays.get(year)!.add(doy);
    }
  }
  const mean = (key: keyof typeof sums) => {
    const raw = sums[key].map((s, i) => (counts[key][i] ? s / counts[key][i] : NaN));
    // Fill rare gaps with the neighbour average before smoothing.
    const filled = raw.map((v, i) => (Number.isFinite(v) ? v : (raw[wrap(i - 1)] ?? 0) + (raw[wrap(i + 1)] ?? 0)) / (Number.isFinite(v) ? 1 : 2));
    if (filled.some(v => !Number.isFinite(v))) throw new Error('Histórico climático incompleto');
    return filled;
  };
  const yearList = [...years].sort((a, b) => a - b);
  if (yearList.length < 3) throw new Error('Histórico climático curto demais');
  const frost = new Array(365).fill(0).map((_, doy) => {
    let hit = 0;
    for (const y of yearList) {
      const days = coldDays.get(y);
      if (!days) continue;
      for (let k = -7; k <= 7; k++) if (days.has(wrap(doy + k))) { hit++; break; }
    }
    return hit / yearList.length;
  });
  return {
    latitude: meta.latitude,
    longitude: meta.longitude,
    years: [yearList[0]!, yearList.at(-1)!],
    fetchedAt: meta.fetchedAt,
    tmean: smooth(mean('tmean'), 7),
    tmin: smooth(mean('tmin'), 7),
    tmax: smooth(mean('tmax'), 7),
    rain: smooth(mean('rain'), 15),
    et0: smooth(mean('et0'), 7),
    frost,
  };
}

function column(daily: Record<string, unknown>, key: string, length: number): (number | null)[] {
  const values = daily[key];
  if (!Array.isArray(values) || values.length !== length) throw new Error(`Resposta sem ${key}`);
  return values.map(v => (typeof v === 'number' && Number.isFinite(v) ? v : null));
}

export function parseClimate(json: unknown, fetchedAt: string): Climate {
  const root = (json && typeof json === 'object' ? json : {}) as Record<string, unknown>;
  const daily = root['daily'];
  if (!daily || typeof daily !== 'object') throw new Error('Resposta sem histórico diário');
  const d = daily as Record<string, unknown>;
  const time = d['time'];
  if (!Array.isArray(time)) throw new Error('Resposta sem datas');
  const n = time.length;
  const tmean = column(d, 'temperature_2m_mean', n), tmin = column(d, 'temperature_2m_min', n), tmax = column(d, 'temperature_2m_max', n);
  const rain = column(d, 'precipitation_sum', n), et0 = column(d, 'et0_fao_evapotranspiration', n);
  const rows: Daily[] = time.map((t, i) => {
    if (typeof t !== 'string') throw new Error('Data inválida');
    return { date: t, tmean: tmean[i] ?? null, tmin: tmin[i] ?? null, tmax: tmax[i] ?? null, rain: rain[i] ?? null, et0: et0[i] ?? null };
  });
  return climateFromDaily(rows, {
    latitude: typeof root['latitude'] === 'number' ? root['latitude'] : 0,
    longitude: typeof root['longitude'] === 'number' ? root['longitude'] : 0,
    fetchedAt,
  });
}

type FetchLike = (url: string) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;

export async function fetchClimate(place: Pick<Place, 'latitude' | 'longitude'>, config: ApiConfig = {}, fetchFn: FetchLike = fetch, now: Date = new Date()): Promise<Climate> {
  const lastYear = now.getFullYear() - 1;
  const response = await fetchFn(climateUrl(place.latitude, place.longitude, lastYear - CLIMATE_YEARS + 1, lastYear, config));
  if (!response.ok) throw new Error(`Serviço de clima respondeu ${response.status}`);
  return parseClimate(await response.json(), now.toISOString());
}

export function climateMatches(climate: Climate, place: Pick<Place, 'latitude' | 'longitude'>): boolean {
  return Math.abs(climate.latitude - place.latitude) < 0.1 && Math.abs(climate.longitude - place.longitude) < 0.1;
}

/** Monthly summary for display: mean temperature and total rain per month. */
export function monthlySummary(climate: Climate): { month: number; tmean: number; tmin: number; rain: number; frost: number }[] {
  const out: { month: number; tmean: number; tmin: number; rain: number; frost: number }[] = [];
  for (let m = 0; m < 12; m++) {
    const from = doyOf(`2025-${String(m + 1).padStart(2, '0')}-01`);
    const to = m === 11 ? 365 : doyOf(`2025-${String(m + 2).padStart(2, '0')}-01`);
    let t = 0, tn = 0, r = 0, f = 0;
    for (let d = from; d < to; d++) { t += climate.tmean[d] ?? 0; tn += climate.tmin[d] ?? 0; r += climate.rain[d] ?? 0; f = Math.max(f, climate.frost[d] ?? 0); }
    const n = to - from;
    out.push({ month: m, tmean: t / n, tmin: tn / n, rain: r, frost: f });
  }
  return out;
}
