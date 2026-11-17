import { describe, expect, it } from 'vitest';
import { makeForecast } from '@/test/forecast-fixture';
import { savePlan, initialState, keepPlan, type Plan, type PlanFields } from './harvest';
import {
  ageLabel, assessPlan, contextHours, fetchForecast, forecastUrl, geocodeUrl, isStale, parseForecast, parsePlaces,
  sameSpot, searchPlaces, suggestWindow, upcomingDays, weatherLabel, windowRisk,
} from './weather';

const FIRST = '2026-12-01';
// Dry mornings, a storm on 04/12 from 13h to 15h.
const forecast = makeForecast(FIRST, 16, (date, h) => (date === '2026-12-04' && h >= 13 && h < 15 ? 80 : h < 12 ? 10 : 25), (date, h) => (date === '2026-12-04' && h >= 13 && h < 15 ? 4.2 : 0));
const fields: PlanFields = { crop: 'Alface', sale: 'Feira', customer: '', quantity: '', date: '2026-12-04', start: '13:00', end: '14:00', delivery: '16:00', notes: '' };
function plan(changes: Partial<PlanFields> = {}): Plan {
  const p = savePlan(initialState(), { ...fields, ...changes }, 'p').plans[0];
  if (!p) throw new Error('no plan');
  return p;
}

describe('Janela de colheita', () => {
  it('takes the worst hour and sums the rain of overlapping slots', () => {
    expect(windowRisk(forecast, '2026-12-04', '12:30', '14:10')).toMatchObject({ covered: true, maxChance: 80, totalMm: 8.4 });
    expect(windowRisk(forecast, '2026-12-04', '12:00', '13:00')).toMatchObject({ covered: true, maxChance: 25 });
    expect(windowRisk(forecast, '2026-12-04', '15:00', '16:00')).toMatchObject({ covered: true, maxChance: 25 });
  });
  it.each([['12:59', '13:01', 80], ['14:59', '15:01', 80], ['08:00', '18:00', 80], ['09:00', '10:00', 10]])('handles strict overlap %s–%s', (start, end, max) => {
    expect(windowRisk(forecast, '2026-12-04', start, end)).toMatchObject({ covered: true, maxChance: max });
  });
  it('never invents a zero for days outside the forecast', () => {
    expect(windowRisk(forecast, '2026-11-30', '09:00', '10:00')).toEqual({ covered: false, reason: 'passado' });
    expect(windowRisk(forecast, '2026-12-20', '09:00', '10:00')).toEqual({ covered: false, reason: 'distante', availableFrom: '2026-12-05' });
    const gap = { ...forecast, hours: forecast.hours.map(h => (h.time === '2026-12-04T09:00' ? { ...h, chance: null } : h)) };
    expect(windowRisk(gap, '2026-12-04', '09:00', '10:00')).toEqual({ covered: false, reason: 'sem-dados' });
  });
});

describe('Alertas e decisões', () => {
  it('alerts at or above the farmer threshold', () => {
    expect(assessPlan(forecast, plan(), 50).kind).toBe('alerta');
    expect(assessPlan(forecast, plan(), 90).kind).toBe('ok');
    expect(assessPlan(forecast, plan({ start: '12:00', end: '13:00' }), 25).kind).toBe('alerta');
    expect(assessPlan(null, plan(), 50)).toEqual({ kind: 'sem-previsao', reason: 'carregando' });
  });
  it('keeps the plan until the chance rises above what the farmer accepted', () => {
    const kept = keepPlan(savePlan(initialState(), fields, 'p'), 'p', 80).plans[0]!;
    expect(assessPlan(forecast, kept, 50)).toMatchObject({ kind: 'alerta', kept: true, rose: false });
    const lower = keepPlan(savePlan(initialState(), fields, 'p'), 'p', 60).plans[0]!;
    expect(assessPlan(forecast, lower, 50)).toMatchObject({ kind: 'alerta', kept: false, rose: true });
  });
  it('suggests the latest drier window that keeps the preparation time before delivery', () => {
    // Lowest chance wins over the smallest change: 11:00–12:00 (10%) beats 12:00–13:00 (25%).
    expect(suggestWindow(forecast, plan(), 50)).toEqual({ start: '11:00', end: '12:00', maxChance: 10, totalMm: 0 });
    // A 3h harvest ending 15:00 can only move earlier: 09:00–12:00 is the latest fully dry slot.
    expect(suggestWindow(forecast, plan({ start: '12:00', end: '15:00', delivery: '17:00' }), 50)).toEqual({ start: '09:00', end: '12:00', maxChance: 10, totalMm: 0 });
  });
  it('returns no suggestion when nothing is clearly better', () => {
    const wet = makeForecast(FIRST, 16, () => 70);
    expect(suggestWindow(wet, plan(), 50)).toBeNull();
    expect(assessPlan(wet, plan(), 50)).toMatchObject({ kind: 'alerta', suggestion: null });
    expect(suggestWindow(forecast, plan({ start: '09:00', end: '10:00' }), 50)).toBeNull();
  });
  it('draws hours from two hours before harvest until delivery', () => {
    expect(contextHours(forecast, plan()).map(h => h.time.slice(11))).toEqual(['11:00', '12:00', '13:00', '14:00', '15:00', '16:00']);
  });
});

describe('Open-Meteo', () => {
  it('builds forecast and geocoding URLs, with optional commercial key and host', () => {
    const url = new URL(forecastUrl(-22.9, -47.06));
    expect(url.origin).toBe('https://api.open-meteo.com');
    expect(url.searchParams.get('timezone')).toBe('auto');
    expect(url.searchParams.get('forecast_days')).toBe('16');
    expect(url.searchParams.get('hourly')).toBe('precipitation_probability,precipitation');
    const paid = new URL(forecastUrl(-22.9, -47.06, { host: 'https://customer-api.open-meteo.com', apiKey: 'k' }));
    expect(paid.origin).toBe('https://customer-api.open-meteo.com');
    expect(paid.searchParams.get('apikey')).toBe('k');
    const geo = new URL(geocodeUrl(' Campinas '));
    expect(geo.searchParams.get('name')).toBe('Campinas');
    expect(geo.searchParams.get('countryCode')).toBe('BR');
    expect(geo.searchParams.get('count')).toBe('10');
  });
  it('parses the API shape and keeps missing values as null', () => {
    const parsed = parseForecast({
      latitude: -22.9, longitude: -47.1, timezone: 'America/Sao_Paulo',
      hourly: { time: ['2026-12-01T00:00', '2026-12-01T01:00'], precipitation_probability: [10, null], precipitation: [0, 0.4] },
      daily: { time: ['2026-12-01'], precipitation_probability_max: [40], precipitation_sum: [1.2], temperature_2m_max: [30], temperature_2m_min: [19], weather_code: [61] },
    }, '2026-12-01T10:00:00.000Z');
    expect(parsed.hours).toEqual([{ time: '2026-12-01T00:00', chance: 10, mm: 0 }, { time: '2026-12-01T01:00', chance: null, mm: 0.4 }]);
    expect(parsed.days[0]).toEqual({ date: '2026-12-01', chance: 40, mm: 1.2, tMax: 30, tMin: 19, code: 61 });
    expect(() => parseForecast({ hourly: {} }, '')).toThrow();
  });
  it('fetches through an injectable client', async () => {
    const calls: string[] = [];
    const fake = async (url: string) => { calls.push(url); return { ok: true, status: 200, json: async () => ({ latitude: 1, longitude: 2, timezone: 'UTC', hourly: { time: [], precipitation_probability: [], precipitation: [] }, daily: { time: [], precipitation_probability_max: [], precipitation_sum: [], temperature_2m_max: [], temperature_2m_min: [], weather_code: [] } }) }; };
    const result = await fetchForecast({ latitude: 1, longitude: 2 }, {}, fake, new Date('2026-12-01T10:00:00Z'));
    expect(result.fetchedAt).toBe('2026-12-01T10:00:00.000Z');
    expect(calls).toHaveLength(1);
    await expect(fetchForecast({ latitude: 1, longitude: 2 }, {}, async () => ({ ok: false, status: 429, json: async () => ({}) }))).rejects.toThrow('429');
    expect(await searchPlaces('a', {}, fake)).toEqual([]);
  });
  it('lists places with municipality and state, without duplicates', () => {
    expect(parsePlaces({ results: [
      { name: 'Campinas', latitude: -22.9, longitude: -47.06, admin1: 'São Paulo', admin2: 'Campinas', country_code: 'BR', country: 'Brasil' },
      { name: 'Campinas', latitude: -22.91, longitude: -47.07, admin1: 'São Paulo', admin2: 'Campinas', country_code: 'BR' },
      { name: 'Barão Geraldo', latitude: -22.82, longitude: -47.08, admin1: 'São Paulo', admin2: 'Campinas', country_code: 'BR' },
      { name: 'Salto', latitude: -31.4, longitude: -57.9, admin1: 'Salto', country_code: 'UY', country: 'Uruguai' },
      { name: 'Sem coordenadas' },
    ] })).toEqual([
      { name: 'Campinas', region: 'São Paulo', latitude: -22.9, longitude: -47.06 },
      { name: 'Barão Geraldo', region: 'Campinas, São Paulo', latitude: -22.82, longitude: -47.08 },
      { name: 'Salto', region: 'Salto, Uruguai', latitude: -31.4, longitude: -57.9 },
    ]);
    expect(parsePlaces({})).toEqual([]);
  });
  it('knows when a cached forecast is old or from another place', () => {
    expect(isStale(forecast, new Date('2026-12-01T10:59:00Z'))).toBe(false);
    expect(isStale(forecast, new Date('2026-12-01T11:01:00Z'))).toBe(true);
    expect(sameSpot(forecast, { latitude: -22.92, longitude: -47.08 })).toBe(true);
    expect(sameSpot(forecast, { latitude: -23.5, longitude: -46.6 })).toBe(false);
    expect(ageLabel(forecast.fetchedAt, new Date('2026-12-01T08:20:00Z'))).toBe('há 20 min');
    expect(ageLabel(forecast.fetchedAt, new Date('2026-12-03T09:00:00Z'))).toBe('há 2 dias');
  });
  it('summarises the next days and weather codes', () => {
    expect(upcomingDays(forecast, '2026-12-03', 3).map(d => d.date)).toEqual(['2026-12-03', '2026-12-04', '2026-12-05']);
    expect(upcomingDays(forecast, '2026-12-04', 1)[0]?.chance).toBe(80);
    expect([0, 3, 61, 81, 95, null].map(weatherLabel)).toEqual(['Céu limpo', 'Nublado', 'Chuva', 'Pancadas', 'Trovoadas', '—']);
  });
});
