// Agenda domain: plans, settings, validation, transitions and persistence format.
// Pure and browser-safe: no React, no storage, no network.
import { addDays, dateLabel, isISODate, minutes } from './dates';

export { dateLabel, minutes } from './dates';

export const STORAGE_KEY = 'climora:v2';
/** Key used by the first demo version; migrated on first load. */
export const LEGACY_STORAGE_KEY = 'chuva-colheita:v1';

export const SALE_TYPES = ['Feira', 'Encomenda', 'PNAE/PAA', 'Comércio local'] as const;
export type SaleType = (typeof SALE_TYPES)[number];

export const STATUSES = ['planejado', 'colhido', 'entregue'] as const;
export type PlanStatus = (typeof STATUSES)[number];
export const STATUS_LABEL: Record<PlanStatus, string> = { planejado: 'Planejado', colhido: 'Colhido', entregue: 'Entregue' };

export const THRESHOLDS = [30, 40, 50, 60, 70] as const;
export const DEFAULT_THRESHOLD = 50;

export type Place = { name: string; region: string; latitude: number; longitude: number };
export type Settings = { farmName: string; location: Place | null; threshold: number };

export type PlanFields = {
  crop: string;
  sale: SaleType | '';
  customer: string;
  quantity: string;
  date: string;
  start: string;
  end: string;
  delivery: string;
  notes: string;
};
export type Plan = Omit<PlanFields, 'sale'> & {
  id: string;
  sale: SaleType;
  status: PlanStatus;
  /** Highest rain chance the farmer saw and accepted for this window. */
  ackedChance?: number;
};
/** A crop the farmer decided to plant, with the harvest the climate profile predicts. */
export const PLANTING_STATUSES = ['previsto', 'plantado', 'colhido'] as const;
export type PlantingStatus = (typeof PLANTING_STATUSES)[number];
export type Planting = {
  id: string;
  crop: string;
  cropKey: string;
  plantDate: string;
  harvestFrom: string;
  harvestTo: string;
  irrigated: boolean;
  /** Season score (0–100) when it was saved. */
  score: number;
  status: PlantingStatus;
};
export type AppState = { version: 3; settings: Settings; plans: Plan[]; plantings: Planting[] };
export type FieldErrors = Partial<Record<keyof PlanFields, string>>;

export const LIMITS = { crop: 40, customer: 60, quantity: 30, notes: 280, farmName: 60 } as const;

export function defaultSettings(): Settings {
  return { farmName: '', location: null, threshold: DEFAULT_THRESHOLD };
}

export function initialState(): AppState {
  return { version: 3, settings: defaultSettings(), plans: [], plantings: [] };
}

export function emptyFields(seed?: { crop?: string; date?: string } | null): PlanFields {
  return { crop: seed?.crop ?? '', sale: '', customer: '', quantity: '', date: seed?.date ?? '', start: '', end: '', delivery: '', notes: '' };
}

export function fieldsOf(plan: Plan): PlanFields {
  const { crop, sale, customer, quantity, date, start, end, delivery, notes } = plan;
  return { crop, sale, customer, quantity, date, start, end, delivery, notes };
}

/** Example plans spread over the next days, so a new user sees real forecasts at work. */
export function examplePlans(today: string): Plan[] {
  return [
    { id: 'exemplo-alface', crop: 'Alface', sale: 'Feira', customer: 'Feira do produtor', quantity: '40 pés', date: addDays(today, 1), start: '05:30', end: '07:00', delivery: '07:30', notes: '', status: 'planejado' },
    { id: 'exemplo-couve', crop: 'Couve', sale: 'Encomenda', customer: 'Restaurante da praça', quantity: '25 maços', date: addDays(today, 2), start: '13:00', end: '14:00', delivery: '16:00', notes: 'Entregar pela porta dos fundos', status: 'planejado' },
    { id: 'exemplo-mandioca', crop: 'Mandioca', sale: 'PNAE/PAA', customer: 'Escola municipal', quantity: '60 kg', date: addDays(today, 3), start: '07:00', end: '09:30', delivery: '11:00', notes: '', status: 'planejado' },
  ];
}

export function validatePlan(fields: PlanFields): FieldErrors {
  const errors: FieldErrors = {};
  const crop = fields.crop.trim();
  if (!crop) errors.crop = 'Informe a cultura.';
  else if (crop.length > LIMITS.crop) errors.crop = `Use até ${LIMITS.crop} caracteres.`;
  if (!(SALE_TYPES as readonly string[]).includes(fields.sale)) errors.sale = 'Escolha o tipo de venda.';
  if (fields.customer.trim().length > LIMITS.customer) errors.customer = `Use até ${LIMITS.customer} caracteres.`;
  if (fields.quantity.trim().length > LIMITS.quantity) errors.quantity = `Use até ${LIMITS.quantity} caracteres.`;
  if (fields.notes.trim().length > LIMITS.notes) errors.notes = `Use até ${LIMITS.notes} caracteres.`;
  if (!isISODate(fields.date)) errors.date = 'Informe uma data válida.';
  const start = minutes(fields.start), end = minutes(fields.end), delivery = minutes(fields.delivery);
  if (!Number.isFinite(start)) errors.start = 'Informe o início da colheita.';
  if (!Number.isFinite(end)) errors.end = 'Informe o fim da colheita.';
  else if (Number.isFinite(start) && start >= end) errors.end = 'O fim deve ser depois do início.';
  if (!Number.isFinite(delivery)) errors.delivery = 'Informe o horário da entrega.';
  else if (Number.isFinite(end) && delivery <= end) errors.delivery = 'A entrega deve ser depois do fim da colheita, no mesmo dia.';
  return errors;
}

function clean(fields: PlanFields): Omit<PlanFields, 'sale'> & { sale: SaleType } {
  if (Object.keys(validatePlan(fields)).length) throw new Error('Plano inválido');
  return {
    ...fields,
    sale: fields.sale as SaleType,
    crop: fields.crop.trim(),
    customer: fields.customer.trim(),
    quantity: fields.quantity.trim(),
    notes: fields.notes.trim(),
  };
}

function withoutAck(plan: Plan): Plan {
  const { ackedChance: _drop, ...rest } = plan;
  return rest;
}

/** Creates or edits a plan. Changing the date or harvest window clears any rain decision. */
export function savePlan(state: AppState, fields: PlanFields, id: string): AppState {
  const next = clean(fields);
  const existing = state.plans.find(p => p.id === id);
  if (!existing) return { ...state, plans: [...state.plans, { ...next, id, status: 'planejado' }] };
  const moved = existing.date !== next.date || existing.start !== next.start || existing.end !== next.end;
  const base = moved ? withoutAck(existing) : existing;
  return { ...state, plans: state.plans.map(p => (p.id === id ? { ...base, ...next } : p)) };
}

export function deletePlan(state: AppState, id: string): AppState {
  return { ...state, plans: state.plans.filter(p => p.id !== id) };
}

export function setStatus(state: AppState, id: string, status: PlanStatus): AppState {
  return { ...state, plans: state.plans.map(p => (p.id === id ? { ...p, status } : p)) };
}

/** Farmer keeps the plan despite the alert; re-alert only if the chance rises above this. */
export function keepPlan(state: AppState, id: string, chance: number): AppState {
  return { ...state, plans: state.plans.map(p => (p.id === id ? { ...p, ackedChance: chance } : p)) };
}

/** Moves the harvest window (e.g. to a suggested drier slot) and clears the old decision. */
export function moveHarvest(state: AppState, id: string, start: string, end: string): AppState {
  const plan = state.plans.find(p => p.id === id);
  if (!plan) return state;
  return savePlan(state, { ...fieldsOf(plan), start, end }, id);
}

export function updateSettings(state: AppState, settings: Partial<Settings>): AppState {
  return { ...state, settings: { ...state.settings, ...settings } };
}

export function addExamples(state: AppState, today: string): AppState {
  const ids = new Set(state.plans.map(p => p.id));
  return { ...state, plans: [...state.plans, ...examplePlans(today).filter(p => !ids.has(p.id))] };
}

// ---------- Plantings ----------

export function savePlanting(state: AppState, planting: Planting): AppState {
  if (!isPlanting(planting)) throw new Error('Plantio inválido');
  const exists = state.plantings.some(p => p.id === planting.id);
  return { ...state, plantings: exists ? state.plantings.map(p => (p.id === planting.id ? planting : p)) : [...state.plantings, planting] };
}

export function deletePlanting(state: AppState, id: string): AppState {
  return { ...state, plantings: state.plantings.filter(p => p.id !== id) };
}

export function setPlantingStatus(state: AppState, id: string, status: PlantingStatus): AppState {
  return { ...state, plantings: state.plantings.map(p => (p.id === id ? { ...p, status } : p)) };
}

export function sortedPlantings(state: AppState): Planting[] {
  const order = { plantado: 0, previsto: 1, colhido: 2 } as const;
  return [...state.plantings].sort((a, b) => order[a.status] - order[b.status] || a.plantDate.localeCompare(b.plantDate));
}

function isPlanting(value: unknown): value is Planting {
  if (!value || typeof value !== 'object') return false;
  const p = value as Record<string, unknown>;
  for (const key of ['id', 'crop', 'cropKey', 'plantDate', 'harvestFrom', 'harvestTo', 'status'] as const) if (typeof p[key] !== 'string' || !p[key]) return false;
  const v = p as unknown as Planting;
  return isISODate(v.plantDate) && isISODate(v.harvestFrom) && isISODate(v.harvestTo)
    && v.plantDate <= v.harvestFrom && v.harvestFrom <= v.harvestTo
    && v.crop.trim().length > 0 && v.crop.length <= LIMITS.crop
    && typeof p['irrigated'] === 'boolean' && typeof p['score'] === 'number' && v.score >= 0 && v.score <= 100
    && (PLANTING_STATUSES as readonly string[]).includes(v.status);
}

// ---------- Agenda views ----------

export type DayGroup = { date: string; plans: Plan[] };

/** Open work (not delivered yet), grouped by day in calendar order. */
export function upcomingGroups(state: AppState): DayGroup[] {
  const open = state.plans.filter(p => p.status !== 'entregue');
  open.sort((a, b) => `${a.date} ${a.start} ${a.delivery}`.localeCompare(`${b.date} ${b.start} ${b.delivery}`));
  const groups: DayGroup[] = [];
  for (const plan of open) {
    const last = groups.at(-1);
    if (last && last.date === plan.date) last.plans.push(plan);
    else groups.push({ date: plan.date, plans: [plan] });
  }
  return groups;
}

export function deliveredPlans(state: AppState): Plan[] {
  return state.plans
    .filter(p => p.status === 'entregue')
    .sort((a, b) => `${b.date} ${b.delivery}`.localeCompare(`${a.date} ${a.delivery}`));
}

// ---------- Persistence format ----------

function isPlace(value: unknown): value is Place {
  if (!value || typeof value !== 'object') return false;
  const p = value as Record<string, unknown>;
  return typeof p['name'] === 'string' && typeof p['region'] === 'string'
    && typeof p['latitude'] === 'number' && Math.abs(p['latitude']) <= 90
    && typeof p['longitude'] === 'number' && Math.abs(p['longitude']) <= 180;
}

function parseSettings(value: unknown): Settings {
  if (!value || typeof value !== 'object') throw new Error('Invalid settings');
  const s = value as Record<string, unknown>;
  const farmName = s['farmName'], location = s['location'], threshold = s['threshold'];
  if (typeof farmName !== 'string' || farmName.length > LIMITS.farmName) throw new Error('Invalid farm name');
  if (location !== null && !isPlace(location)) throw new Error('Invalid location');
  if (typeof threshold !== 'number' || threshold < 10 || threshold > 90) throw new Error('Invalid threshold');
  return { farmName, location: location as Place | null, threshold };
}

function parsePlan(value: unknown): Plan {
  if (!value || typeof value !== 'object') throw new Error('Invalid plan');
  const p = value as Record<string, unknown>;
  const keys = ['id', 'crop', 'sale', 'customer', 'quantity', 'date', 'start', 'end', 'delivery', 'notes', 'status'] as const;
  for (const key of keys) if (typeof p[key] !== 'string') throw new Error(`Invalid field ${key}`);
  const plan = p as unknown as Plan;
  if (!plan.id) throw new Error('Invalid id');
  if (Object.keys(validatePlan(plan)).length) throw new Error('Invalid plan');
  if (plan.crop !== plan.crop.trim()) throw new Error('Untrimmed crop');
  if (!(STATUSES as readonly string[]).includes(plan.status)) throw new Error('Invalid status');
  const acked = p['ackedChance'];
  if (acked !== undefined && (typeof acked !== 'number' || acked < 0 || acked > 100)) throw new Error('Invalid decision');
  const { ackedChance: _a, ...rest } = plan;
  const clean: Plan = {
    id: rest.id, crop: rest.crop, sale: rest.sale, customer: rest.customer, quantity: rest.quantity,
    date: rest.date, start: rest.start, end: rest.end, delivery: rest.delivery, notes: rest.notes, status: rest.status,
  };
  return typeof acked === 'number' ? { ...clean, ackedChance: acked } : clean;
}

export function parseState(raw: string): AppState {
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== 'object') throw new Error('Invalid state');
  const s = value as Record<string, unknown>;
  const version = s['version'];
  if ((version !== 2 && version !== 3) || !Array.isArray(s['plans'])) throw new Error('Invalid state');
  const settings = parseSettings(s['settings']);
  const ids = new Set<string>();
  const plans = (s['plans'] as unknown[]).map(item => {
    const plan = parsePlan(item);
    if (ids.has(plan.id)) throw new Error('Duplicate plan');
    ids.add(plan.id);
    return plan;
  });
  // Version 2 had no plantings; it is upgraded in place.
  const rawPlantings = version === 3 ? s['plantings'] : [];
  if (!Array.isArray(rawPlantings)) throw new Error('Invalid plantings');
  const plantingIds = new Set<string>();
  const plantings = rawPlantings.map(item => {
    if (!isPlanting(item)) throw new Error('Invalid planting');
    if (plantingIds.has(item.id)) throw new Error('Duplicate planting');
    plantingIds.add(item.id);
    const { id, crop, cropKey, plantDate, harvestFrom, harvestTo, irrigated, score, status } = item;
    return { id, crop, cropKey, plantDate, harvestFrom, harvestTo, irrigated, score, status };
  });
  return { version: 3, settings, plans, plantings };
}

/**
 * Converts the first demo format (fixed simulated forecast) into the current one.
 * Simulated decisions are dropped: they referred to a forecast that never existed.
 */
export function migrateV1(raw: string): AppState {
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== 'object') throw new Error('Invalid legacy state');
  const s = value as Record<string, unknown>;
  if (s['version'] !== 1 || !Array.isArray(s['plans'])) throw new Error('Invalid legacy state');
  const plans: Plan[] = [];
  for (const item of s['plans'] as unknown[]) {
    if (!item || typeof item !== 'object') continue;
    const p = item as Record<string, unknown>;
    const fields: PlanFields = {
      crop: String(p['crop'] ?? ''), sale: String(p['sale'] ?? '') as SaleType, customer: '', quantity: '',
      date: String(p['date'] ?? ''), start: String(p['start'] ?? ''), end: String(p['end'] ?? ''),
      delivery: String(p['delivery'] ?? ''), notes: '',
    };
    const id = typeof p['id'] === 'string' && p['id'] ? p['id'] : `migrado-${plans.length + 1}`;
    if (Object.keys(validatePlan(fields)).length || plans.some(x => x.id === id)) continue;
    plans.push({ ...clean(fields), id, status: 'planejado' });
  }
  return { version: 3, settings: defaultSettings(), plans, plantings: [] };
}

/** Reads whichever stored format exists. `null` means nothing was saved yet. */
export function loadStored(current: string | null, legacy: string | null): AppState | null {
  if (current !== null) return parseState(current);
  if (legacy !== null) return migrateV1(legacy);
  return null;
}
