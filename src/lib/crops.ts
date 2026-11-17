// Crop profiles used to judge planting seasons from a location's climate.
// Values are general agronomic references (temperature ranges in daily mean °C,
// cycle from sowing/planting to first harvest), in the spirit of FAO ECOCROP and
// Brazilian extension material. They are not calibrated by cultivar or region:
// the app always tells farmers to confirm with ZARC/Embrapa/ATER.

export const GROUPS = {
  folhosa: 'Folhosas e temperos',
  fruto: 'Hortaliças de fruto',
  raiz: 'Raízes, tubérculos e bulbos',
  grao: 'Grãos e leguminosas',
  fruta: 'Frutas e culturas perenes',
} as const;
export type GroupKey = keyof typeof GROUPS;

/** 0 = tolera geada, 1 = sofre com geada forte, 2 = muito sensível. */
export type FrostSensitivity = 0 | 1 | 2;
export type WaterNeed = 'baixa' | 'media' | 'alta';

export type Crop = {
  key: string;
  name: string;
  aliases: readonly string[];
  group: GroupKey;
  /** Days from sowing/planting to the first harvest, at favourable temperature. */
  cycle: readonly [number, number];
  /** How the cycle is counted. */
  start: string;
  /** Daily mean temperature: tolerable minimum, optimal range, tolerable maximum. */
  temp: readonly [number, number, number, number];
  frost: FrostSensitivity;
  water: WaterNeed;
  /** Grain and bulbs need dry weather at harvest. */
  dryHarvest?: boolean;
  /** Leaves and fruits that suffer with prolonged heavy rain (disease, rot, splitting). */
  rainSensitive?: boolean;
  /** Perennials and long cycles: the season is judged on the establishment months only. */
  establish?: number;
};

const c = (key: string, name: string, group: GroupKey, cycle: [number, number], start: string, temp: [number, number, number, number], frost: FrostSensitivity, water: WaterNeed, extra: Partial<Pick<Crop, 'aliases' | 'dryHarvest' | 'rainSensitive' | 'establish'>> = {}): Crop =>
  ({ key, name, group, cycle, start, temp, frost, water, aliases: extra.aliases ?? [], ...extra });

const SEM = 'semeadura';
const MUDA = 'plantio da muda';

export const CROPS: readonly Crop[] = [
  // Folhosas e temperos
  c('alface', 'Alface', 'folhosa', [60, 80], SEM, [6, 15, 22, 29], 1, 'alta', { rainSensitive: true }),
  c('couve', 'Couve', 'folhosa', [80, 110], SEM, [3, 15, 22, 30], 0, 'media', { aliases: ['couve-manteiga'] }),
  c('repolho', 'Repolho', 'folhosa', [90, 120], SEM, [3, 15, 20, 28], 0, 'media'),
  c('rucula', 'Rúcula', 'folhosa', [35, 50], SEM, [6, 15, 22, 29], 1, 'media', { rainSensitive: true }),
  c('espinafre', 'Espinafre', 'folhosa', [50, 70], SEM, [4, 14, 20, 27], 0, 'media'),
  c('agriao', 'Agrião', 'folhosa', [50, 70], SEM, [8, 15, 22, 28], 1, 'alta'),
  c('chicoria', 'Chicória', 'folhosa', [70, 90], SEM, [5, 15, 22, 28], 1, 'media', { aliases: ['escarola', 'almeirão'] }),
  c('brocolis', 'Brócolis', 'folhosa', [90, 110], SEM, [4, 15, 20, 27], 0, 'media'),
  c('couveflor', 'Couve-flor', 'folhosa', [100, 130], SEM, [5, 15, 20, 26], 1, 'media'),
  c('cebolinha', 'Cebolinha', 'folhosa', [70, 90], SEM, [8, 15, 25, 31], 0, 'media', { aliases: ['cheiro-verde'] }),
  c('salsa', 'Salsa', 'folhosa', [70, 90], SEM, [7, 15, 24, 30], 0, 'media', { aliases: ['salsinha'] }),
  c('coentro', 'Coentro', 'folhosa', [45, 60], SEM, [10, 18, 28, 34], 2, 'media'),
  c('manjericao', 'Manjericão', 'folhosa', [60, 80], SEM, [12, 20, 28, 35], 2, 'media'),
  c('hortela', 'Hortelã', 'folhosa', [60, 90], MUDA, [8, 15, 25, 31], 1, 'alta'),
  // Hortaliças de fruto
  c('tomate', 'Tomate', 'fruto', [100, 130], SEM, [10, 20, 26, 32], 2, 'media', { rainSensitive: true }),
  c('pimentao', 'Pimentão', 'fruto', [110, 140], SEM, [12, 21, 28, 34], 2, 'media', { rainSensitive: true }),
  c('pimenta', 'Pimenta', 'fruto', [100, 140], SEM, [12, 21, 30, 35], 2, 'media'),
  c('berinjela', 'Berinjela', 'fruto', [100, 130], SEM, [14, 22, 30, 35], 2, 'media'),
  c('jilo', 'Jiló', 'fruto', [90, 110], SEM, [15, 22, 32, 37], 2, 'media'),
  c('pepino', 'Pepino', 'fruto', [50, 70], SEM, [13, 20, 30, 35], 2, 'media', { rainSensitive: true }),
  c('abobrinha', 'Abobrinha', 'fruto', [45, 60], SEM, [12, 20, 28, 34], 2, 'media'),
  c('abobora', 'Abóbora', 'fruto', [90, 120], SEM, [12, 20, 30, 35], 2, 'media', { aliases: ['moranga', 'jerimum', 'cabotiá'] }),
  c('quiabo', 'Quiabo', 'fruto', [60, 80], SEM, [16, 22, 32, 38], 2, 'media'),
  c('maxixe', 'Maxixe', 'fruto', [60, 75], SEM, [16, 22, 32, 38], 2, 'baixa'),
  c('chuchu', 'Chuchu', 'fruto', [100, 120], 'plantio do fruto-semente', [12, 18, 27, 32], 2, 'media'),
  c('vagem', 'Vagem', 'fruto', [60, 75], SEM, [12, 18, 26, 32], 2, 'media', { aliases: ['feijão-vagem'] }),
  c('ervilha', 'Ervilha', 'fruto', [70, 90], SEM, [5, 13, 20, 26], 0, 'media'),
  c('milhoverde', 'Milho verde', 'fruto', [80, 100], SEM, [10, 18, 28, 34], 2, 'media'),
  c('melancia', 'Melancia', 'fruto', [80, 110], SEM, [16, 22, 30, 36], 2, 'media', { rainSensitive: true }),
  c('melao', 'Melão', 'fruto', [80, 100], SEM, [16, 24, 32, 38], 2, 'media', { rainSensitive: true }),
  c('morango', 'Morango', 'fruto', [80, 120], MUDA, [5, 15, 22, 28], 1, 'media', { rainSensitive: true }),
  // Raízes, tubérculos e bulbos
  c('cenoura', 'Cenoura', 'raiz', [90, 110], SEM, [5, 16, 22, 28], 0, 'media'),
  c('beterraba', 'Beterraba', 'raiz', [60, 80], SEM, [5, 15, 22, 28], 0, 'media'),
  c('rabanete', 'Rabanete', 'raiz', [25, 35], SEM, [5, 15, 20, 27], 0, 'media'),
  c('nabo', 'Nabo', 'raiz', [50, 70], SEM, [5, 15, 20, 27], 0, 'media'),
  c('batata', 'Batata', 'raiz', [90, 120], 'plantio da batata-semente', [5, 15, 20, 26], 1, 'media', { aliases: ['batata-inglesa'], dryHarvest: true }),
  c('batatadoce', 'Batata-doce', 'raiz', [120, 150], 'plantio das ramas', [15, 22, 30, 35], 2, 'baixa'),
  c('mandioca', 'Mandioca', 'raiz', [300, 540], 'plantio das manivas', [14, 22, 30, 35], 1, 'baixa', { aliases: ['aipim', 'macaxeira'], establish: 120 }),
  c('inhame', 'Inhame', 'raiz', [240, 300], 'plantio das túberas', [18, 24, 30, 35], 2, 'media', { aliases: ['cará'], establish: 120 }),
  c('gengibre', 'Gengibre', 'raiz', [240, 300], 'plantio dos rizomas', [18, 24, 30, 35], 2, 'alta', { establish: 120 }),
  c('cebola', 'Cebola', 'raiz', [120, 160], SEM, [8, 13, 24, 30], 0, 'media', { dryHarvest: true }),
  c('alho', 'Alho', 'raiz', [150, 180], 'plantio dos bulbilhos', [3, 12, 20, 26], 0, 'media', { dryHarvest: true }),
  // Grãos e leguminosas
  c('feijao', 'Feijão', 'grao', [80, 100], SEM, [12, 18, 26, 32], 2, 'media', { aliases: ['feijão-carioca', 'feijão-preto'], dryHarvest: true, rainSensitive: true }),
  c('caupi', 'Feijão-caupi', 'grao', [65, 90], SEM, [16, 22, 32, 37], 2, 'baixa', { aliases: ['feijão-de-corda', 'feijão-verde', 'feijão-macassar'], dryHarvest: true }),
  c('milho', 'Milho (grão)', 'grao', [110, 140], SEM, [10, 18, 28, 34], 2, 'media', { aliases: ['milho'], dryHarvest: true }),
  c('soja', 'Soja', 'grao', [100, 130], SEM, [13, 20, 30, 35], 2, 'media', { dryHarvest: true }),
  c('arroz', 'Arroz', 'grao', [100, 140], SEM, [15, 22, 30, 35], 2, 'alta', { aliases: ['arroz de sequeiro'], dryHarvest: true }),
  c('trigo', 'Trigo', 'grao', [110, 140], SEM, [3, 10, 20, 27], 0, 'media', { dryHarvest: true, rainSensitive: true }),
  c('aveia', 'Aveia', 'grao', [110, 140], SEM, [2, 10, 20, 27], 0, 'media', { dryHarvest: true }),
  c('sorgo', 'Sorgo', 'grao', [100, 130], SEM, [14, 24, 32, 38], 2, 'baixa', { dryHarvest: true }),
  c('amendoim', 'Amendoim', 'grao', [100, 130], SEM, [16, 22, 30, 35], 2, 'baixa', { dryHarvest: true }),
  c('girassol', 'Girassol', 'grao', [90, 120], SEM, [8, 18, 28, 34], 1, 'baixa', { dryHarvest: true }),
  c('graodebico', 'Grão-de-bico', 'grao', [100, 120], SEM, [8, 15, 25, 30], 1, 'baixa', { dryHarvest: true }),
  c('gergelim', 'Gergelim', 'grao', [90, 120], SEM, [18, 25, 32, 38], 2, 'baixa', { dryHarvest: true }),
  c('algodao', 'Algodão', 'grao', [150, 180], SEM, [16, 22, 32, 38], 2, 'media', { dryHarvest: true }),
  // Frutas e perenes: judged on establishment; cycle is the first harvest.
  c('banana', 'Banana', 'fruta', [365, 450], MUDA, [14, 24, 30, 35], 2, 'alta', { establish: 120 }),
  c('mamao', 'Mamão', 'fruta', [270, 330], MUDA, [16, 22, 30, 35], 2, 'media', { establish: 90 }),
  c('maracuja', 'Maracujá', 'fruta', [240, 300], MUDA, [15, 21, 30, 34], 2, 'media', { establish: 90 }),
  c('abacaxi', 'Abacaxi', 'fruta', [450, 600], 'plantio da muda (filhote)', [16, 22, 30, 35], 2, 'baixa', { establish: 120 }),
  c('laranja', 'Laranja', 'fruta', [1095, 1460], MUDA, [12, 22, 30, 36], 1, 'media', { aliases: ['citros', 'tangerina', 'mexerica', 'bergamota'], establish: 120 }),
  c('limao', 'Limão', 'fruta', [730, 1095], MUDA, [12, 22, 30, 36], 1, 'media', { establish: 120 }),
  c('cafe', 'Café', 'fruta', [730, 1095], MUDA, [10, 18, 23, 30], 2, 'media', { establish: 120 }),
  c('cana', 'Cana-de-açúcar', 'fruta', [365, 540], 'plantio dos toletes', [15, 22, 32, 38], 1, 'alta', { establish: 120 }),
  c('manga', 'Manga', 'fruta', [1095, 1825], MUDA, [15, 24, 30, 38], 2, 'baixa', { establish: 120 }),
  c('abacate', 'Abacate', 'fruta', [1095, 1460], MUDA, [12, 20, 28, 33], 1, 'media', { establish: 120 }),
  c('goiaba', 'Goiaba', 'fruta', [545, 730], MUDA, [15, 22, 30, 36], 2, 'media', { establish: 90 }),
  c('acerola', 'Acerola', 'fruta', [545, 730], MUDA, [15, 24, 30, 35], 2, 'media', { establish: 90 }),
  c('uva', 'Uva', 'fruta', [545, 730], MUDA, [10, 20, 28, 35], 1, 'media', { establish: 90 }),
  c('pitaya', 'Pitaya', 'fruta', [365, 545], MUDA, [15, 20, 30, 35], 2, 'baixa', { establish: 90 }),
  c('coco', 'Coco', 'fruta', [730, 1095], MUDA, [18, 24, 30, 35], 2, 'alta', { aliases: ['coqueiro'], establish: 120 }),
  c('acai', 'Açaí', 'fruta', [1095, 1460], MUDA, [20, 24, 30, 35], 2, 'alta', { establish: 120 }),
];

/** Templates for crops not in the list: the farmer picks the closest type and the cycle. */
export const TEMPLATES = {
  'folhosa-amena': { label: 'Folha ou tempero de clima ameno (ex.: alface, salsa)', base: 'alface' },
  'fruto-quente': { label: 'Hortaliça de fruto de clima quente (ex.: tomate, abóbora)', base: 'abobora' },
  'raiz-amena': { label: 'Raiz ou bulbo de clima ameno (ex.: cenoura, beterraba)', base: 'cenoura' },
  'raiz-quente': { label: 'Raiz ou tubérculo de clima quente (ex.: batata-doce)', base: 'batatadoce' },
  'grao-verao': { label: 'Grão de verão (ex.: feijão, milho)', base: 'feijao' },
  'grao-inverno': { label: 'Grão de inverno (ex.: trigo, aveia)', base: 'trigo' },
  'fruta-tropical': { label: 'Fruta ou planta perene tropical (ex.: banana, mamão)', base: 'mamao' },
} as const;
export type TemplateKey = keyof typeof TEMPLATES;

export function customCrop(name: string, template: TemplateKey, cycleDays: number): Crop {
  const base = cropByKey(TEMPLATES[template].base);
  if (!base) throw new Error('Template missing');
  const days = Math.max(20, Math.min(2000, Math.round(cycleDays)));
  const spread = Math.max(5, Math.round(days * 0.15));
  return { ...base, key: `custom:${normalize(name)}`, name: name.trim(), aliases: [], cycle: [days, days + spread] };
}

export function normalize(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export function cropByKey(key: string): Crop | undefined {
  return CROPS.find(crop => crop.key === key);
}

/** Accent-insensitive search on names and regional names; best matches first. */
export function searchCrops(query: string, limit = 8): Crop[] {
  const q = normalize(query);
  if (!q) return [];
  const scored: { crop: Crop; score: number }[] = [];
  for (const crop of CROPS) {
    let best = Infinity;
    for (const [i, label] of [crop.name, ...crop.aliases].entries()) {
      const n = normalize(label);
      const rank = n === q ? 0 : n.startsWith(q) ? 1 : n.split(' ').some(w => w.startsWith(q)) ? 2 : n.includes(q) ? 3 : Infinity;
      best = Math.min(best, rank + (i > 0 ? 0.5 : 0));
    }
    if (best < Infinity) scored.push({ crop, score: best });
  }
  return scored.sort((a, b) => a.score - b.score || a.crop.name.localeCompare(b.crop.name)).slice(0, limit).map(s => s.crop);
}

export const POPULAR = ['alface', 'tomate', 'feijao', 'milho', 'mandioca', 'cenoura', 'abobora', 'banana'] as const;
