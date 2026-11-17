import { describe, expect, it } from 'vitest';
import { CROPS, POPULAR, TEMPLATES, cropByKey, customCrop, normalize, searchCrops } from './crops';

describe('Base de culturas', () => {
  it('has consistent, unique profiles', () => {
    expect(CROPS.length).toBeGreaterThanOrEqual(60);
    expect(new Set(CROPS.map(c => c.key)).size).toBe(CROPS.length);
    for (const crop of CROPS) {
      const [min, low, high, max] = crop.temp;
      expect(min < low && low <= high && high < max).toBe(true);
      expect(crop.cycle[0]).toBeLessThan(crop.cycle[1]);
    }
    for (const key of POPULAR) expect(cropByKey(key)).toBeDefined();
    for (const t of Object.values(TEMPLATES)) expect(cropByKey(t.base)).toBeDefined();
  });
  it('finds crops by name or regional name, ignoring accents', () => {
    expect(searchCrops('feijao')[0]?.name).toBe('Feijão');
    expect(searchCrops('aipim')[0]?.name).toBe('Mandioca');
    expect(searchCrops('MACAXEIRA')[0]?.name).toBe('Mandioca');
    expect(searchCrops('jerimum')[0]?.name).toBe('Abóbora');
    expect(searchCrops('milho').map(c => c.name)).toEqual(['Milho (grão)', 'Milho verde']);
    expect(searchCrops('corda')[0]?.name).toBe('Feijão-caupi');
    expect(searchCrops('xyz')).toEqual([]);
    expect(searchCrops('')).toEqual([]);
  });
  it('builds a profile for a crop that is not listed', () => {
    const crop = customCrop(' Taioba ', 'raiz-quente', 200);
    expect(crop).toMatchObject({ name: 'Taioba', key: 'custom:taioba', cycle: [200, 230], group: 'raiz' });
    expect(normalize('Feijão-de-corda')).toBe('feijao de corda');
  });
});
