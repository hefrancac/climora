// Planting-season engine: simulates a crop sown on each day of a "normal" year
// at the farm's location and scores how favourable that start date is.
//
// For every candidate sowing date it walks the cycle day by day over the local
// climate profile and combines four factors (each 0–1):
//   temperatura  – daily mean against the crop's tolerable/optimal range
//   água         – rain against crop water use (skipped with irrigation)
//   geada        – chance of frost while the crop is in the field
//   colheita     – rain at harvest for crops that must be harvested dry
// Cycle length follows thermal time: cold periods stretch it, so the harvest
// date moves with the season instead of being a fixed number of days.
import { addDays } from './dates';
import { doyOf, nextDateOf, wrap, type Climate } from './climate';
import type { Crop } from './crops';

export const SCAN_STEP = 5;
const KC = { baixa: 0.6, media: 0.8, alta: 1.0 } as const;
const FROST_WEIGHT = [0.15, 0.6, 1.0] as const;

export type Factors = { temperatura: number; agua: number; geada: number; colheita: number };
export type Season = {
  doy: number;
  score: number;
  /** Days from planting to the start and end of the harvest window. */
  harvestDays: readonly [number, number];
  factors: Factors;
  stats: { tempMean: number; rain: number; need: number; frost: number; harvestRain: number; tooCold: boolean; tooHot: boolean };
};

export type Rating = 'otima' | 'boa' | 'regular' | 'desfavoravel';
export const RATING_LABEL: Record<Rating, string> = { otima: 'Ótima', boa: 'Boa', regular: 'Regular', desfavoravel: 'Desfavorável' };

export function rating(score: number): Rating {
  if (score >= 75) return 'otima';
  if (score >= 60) return 'boa';
  if (score >= 40) return 'regular';
  return 'desfavoravel';
}

/** 1 inside the optimal range, falling linearly to 0 at the tolerable limits. */
export function tempFitness(t: number, [min, low, high, max]: Crop['temp']): number {
  if (t <= min || t >= max) return 0;
  if (t < low) return 0.9 * (t - min) / (low - min);
  if (t > high) return 0.9 * (max - t) / (max - high);
  // Inside the optimal range: 1 at its centre, 0.9 at its edges, so the best dates stand out.
  const centre = (low + high) / 2, half = (high - low) / 2 || 1;
  return 1 - 0.1 * Math.abs(t - centre) / half;
}

function at(values: number[], doy: number): number {
  return values[wrap(doy)] ?? 0;
}

export function evaluate(crop: Crop, climate: Climate, plantDoy: number, irrigated: boolean): Season {
  const [tMin, tLow, tHigh] = crop.temp;
  // Thermal time: base a little under the tolerable minimum; the reference cycle
  // is reached at temperatures in the lower part of the optimal range.
  const base = tMin - 2;
  const reference = tLow + 0.25 * (tHigh - tLow);

  // 1. Cycle length (thermal time for annual crops, fixed for perennials).
  let harvestStart: number, harvestEnd: number, tooCold = false;
  if (crop.establish) {
    [harvestStart, harvestEnd] = crop.cycle;
  } else {
    const perDay = reference - base;
    const need = [crop.cycle[0] * perDay, crop.cycle[1] * perDay];
    const cap = Math.round(crop.cycle[1] * 2);
    let sum = 0, d = 0;
    const reach: number[] = [];
    while (d < cap && reach.length < 2) {
      const t = at(climate.tmean, plantDoy + d);
      sum += Math.max(0, Math.min(t, tHigh) - base);
      d++;
      if (reach.length === 0 && sum >= need[0]!) reach.push(d);
      if (reach.length === 1 && sum >= need[1]!) reach.push(d);
    }
    if (reach.length === 0) tooCold = true;
    harvestStart = reach[0] ?? cap;
    harvestEnd = Math.max(reach[1] ?? cap, harvestStart + 1);
  }

  // 2. Period judged for growth: establishment for perennials, until first harvest otherwise.
  const span = crop.establish ?? harvestStart;

  // Temperature: average fitness, pulled down by the worst 10-day stretch.
  let fitSum = 0, worst = 1, block = 0, blockLen = 0, tSum = 0, hotDays = 0;
  for (let d = 0; d < span; d++) {
    const t = at(climate.tmean, plantDoy + d);
    const f = tempFitness(t, crop.temp);
    fitSum += f; tSum += t; block += f; blockLen++;
    if (t >= crop.temp[3]) hotDays++;
    if (blockLen === 10 || d === span - 1) { worst = Math.min(worst, block / blockLen); block = 0; blockLen = 0; }
  }
  const temperatura = 0.6 * (fitSum / span) + 0.4 * worst;

  // Water: effective rain against crop use, plus moisture to establish the crop.
  let rain = 0, need = 0, rainFirst = 0, needFirst = 0;
  for (let d = 0; d < span; d++) {
    const r = at(climate.rain, plantDoy + d) * 0.8;
    const n = at(climate.et0, plantDoy + d) * KC[crop.water];
    rain += r; need += n;
    if (d < 30) { rainFirst += r; needFirst += n; }
  }
  let agua = 1;
  if (!irrigated) {
    const ratio = need > 0 ? rain / need : 1;
    agua = ratio >= 1 ? 1 : Math.max(0.05, ratio) ** 0.8;
    const first = needFirst > 0 ? rainFirst / needFirst : 1;
    if (first < 0.4) agua *= 0.7 + first * 0.75; // sowing into dry soil
  }
  const rainPerDay = rain / 0.8 / span;
  if (crop.rainSensitive) agua *= rainPerDay > 9 ? 0.65 : rainPerDay > 7 ? 0.8 : 1;

  // Frost while the crop is in the field (perennials: while young).
  let frostRisk = 0;
  for (let d = 0; d < span; d += 3) frostRisk = Math.max(frostRisk, at(climate.frost, plantDoy + d));
  const geada = Math.max(0, 1 - frostRisk * FROST_WEIGHT[crop.frost]);

  // Rain at harvest.
  let hRain = 0;
  for (let d = harvestStart; d <= harvestEnd; d++) hRain += at(climate.rain, plantDoy + d);
  const harvestRain = hRain / (harvestEnd - harvestStart + 1);
  const colheita = crop.dryHarvest ? (harvestRain > 6 ? 0.6 : harvestRain > 4 ? 0.8 : 1) : 1;

  const raw = temperatura * agua * geada * colheita * (tooCold ? 0.5 : 1);
  return {
    doy: wrap(plantDoy),
    score: Math.round(raw * 100),
    harvestDays: [harvestStart, harvestEnd],
    factors: { temperatura, agua, geada, colheita },
    stats: { tempMean: tSum / span, rain: rain / 0.8, need, frost: frostRisk, harvestRain, tooCold, tooHot: hotDays > span * 0.2 },
  };
}

/** Scores sowing every few days across the year. */
export function scanYear(crop: Crop, climate: Climate, irrigated: boolean, step = SCAN_STEP): Season[] {
  const out: Season[] = [];
  for (let doy = 0; doy < 365; doy += step) out.push(evaluate(crop, climate, doy, irrigated));
  return out;
}

/** True when most of the year is favourable: the options are then just the least risky dates. */
export function plantsYearRound(scan: Season[]): boolean {
  return scan.filter(s => s.score >= 60).length >= scan.length * 0.8;
}

export type PlantingWindow = {
  rank: number;
  peak: Season;
  startDoy: number;
  endDoy: number;
  rating: Rating;
};

/**
 * Picks up to `count` separate planting windows, best first. Each window spans the
 * neighbouring dates that score close to its peak (at most ±30 days).
 */
export function bestWindows(scan: Season[], count = 3, minScore = 40): PlantingWindow[] {
  const n = scan.length;
  const step = n ? 365 / n : SCAN_STEP;
  const taken = new Array<boolean>(n).fill(false);
  const order = scan.map((s, i) => [s.score, i] as const).sort((a, b) => b[0] - a[0] || a[1] - b[1]);
  const maxReach = Math.round(30 / step);
  const windows: PlantingWindow[] = [];
  for (const [score, i] of order) {
    if (windows.length >= count) break;
    if (taken[i]) continue;
    if (score < minScore && windows.length > 0) break;
    const floor = Math.max(score - 10, Math.min(minScore, score));
    let left = 0, right = 0;
    while (left < maxReach && !taken[(i - left - 1 + n) % n] && (scan[(i - left - 1 + n) % n]?.score ?? 0) >= floor) left++;
    while (right < maxReach && !taken[(i + right + 1) % n] && (scan[(i + right + 1) % n]?.score ?? 0) >= floor) right++;
    // Block the window plus a margin so the next option is a genuinely different season.
    const margin = Math.round(20 / step);
    for (let k = -left - margin; k <= right + margin; k++) taken[(i + k + n * 2) % n] = true;
    const peak = scan[i]!;
    windows.push({ rank: windows.length + 1, peak, startDoy: wrap(peak.doy - left * step), endDoy: wrap(peak.doy + right * step + step - 1), rating: rating(score) });
    if (score < minScore) break; // only the "least bad" option is shown
  }
  return windows;
}

export type WindowDates = { plantFrom: string; plantTo: string; harvestFrom: string; harvestTo: string; inProgress: boolean };

/** Concrete dates for the next occurrence of a window, starting today if it is open now. */
export function windowDates(win: PlantingWindow, crop: Crop, climate: Climate, irrigated: boolean, today: string): WindowDates {
  const length = wrap(win.endDoy - win.startDoy);
  const nextStart = nextDateOf(win.startDoy, today);
  const openSince = addDays(nextStart, -365);
  const inProgress = addDays(openSince, length) >= today && openSince <= today;
  const plantFrom = inProgress ? today : nextStart;
  const plantTo = inProgress ? addDays(openSince, length) : addDays(nextStart, length);
  const first = evaluate(crop, climate, doyOf(plantFrom), irrigated);
  const last = evaluate(crop, climate, doyOf(plantTo), irrigated);
  return { plantFrom, plantTo, harvestFrom: addDays(plantFrom, first.harvestDays[0]), harvestTo: addDays(plantTo, last.harvestDays[1]), inProgress };
}

/** Harvest window for a specific planting date the farmer chose. */
export function harvestFor(crop: Crop, climate: Climate, plantDate: string, irrigated: boolean): { season: Season; from: string; to: string } {
  const season = evaluate(crop, climate, doyOf(plantDate), irrigated);
  return { season, from: addDays(plantDate, season.harvestDays[0]), to: addDays(plantDate, season.harvestDays[1]) };
}

// ---------- Explanations ----------

export type Reason = { ok: boolean; text: string };

const fmt = (n: number, digits = 0) => n.toLocaleString('pt-BR', { maximumFractionDigits: digits, minimumFractionDigits: digits });

export function explain(season: Season, crop: Crop, irrigated: boolean): Reason[] {
  const [, low, high] = crop.temp;
  const s = season.stats, f = season.factors;
  const reasons: Reason[] = [];
  const period = crop.establish ? 'nos primeiros meses' : 'no ciclo';
  reasons.push({
    ok: f.temperatura >= 0.75,
    text: s.tooCold
      ? `Frio demais: o ciclo fica muito longo (média de ${fmt(s.tempMean)} °C; ideal ${low}–${high} °C)`
      : `Temperatura média de ${fmt(s.tempMean)} °C ${period} (ideal ${low}–${high} °C)${s.tooHot ? ', com períodos de calor excessivo' : ''}`,
  });
  if (irrigated) reasons.push({ ok: true, text: `Com irrigação: chuva esperada de ${fmt(s.rain)} mm ${period} (necessidade de ~${fmt(s.need)} mm)` });
  else reasons.push({
    ok: f.agua >= 0.75,
    text: `Chuva esperada de ${fmt(s.rain)} mm ${period} para uma necessidade de ~${fmt(s.need)} mm${f.agua < 0.5 ? ': precisa de irrigação' : f.agua < 0.75 ? ': pode faltar água' : ''}`,
  });
  if (crop.rainSensitive && s.rain / Math.max(1, crop.establish ?? season.harvestDays[0]) > 7) reasons.push({ ok: false, text: 'Chuva intensa e frequente favorece doenças nesta cultura' });
  if (s.frost >= 0.1 || crop.frost > 0) {
    const pct = Math.round(s.frost * 100);
    reasons.push({ ok: f.geada >= 0.85, text: pct === 0 ? 'Sem registro de geada no período' : `Geada em ${pct}% dos anos neste período${crop.frost === 0 ? ' (a cultura tolera)' : ''}` });
  }
  if (crop.dryHarvest) reasons.push({ ok: f.colheita === 1, text: f.colheita === 1 ? 'Colheita em período mais seco' : `Colheita em período chuvoso (~${fmt(s.harvestRain, 1)} mm/dia)` });
  return reasons;
}

const FACTOR_TEXT: Record<keyof Factors, string> = { temperatura: 'temperatura fora da faixa', agua: 'falta de chuva', geada: 'risco de geada', colheita: 'chuva na colheita' };

/** Main reason a date scores low. */
export function limitingFactor(season: Season): string {
  if (season.stats.tooCold) return 'frio demais';
  const entries = Object.entries(season.factors) as [keyof Factors, number][];
  const [key] = entries.sort((a, b) => a[1] - b[1])[0]!;
  if (key === 'temperatura') return season.stats.tempMean > 25 ? 'calor excessivo' : 'frio';
  if (key === 'agua' && season.stats.rain > season.stats.need) return 'chuva em excesso';
  return FACTOR_TEXT[key];
}
