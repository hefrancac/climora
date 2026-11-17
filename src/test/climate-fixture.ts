import type { Climate } from '@/lib/climate';

type Shape = { tMean: number; tAmp: number; warmestDoy: number; spread: number; rain: (doy: number) => number; et0: (doy: number) => number; frost: (tmin: number) => number };

function build({ tMean, tAmp, warmestDoy, spread, rain, et0, frost }: Shape): Climate {
  const tmean = Array.from({ length: 365 }, (_, d) => tMean + tAmp * Math.cos((2 * Math.PI * (d - warmestDoy)) / 365));
  const tmin = tmean.map(t => t - spread / 2);
  return {
    latitude: 0, longitude: 0, years: [2016, 2025], fetchedAt: '2026-01-01T00:00:00.000Z',
    tmean, tmin, tmax: tmean.map(t => t + spread / 2),
    rain: Array.from({ length: 365 }, (_, d) => rain(d)),
    et0: Array.from({ length: 365 }, (_, d) => et0(d)),
    frost: tmin.map(frost),
  };
}

const seasonal = (d: number, peakDoy: number) => Math.cos((2 * Math.PI * (d - peakDoy)) / 365);

/** Planalto do Sul (ex.: Passo Fundo): verão ameno, inverno frio com geadas, chuva o ano todo. */
export const SUL = build({ tMean: 17, tAmp: 5, warmestDoy: 20, spread: 11, rain: () => 4.8, et0: d => 3.5 + 1.5 * seasonal(d, 10), frost: tmin => (tmin < 8 ? Math.min(0.9, (8 - tmin) / 3) : 0) });

/** Cerrado (ex.: Goiânia): quente o ano todo, chuva de outubro a abril, inverno seco. */
export const CERRADO = build({ tMean: 23.3, tAmp: 1.8, warmestDoy: 270, spread: 12, rain: d => Math.max(0.1, 4.2 + 5 * seasonal(d, 15)), et0: d => 4.6 + 0.8 * seasonal(d, 250), frost: () => 0 });

/** Semiárido (ex.: Sertão): muito quente, chuva curta de fevereiro a abril. */
export const SEMIARIDO = build({ tMean: 26.5, tAmp: 1.5, warmestDoy: 300, spread: 11, rain: d => Math.max(0.1, 0.8 + 2.6 * Math.max(0, seasonal(d, 75)) ** 3 * 1.6), et0: d => 6 + 0.8 * seasonal(d, 300), frost: () => 0 });
