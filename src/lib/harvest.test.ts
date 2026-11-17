import { describe, expect, it } from 'vitest';
import {
  addExamples, deletePlan, deletePlanting, savePlanting, setPlantingStatus, sortedPlantings, type Planting, deliveredPlans, emptyFields, examplePlans, initialState, keepPlan, loadStored, migrateV1,
  moveHarvest, parseState, savePlan, setStatus, upcomingGroups, updateSettings, validatePlan, type AppState, type PlanFields,
} from './harvest';

const TODAY = '2026-12-01';
const base: PlanFields = { crop: 'Alface', sale: 'Feira', customer: 'Feira do bairro', quantity: '40 pés', date: '2026-12-04', start: '13:00', end: '14:00', delivery: '16:00', notes: '' };

function withPlan(fields: PlanFields = base, id = 'p1'): AppState {
  return savePlan(initialState(), fields, id);
}

describe('Validação do plano', () => {
  it('accepts a complete plan', () => { expect(validatePlan(base)).toEqual({}); });
  it.each(['13:59', '14:00'])('rejects delivery at or before the end: %s', delivery => {
    expect(validatePlan({ ...base, delivery }).delivery).toBeDefined();
  });
  it.each(['13:00', '12:59'])('requires harvest to start before it ends', end => { expect(validatePlan({ ...base, end }).end).toBeDefined(); });
  it.each(['crop', 'sale', 'date', 'start', 'end', 'delivery'] as const)('requires %s', key => {
    expect(validatePlan({ ...base, [key]: '' } as PlanFields)[key]).toBeDefined();
  });
  it('keeps optional fields optional but bounded', () => {
    expect(validatePlan({ ...base, customer: '', quantity: '', notes: '' })).toEqual({});
    expect(validatePlan({ ...base, customer: 'a'.repeat(61) }).customer).toBeDefined();
    expect(validatePlan({ ...base, quantity: 'a'.repeat(31) }).quantity).toBeDefined();
    expect(validatePlan({ ...base, notes: 'a'.repeat(281) }).notes).toBeDefined();
  });
  it('allows at most 40 trimmed culture characters', () => {
    expect(validatePlan({ ...base, crop: `  ${'a'.repeat(40)}  ` }).crop).toBeUndefined();
    expect(validatePlan({ ...base, crop: 'a'.repeat(41) }).crop).toBeDefined();
  });
  it('rejects impossible dates and unknown sale types', () => {
    expect(validatePlan({ ...base, date: '2026-02-30' }).date).toBeDefined();
    expect(validatePlan({ ...base, sale: 'Atacado' as PlanFields['sale'] }).sale).toBeDefined();
  });
});

describe('Transições', () => {
  it('creates a planned record with trimmed text', () => {
    const state = withPlan({ ...base, crop: '  Rúcula  ', customer: ' Ana ' });
    expect(state.plans).toEqual([{ ...base, crop: 'Rúcula', customer: 'Ana', id: 'p1', status: 'planejado' }]);
  });
  it('refuses to save an invalid plan', () => {
    expect(() => savePlan(initialState(), { ...base, start: '' }, 'x')).toThrow();
  });
  it('keeps the decision when only the delivery details change', () => {
    const kept = keepPlan(withPlan(), 'p1', 70);
    const edited = savePlan(kept, { ...base, customer: 'Outro', delivery: '17:00' }, 'p1');
    expect(edited.plans[0]?.ackedChance).toBe(70);
  });
  it.each([{ date: '2026-12-05' }, { start: '12:00' }, { end: '15:00', delivery: '16:00' }])('clears the decision when the harvest moves: %o', change => {
    const kept = keepPlan(withPlan(), 'p1', 70);
    const edited = savePlan(kept, { ...base, ...change }, 'p1');
    expect(edited.plans[0]).not.toHaveProperty('ackedChance');
  });
  it('moves the harvest window to a suggestion and keeps status', () => {
    const state = setStatus(keepPlan(withPlan(), 'p1', 80), 'p1', 'colhido');
    const moved = moveHarvest(state, 'p1', '10:00', '11:00');
    expect(moved.plans[0]).toMatchObject({ start: '10:00', end: '11:00', delivery: '16:00', status: 'colhido' });
    expect(moved.plans[0]).not.toHaveProperty('ackedChance');
    expect(moveHarvest(state, 'nope', '10:00', '11:00')).toBe(state);
  });
  it('deletes and changes status of a single record', () => {
    const two = savePlan(withPlan(), { ...base, crop: 'Couve' }, 'p2');
    expect(deletePlan(two, 'p1').plans.map(p => p.id)).toEqual(['p2']);
    expect(setStatus(two, 'p2', 'entregue').plans.map(p => p.status)).toEqual(['planejado', 'entregue']);
  });
  it('updates settings without touching plans', () => {
    const state = updateSettings(withPlan(), { farmName: 'Sítio Boa Vista', threshold: 40 });
    expect(state.settings).toEqual({ farmName: 'Sítio Boa Vista', location: null, threshold: 40 });
    expect(state.plans).toHaveLength(1);
  });
  it('adds dated examples once', () => {
    const once = addExamples(initialState(), TODAY);
    expect(once.plans.map(p => p.date)).toEqual(['2026-12-02', '2026-12-03', '2026-12-04']);
    expect(addExamples(once, TODAY).plans).toHaveLength(3);
    for (const p of examplePlans(TODAY)) expect(validatePlan(p)).toEqual({});
  });
  it('prefills the form from the planting estimate', () => {
    expect(emptyFields({ crop: 'Milho', date: '2027-03-01' })).toMatchObject({ crop: 'Milho', date: '2027-03-01', sale: '' });
  });
});

describe('Visões da agenda', () => {
  it('groups open plans by day in order and lists delivered ones apart', () => {
    let state = withPlan({ ...base, date: '2026-12-05' }, 'late');
    state = savePlan(state, { ...base, start: '06:00', end: '07:00', delivery: '08:00' }, 'early');
    state = savePlan(state, base, 'mid');
    state = savePlan(state, { ...base, date: '2026-12-02' }, 'done');
    state = setStatus(state, 'done', 'entregue');
    expect(upcomingGroups(state).map(g => [g.date, g.plans.map(p => p.id)])).toEqual([
      ['2026-12-04', ['early', 'mid']],
      ['2026-12-05', ['late']],
    ]);
    expect(deliveredPlans(state).map(p => p.id)).toEqual(['done']);
  });
});

const planting: Planting = { id: 'pl1', crop: 'Feijão', cropKey: 'feijao', plantDate: '2027-02-10', harvestFrom: '2027-04-20', harvestTo: '2027-05-07', irrigated: false, score: 92, status: 'previsto' };

describe('Plantações', () => {
  it('saves, updates, orders and removes plantings', () => {
    let state = savePlanting(initialState(), planting);
    state = savePlanting(state, { ...planting, id: 'pl2', crop: 'Milho (grão)', cropKey: 'milho', plantDate: '2026-12-01', harvestFrom: '2027-04-01', harvestTo: '2027-05-01', status: 'plantado' });
    expect(sortedPlantings(state).map(p => p.id)).toEqual(['pl2', 'pl1']);
    state = setPlantingStatus(state, 'pl2', 'colhido');
    expect(sortedPlantings(state).map(p => p.id)).toEqual(['pl1', 'pl2']);
    state = savePlanting(state, { ...planting, score: 80 });
    expect(state.plantings.find(p => p.id === 'pl1')?.score).toBe(80);
    expect(deletePlanting(state, 'pl1').plantings.map(p => p.id)).toEqual(['pl2']);
  });
  it('refuses impossible plantings', () => {
    expect(() => savePlanting(initialState(), { ...planting, harvestFrom: '2027-01-01' })).toThrow();
    expect(() => savePlanting(initialState(), { ...planting, crop: ' ' })).toThrow();
    expect(() => savePlanting(initialState(), { ...planting, score: 120 })).toThrow();
  });
});

describe('Armazenamento', () => {
  it('round trips plantings and upgrades the version 2 format', () => {
    const state = savePlanting(withPlan(), planting);
    expect(parseState(JSON.stringify(state))).toEqual(state);
    const v2 = { version: 2, settings: state.settings, plans: state.plans };
    expect(parseState(JSON.stringify(v2))).toEqual({ ...v2, version: 3, plantings: [] });
    expect(() => parseState(JSON.stringify({ ...state, plantings: [planting, planting] }))).toThrow();
  });
  it('round trips plans, decisions and settings', () => {
    const state = updateSettings(keepPlan(withPlan(), 'p1', 75), { location: { name: 'Campinas', region: 'São Paulo', latitude: -22.9, longitude: -47.06 } });
    expect(parseState(JSON.stringify(state))).toEqual(state);
  });
  it.each(['invalid', '{}', '{"version":1,"forecast":"initial","plans":[]}', '{"version":3,"plans":[]}', '{"version":4,"plans":[],"plantings":[]}'])('rejects invalid storage %s', raw => {
    expect(() => parseState(raw)).toThrow();
  });
  it('rejects duplicate or malformed plans', () => {
    const state = withPlan();
    expect(() => parseState(JSON.stringify({ ...state, plans: [...state.plans, ...state.plans] }))).toThrow();
    expect(() => parseState(JSON.stringify({ ...state, plans: [{ ...state.plans[0], start: '25:00' }] }))).toThrow();
    expect(() => parseState(JSON.stringify({ ...state, plans: [{ ...state.plans[0], status: 'perdido' }] }))).toThrow();
    expect(() => parseState(JSON.stringify({ ...state, settings: { ...state.settings, threshold: 5 } }))).toThrow();
  });
  it('migrates the first demo format, dropping simulated decisions', () => {
    const legacy = JSON.stringify({ version: 1, forecast: 'updated', plans: [
      { id: 'demo-alface', crop: 'Alface', sale: 'Feira', date: '2026-12-04', start: '13:00', end: '14:00', delivery: '16:00', keptVersion: 'updated' },
      { id: 'broken', crop: 'Couve', sale: 'Feira', date: '2026-12-04', start: '15:00', end: '14:00', delivery: '16:00' },
    ] });
    const state = migrateV1(legacy);
    expect(state.plans).toEqual([{ id: 'demo-alface', crop: 'Alface', sale: 'Feira', customer: '', quantity: '', date: '2026-12-04', start: '13:00', end: '14:00', delivery: '16:00', notes: '', status: 'planejado' }]);
    expect(parseState(JSON.stringify(state))).toEqual(state);
  });
  it('prefers the current format and returns null when nothing was saved', () => {
    const current = JSON.stringify(withPlan());
    expect(loadStored(current, '{"version":1,"forecast":"initial","plans":[]}')?.plans).toHaveLength(1);
    expect(loadStored(null, '{"version":1,"forecast":"initial","plans":[]}')?.plans).toEqual([]);
    expect(loadStored(null, null)).toBeNull();
  });
});
