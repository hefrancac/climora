import { describe, expect, it } from 'vitest';
import { addDays } from './dates';
import { climateFromDaily, climateUrl, dateOfDoy, doyOf, monthlySummary, nextDateOf, parseClimate } from './climate';

function rows(from: string, days: number, fn: (date: string) => { tmin: number; rain: number }) {
  return Array.from({ length: days }, (_, i) => {
    const date = addDays(from, i);
    const { tmin, rain } = fn(date);
    return { date, tmean: tmin + 6, tmin, tmax: tmin + 12, rain, et0: 4 };
  });
}

describe('Dia do ano', () => {
  it('ignores leap days', () => {
    expect(doyOf('2025-01-01')).toBe(0);
    expect(doyOf('2025-12-31')).toBe(364);
    expect(doyOf('2028-02-29')).toBe(58);
    expect(doyOf('2028-03-01')).toBe(59);
    expect(dateOfDoy(2028, 59)).toBe('2028-03-01');
    expect(dateOfDoy(2027, 59)).toBe('2027-03-01');
  });
  it('finds the next occurrence from today', () => {
    expect(nextDateOf(doyOf('2026-02-01'), '2026-11-17')).toBe('2027-02-01');
    expect(nextDateOf(doyOf('2026-11-17'), '2026-11-17')).toBe('2026-11-17');
  });
});

describe('Perfil climático', () => {
  it('requests 10 full years of daily history in local time', () => {
    const url = new URL(climateUrl(-22.9, -47.06, 2016, 2025));
    expect(url.origin + url.pathname).toBe('https://archive-api.open-meteo.com/v1/archive');
    expect(url.searchParams.get('start_date')).toBe('2016-01-01');
    expect(url.searchParams.get('end_date')).toBe('2025-12-31');
    expect(url.searchParams.get('daily')).toContain('et0_fao_evapotranspiration');
  });
  it('averages years by day and measures frost chance per year', () => {
    // 4 years; cold snap (tmin 1 °C) around 1 July in two of them.
    const data = rows('2020-01-01', 365 * 4 + 1, date => {
      const cold = (date.startsWith('2020-07-0') || date.startsWith('2022-07-0'));
      return { tmin: cold ? 1 : 15, rain: date.slice(5, 7) === '01' ? 10 : 0 };
    });
    const climate = climateFromDaily(data, { latitude: 1, longitude: 2, fetchedAt: 'x' });
    expect(climate.years).toEqual([2020, 2023]);
    expect(climate.tmean).toHaveLength(365);
    expect(climate.frost[doyOf('2021-07-05')]).toBe(0.5);
    expect(climate.frost[doyOf('2021-03-01')]).toBe(0);
    expect(climate.rain[doyOf('2021-01-16')]).toBeGreaterThan(8);
    expect(climate.rain[doyOf('2021-06-15')]).toBe(0);
    const months = monthlySummary(climate);
    expect(months).toHaveLength(12);
    expect(months[0]!.rain).toBeGreaterThan(200);
  });
  it('parses the API shape and rejects short or broken histories', () => {
    const data = rows('2020-01-01', 365 * 3, () => ({ tmin: 15, rain: 1 }));
    const json = { latitude: -22.9, longitude: -47.1, daily: {
      time: data.map(r => r.date), temperature_2m_mean: data.map(r => r.tmean), temperature_2m_min: data.map(r => r.tmin),
      temperature_2m_max: data.map(r => r.tmax), precipitation_sum: data.map(r => r.rain), et0_fao_evapotranspiration: data.map(r => r.et0) } };
    const climate = parseClimate(json, 'now');
    expect(climate.latitude).toBe(-22.9);
    expect(climate.tmean[100]).toBeCloseTo(21);
    expect(() => parseClimate({ daily: { time: ['2020-01-01'] } }, 'now')).toThrow();
    expect(() => climateFromDaily(rows('2020-01-01', 400, () => ({ tmin: 10, rain: 0 })), { latitude: 0, longitude: 0, fetchedAt: '' })).toThrow();
  });
});
