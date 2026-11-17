// Real forecast from Open-Meteo plus the pure rules that turn it into decisions.
// Times come back in the location's own timezone (timezone=auto) as
// `YYYY-MM-DDTHH:mm`, so plans and forecast hours compare as plain strings —
// no timezone conversion anywhere.
import { addDays, daysBetween, minutes, timeFromMinutes } from './dates';
import type { Place, Plan } from './harvest';

export const FORECAST_DAYS = 16;
/** A forecast older than this is refreshed automatically when the app is open. */
export const STALE_AFTER_MS = 3 * 60 * 60 * 1000;
/** Earliest hour suggested for harvesting. */
export const EARLIEST_HARVEST = 5 * 60;

export type HourPoint = { time: string; chance: number | null; mm: number | null };
export type DayPoint = { date: string; chance: number | null; mm: number | null; tMax: number | null; tMin: number | null; code: number | null };
export type Forecast = { latitude: number; longitude: number; timezone: string; fetchedAt: string; hours: HourPoint[]; days: DayPoint[] };

export type ApiConfig = { host?: string | undefined; geocodingHost?: string | undefined; archiveHost?: string | undefined; apiKey?: string | undefined };

// ---------- URLs and parsing ----------

export function forecastUrl(latitude: number, longitude: number, config: ApiConfig = {}): string {
  const host = config.host || 'https://api.open-meteo.com';
  const params = new URLSearchParams({
    latitude: latitude.toFixed(4),
    longitude: longitude.toFixed(4),
    hourly: 'precipitation_probability,precipitation',
    daily: 'precipitation_probability_max,precipitation_sum,temperature_2m_max,temperature_2m_min,weather_code',
    timezone: 'auto',
    forecast_days: String(FORECAST_DAYS),
  });
  if (config.apiKey) params.set('apikey', config.apiKey);
  return `${host}/v1/forecast?${params}`;
}

/** Searches Brazilian places only: every municipality (and many districts) by name, accents optional. */
export function geocodeUrl(query: string, config: ApiConfig = {}): string {
  const host = config.geocodingHost || 'https://geocoding-api.open-meteo.com';
  const params = new URLSearchParams({ name: query.trim(), count: '10', language: 'pt', format: 'json', countryCode: 'BR' });
  if (config.apiKey) params.set('apikey', config.apiKey);
  return `${host}/v1/search?${params}`;
}

function numberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function arrayOf(source: unknown, key: string): unknown[] {
  const value = source && typeof source === 'object' ? (source as Record<string, unknown>)[key] : undefined;
  if (!Array.isArray(value)) throw new Error(`Resposta sem ${key}`);
  return value;
}

export function parseForecast(json: unknown, fetchedAt: string): Forecast {
  if (!json || typeof json !== 'object') throw new Error('Resposta inválida');
  const root = json as Record<string, unknown>;
  const hourly = root['hourly'], daily = root['daily'];
  const times = arrayOf(hourly, 'time'), chance = arrayOf(hourly, 'precipitation_probability'), rain = arrayOf(hourly, 'precipitation');
  const hours: HourPoint[] = times.map((t, i) => {
    if (typeof t !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(t)) throw new Error('Hora inválida');
    return { time: t, chance: numberOrNull(chance[i]), mm: numberOrNull(rain[i]) };
  });
  const dTimes = arrayOf(daily, 'time');
  const dChance = arrayOf(daily, 'precipitation_probability_max'), dRain = arrayOf(daily, 'precipitation_sum');
  const dMax = arrayOf(daily, 'temperature_2m_max'), dMin = arrayOf(daily, 'temperature_2m_min'), dCode = arrayOf(daily, 'weather_code');
  const days: DayPoint[] = dTimes.map((d, i) => {
    if (typeof d !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(d)) throw new Error('Dia inválido');
    return { date: d, chance: numberOrNull(dChance[i]), mm: numberOrNull(dRain[i]), tMax: numberOrNull(dMax[i]), tMin: numberOrNull(dMin[i]), code: numberOrNull(dCode[i]) };
  });
  return {
    latitude: numberOrNull(root['latitude']) ?? 0,
    longitude: numberOrNull(root['longitude']) ?? 0,
    timezone: typeof root['timezone'] === 'string' ? root['timezone'] : '',
    fetchedAt,
    hours,
    days,
  };
}

export function parsePlaces(json: unknown): Place[] {
  const results = json && typeof json === 'object' ? (json as Record<string, unknown>)['results'] : undefined;
  if (!Array.isArray(results)) return [];
  const places: Place[] = [];
  for (const r of results) {
    if (!r || typeof r !== 'object') continue;
    const item = r as Record<string, unknown>;
    const name = item['name'], lat = item['latitude'], lon = item['longitude'];
    if (typeof name !== 'string' || typeof lat !== 'number' || typeof lon !== 'number') continue;
    // A district shows its municipality first: "Barão Geraldo" → "Campinas, São Paulo".
    const admin2 = typeof item['admin2'] === 'string' && item['admin2'] !== name ? item['admin2'] : undefined;
    const region = [admin2, item['admin1'], item['country_code'] === 'BR' ? undefined : item['country']]
      .filter((x): x is string => typeof x === 'string' && x.length > 0)
      .join(', ');
    if (places.some(p => p.name === name && p.region === region)) continue;
    places.push({ name, region, latitude: lat, longitude: lon });
  }
  return places;
}

type FetchLike = (url: string) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;

export async function fetchForecast(place: Pick<Place, 'latitude' | 'longitude'>, config: ApiConfig = {}, fetchFn: FetchLike = fetch, now: Date = new Date()): Promise<Forecast> {
  const response = await fetchFn(forecastUrl(place.latitude, place.longitude, config));
  if (!response.ok) throw new Error(`Serviço de previsão respondeu ${response.status}`);
  return parseForecast(await response.json(), now.toISOString());
}

export async function searchPlaces(query: string, config: ApiConfig = {}, fetchFn: FetchLike = fetch): Promise<Place[]> {
  if (query.trim().length < 2) return [];
  const response = await fetchFn(geocodeUrl(query, config));
  if (!response.ok) throw new Error(`Busca de cidades respondeu ${response.status}`);
  return parsePlaces(await response.json());
}

export function isStale(forecast: Forecast, now: Date = new Date()): boolean {
  return now.getTime() - Date.parse(forecast.fetchedAt) > STALE_AFTER_MS;
}

export function sameSpot(forecast: Forecast, place: Pick<Place, 'latitude' | 'longitude'>): boolean {
  // Open-Meteo snaps to its grid, so compare with a tolerance of ~5 km.
  return Math.abs(forecast.latitude - place.latitude) < 0.05 && Math.abs(forecast.longitude - place.longitude) < 0.05;
}

// ---------- Rules ----------

export type WindowRisk =
  | { covered: false; reason: 'passado' | 'distante' | 'sem-dados'; availableFrom?: string }
  | { covered: true; maxChance: number; totalMm: number; hours: HourPoint[] };

/** Hourly slots [h, h+1) that strictly overlap the window [start, end). */
export function windowRisk(forecast: Forecast, date: string, start: string, end: string): WindowRisk {
  const s = minutes(start), e = minutes(end);
  const first = forecast.days[0]?.date, last = forecast.days.at(-1)?.date;
  if (!first || !last || !Number.isFinite(s) || !Number.isFinite(e) || s >= e) return { covered: false, reason: 'sem-dados' };
  if (date < first) return { covered: false, reason: 'passado' };
  if (date > last) return { covered: false, reason: 'distante', availableFrom: addDays(date, -(FORECAST_DAYS - 1)) };
  const hours = forecast.hours.filter(h => {
    if (h.time.slice(0, 10) !== date) return false;
    const slot = minutes(h.time.slice(11, 16));
    return slot < e && slot + 60 > s;
  });
  const expected = Math.floor((e - 1) / 60) - Math.floor(s / 60) + 1;
  if (hours.length !== expected || hours.some(h => h.chance === null)) return { covered: false, reason: 'sem-dados' };
  const maxChance = Math.max(...hours.map(h => h.chance ?? 0));
  const totalMm = Math.round(hours.reduce((sum, h) => sum + (h.mm ?? 0), 0) * 10) / 10;
  return { covered: true, maxChance, totalMm, hours };
}

export type Suggestion = { start: string; end: string; maxChance: number; totalMm: number };

/**
 * Looks for a drier harvest window of the same length on the same day that still
 * leaves the same preparation time before delivery (so only earlier slots qualify).
 * Returns null when nothing is clearly better than the current window.
 */
export function suggestWindow(forecast: Forecast, plan: Pick<Plan, 'date' | 'start' | 'end' | 'delivery'>, threshold: number): Suggestion | null {
  const current = windowRisk(forecast, plan.date, plan.start, plan.end);
  if (!current.covered) return null;
  const s = minutes(plan.start), e = minutes(plan.end);
  const length = e - s;
  let best: Suggestion | null = null;
  for (let start = EARLIEST_HARVEST; start + length <= e; start += 30) {
    if (start === s) continue;
    const risk = windowRisk(forecast, plan.date, timeFromMinutes(start), timeFromMinutes(start + length));
    if (!risk.covered) continue;
    const candidate = { start: timeFromMinutes(start), end: timeFromMinutes(start + length), maxChance: risk.maxChance, totalMm: risk.totalMm };
    // Prefer lower chance, then less rain, then the latest start (least disruption).
    if (!best || candidate.maxChance < best.maxChance || (candidate.maxChance === best.maxChance && candidate.totalMm <= best.totalMm)) best = candidate;
  }
  if (!best) return null;
  if (best.maxChance >= threshold || best.maxChance > current.maxChance - 15) return null;
  return best;
}

export type Assessment =
  | { kind: 'sem-previsao'; reason: 'sem-local' | 'carregando' | 'passado' | 'distante' | 'sem-dados'; availableFrom?: string }
  | { kind: 'ok'; risk: Extract<WindowRisk, { covered: true }> }
  | { kind: 'alerta'; risk: Extract<WindowRisk, { covered: true }>; kept: boolean; rose: boolean; suggestion: Suggestion | null };

export function assessPlan(forecast: Forecast | null, plan: Plan, threshold: number): Assessment {
  if (!forecast) return { kind: 'sem-previsao', reason: 'carregando' };
  const risk = windowRisk(forecast, plan.date, plan.start, plan.end);
  if (!risk.covered) return risk.availableFrom ? { kind: 'sem-previsao', reason: risk.reason, availableFrom: risk.availableFrom } : { kind: 'sem-previsao', reason: risk.reason };
  if (risk.maxChance < threshold) return { kind: 'ok', risk };
  const acked = plan.ackedChance;
  const kept = acked !== undefined && risk.maxChance <= acked;
  const rose = acked !== undefined && risk.maxChance > acked;
  return { kind: 'alerta', risk, kept, rose, suggestion: suggestWindow(forecast, plan, threshold) };
}

/** Hours to draw around a plan: from 2h before harvest up to the delivery hour. */
export function contextHours(forecast: Forecast, plan: Pick<Plan, 'date' | 'start' | 'delivery'>): HourPoint[] {
  const from = Math.max(0, Math.floor(minutes(plan.start) / 60) - 2);
  const to = Math.min(23, Math.floor(minutes(plan.delivery) / 60));
  return forecast.hours.filter(h => {
    if (h.time.slice(0, 10) !== plan.date) return false;
    const hour = Number(h.time.slice(11, 13));
    return hour >= from && hour <= to;
  });
}

export function upcomingDays(forecast: Forecast, today: string, count = 7): DayPoint[] {
  return forecast.days.filter(d => d.date >= today).slice(0, count);
}

/** Short Portuguese label for WMO weather codes. */
export function weatherLabel(code: number | null): string {
  if (code === null) return '—';
  if (code === 0) return 'Céu limpo';
  if (code <= 2) return 'Poucas nuvens';
  if (code === 3) return 'Nublado';
  if (code <= 48) return 'Neblina';
  if (code <= 57) return 'Garoa';
  if (code <= 67) return 'Chuva';
  if (code <= 77) return 'Neve';
  if (code <= 82) return 'Pancadas';
  return 'Trovoadas';
}

export function ageLabel(fetchedAt: string, now: Date = new Date()): string {
  const mins = Math.max(0, Math.round((now.getTime() - Date.parse(fetchedAt)) / 60000));
  if (mins < 1) return 'agora';
  if (mins < 60) return `há ${mins} min`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = daysBetween(fetchedAt.slice(0, 10), now.toISOString().slice(0, 10));
  return `há ${days} dia${days === 1 ? '' : 's'}`;
}
