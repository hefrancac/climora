import { describe, expect, it } from 'vitest';
import { CERRADO, SEMIARIDO, SUL } from '@/test/climate-fixture';
import { doyOf } from './climate';
import { cropByKey, type Crop } from './crops';
import { bestWindows, evaluate, explain, harvestFor, limitingFactor, plantsYearRound, rating, scanYear, tempFitness, windowDates } from './suitability';

const crop = (key: string): Crop => { const c = cropByKey(key); if (!c) throw new Error(key); return c; };
const inMonths = (doy: number, from: string, to: string) => {
  const a = doyOf(`2025-${from}`), b = doyOf(`2025-${to}`);
  return a <= b ? doy >= a && doy <= b : doy >= a || doy <= b;
};

describe('Época de plantio por região', () => {
  it('Cerrado: feijão de sequeiro no início do ano; no inverno só com irrigação', () => {
    const [best] = bestWindows(scanYear(crop('feijao'), CERRADO, false));
    expect(inMonths(best!.peak.doy, '01-01', '03-31')).toBe(true);
    expect(best!.peak.score).toBeGreaterThanOrEqual(75);
    expect(evaluate(crop('feijao'), CERRADO, doyOf('2025-07-01'), false).score).toBeLessThan(40);
    expect(evaluate(crop('feijao'), CERRADO, doyOf('2025-06-01'), true).score).toBeGreaterThanOrEqual(75);
  });
  it('Sul: tomate na primavera, longe das geadas', () => {
    const [best] = bestWindows(scanYear(crop('tomate'), SUL, false));
    expect(inMonths(best!.peak.doy, '09-01', '12-31')).toBe(true);
    const june = evaluate(crop('tomate'), SUL, doyOf('2025-06-01'), false);
    expect(june.score).toBeLessThan(40);
    expect(limitingFactor(june)).toMatch(/geada|frio/);
  });
  it('Semiárido: mandioca no começo das chuvas; trigo não é recomendado', () => {
    const [best] = bestWindows(scanYear(crop('mandioca'), SEMIARIDO, false));
    expect(inMonths(best!.peak.doy, '12-01', '02-28')).toBe(true);
    const wheat = bestWindows(scanYear(crop('trigo'), SEMIARIDO, true));
    expect(wheat).toHaveLength(1);
    expect(wheat[0]!.rating).toBe('desfavoravel');
  });
  it('detects when irrigation allows planting nearly all year', () => {
    expect(plantsYearRound(scanYear(crop('tomate'), CERRADO, true))).toBe(true);
    expect(plantsYearRound(scanYear(crop('tomate'), SUL, true))).toBe(false);
  });
});

describe('Ciclo e colheita', () => {
  it('stretches the cycle when it is cold', () => {
    const winter = evaluate(crop('alface'), SUL, doyOf('2025-06-01'), true);
    const summer = evaluate(crop('alface'), SUL, doyOf('2025-12-01'), true);
    expect(winter.harvestDays[0]).toBeGreaterThan(summer.harvestDays[0]);
  });
  it('uses the fixed first-harvest time for perennials', () => {
    expect(evaluate(crop('banana'), CERRADO, 0, true).harvestDays).toEqual([365, 450]);
  });
  it('turns a window into the next concrete dates', () => {
    const c = crop('feijao');
    const [win] = bestWindows(scanYear(c, CERRADO, false));
    const dates = windowDates(win!, c, CERRADO, false, '2026-11-17');
    expect(dates.inProgress).toBe(false);
    expect(dates.plantFrom.startsWith('2027-')).toBe(true);
    expect(dates.plantFrom <= dates.plantTo && dates.plantTo < dates.harvestFrom && dates.harvestFrom < dates.harvestTo).toBe(true);
    const open = windowDates(win!, c, CERRADO, false, dates.plantFrom.replace('2027', '2026'));
    expect(open.inProgress).toBe(false);
    const inside = windowDates(win!, c, CERRADO, false, '2027-' + dates.plantTo.slice(5));
    expect(inside.inProgress || inside.plantFrom === '2027-' + dates.plantTo.slice(5)).toBe(true);
    const h = harvestFor(c, CERRADO, '2027-02-10', false);
    expect(h.from > '2027-04-01' && h.to < '2027-06-30').toBe(true);
  });
});

describe('Pontuação', () => {
  it('scores temperature with a gentle peak in the optimal range', () => {
    const range = [10, 20, 26, 32] as const;
    expect(tempFitness(23, range)).toBe(1);
    expect(tempFitness(20, range)).toBeCloseTo(0.9);
    expect(tempFitness(15, range)).toBeCloseTo(0.45);
    expect(tempFitness(10, range)).toBe(0);
    expect(tempFitness(33, range)).toBe(0);
    expect([90, 70, 50, 10].map(rating)).toEqual(['otima', 'boa', 'regular', 'desfavoravel']);
  });
  it('returns up to three separate windows, best first', () => {
    const windows = bestWindows(scanYear(crop('alface'), SUL, true));
    expect(windows.length).toBeGreaterThan(1);
    expect(windows.length).toBeLessThanOrEqual(3);
    for (let i = 1; i < windows.length; i++) expect(windows[i]!.peak.score).toBeLessThanOrEqual(windows[i - 1]!.peak.score);
    const peaks = windows.map(w => w.peak.doy);
    for (const a of peaks) for (const b of peaks) if (a !== b) expect(Math.min(Math.abs(a - b), 365 - Math.abs(a - b))).toBeGreaterThan(20);
  });
  it('explains each factor in plain words', () => {
    const c = crop('feijao');
    const dry = explain(evaluate(c, CERRADO, doyOf('2025-07-01'), false), c, false);
    expect(dry.some(r => !r.ok && r.text.includes('irrigação'))).toBe(true);
    const irrigated = explain(evaluate(c, CERRADO, doyOf('2025-07-01'), true), c, true);
    expect(irrigated[1]?.text.startsWith('Com irrigação')).toBe(true);
    expect(dry.some(r => r.text.startsWith('Colheita'))).toBe(true);
  });
});
