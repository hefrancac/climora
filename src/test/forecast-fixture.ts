import { addDays } from '@/lib/dates';
import type { Forecast } from '@/lib/weather';

/** Builds a forecast of `days` days from `first`, with chance/mm given per date and hour. */
export function makeForecast(first: string, days: number, chance: (date: string, hour: number) => number, mm: (date: string, hour: number) => number = () => 0): Forecast {
  const hours: Forecast['hours'] = [];
  const daily: Forecast['days'] = [];
  for (let d = 0; d < days; d++) {
    const date = addDays(first, d);
    let max = 0, sum = 0;
    for (let h = 0; h < 24; h++) {
      const c = chance(date, h), r = mm(date, h);
      max = Math.max(max, c); sum += r;
      hours.push({ time: `${date}T${String(h).padStart(2, '0')}:00`, chance: c, mm: r });
    }
    daily.push({ date, chance: max, mm: Math.round(sum * 10) / 10, tMax: 29, tMin: 18, code: max >= 60 ? 61 : 2 });
  }
  return { latitude: -22.9, longitude: -47.06, timezone: 'America/Sao_Paulo', fetchedAt: `${first}T08:00:00.000Z`, hours, days: daily };
}
