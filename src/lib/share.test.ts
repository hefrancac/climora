import { describe, expect, it } from 'vitest';
import { makeForecast } from '@/test/forecast-fixture';
import { initialState, savePlan, setStatus, updateSettings, type PlanFields } from './harvest';
import { customerMessage, toICS, weekSummary, whatsappLink } from './share';

const fields: PlanFields = { crop: 'Couve', sale: 'Encomenda', customer: 'Restaurante da praça', quantity: '25 maços', date: '2026-12-02', start: '13:00', end: '14:00', delivery: '16:00', notes: 'Porta dos fundos; tocar, campainha' };

describe('Compartilhamento', () => {
  it('builds WhatsApp links with optional phone', () => {
    expect(whatsappLink('Olá & até já')).toBe('https://wa.me/?text=Ol%C3%A1%20%26%20at%C3%A9%20j%C3%A1');
    expect(whatsappLink('oi', '+55 (19) 99999-0000')).toBe('https://wa.me/5519999990000?text=oi');
  });
  it('writes a delivery confirmation for the buyer', () => {
    const plan = savePlan(initialState(), fields, 'p').plans[0]!;
    expect(customerMessage(plan, 'Sítio Boa Vista')).toBe('Olá, Restaurante da praça! Confirmando a entrega de 25 maços de couve no dia 02/12, às 16:00. — Sítio Boa Vista');
    expect(customerMessage({ ...plan, customer: '', quantity: '' }, '')).toBe('Olá! Confirmando a entrega de couve no dia 02/12, às 16:00.');
  });
  it('summarises the next seven days with rain flags', () => {
    let state = updateSettings(savePlan(initialState(), fields, 'a'), { farmName: 'Sítio Boa Vista' });
    state = savePlan(state, { ...fields, crop: 'Alface', sale: 'Feira', customer: '', date: '2026-12-01', start: '06:00', end: '07:00', delivery: '08:00' }, 'b');
    state = savePlan(state, { ...fields, date: '2026-12-20' }, 'far');
    const forecast = makeForecast('2026-12-01', 16, (d, h) => (d === '2026-12-02' && h >= 13 ? 70 : 10));
    expect(weekSummary(state, forecast, '2026-12-01')).toBe([
      '*Sítio Boa Vista* · agenda da semana',
      '• Hoje: Alface (Feira) colher 06:00–07:00, entregar 08:00 ☀️ 10%',
      '• Amanhã: Couve (Encomenda) colher 13:00–14:00, entregar 16:00 → Restaurante da praça ⚠️ chuva 70%',
      '',
      'Enviado pelo Climora',
    ].join('\n'));
    expect(weekSummary(initialState(), null, '2026-12-01')).toContain('Nenhuma colheita');
  });
  it('exports harvest and delivery events in floating local time', () => {
    let state = savePlan(initialState(), fields, 'p');
    state = setStatus(savePlan(state, { ...fields, crop: 'Alface' }, 'done'), 'done', 'entregue');
    const ics = toICS(state.plans, 'Sítio', new Date('2026-12-01T10:00:00Z'));
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(ics).toContain('DTSTART:20261202T130000\r\nDTEND:20261202T140000');
    expect(ics).toContain('DTSTART:20261202T160000\r\nDURATION:PT30M');
    expect(ics).toContain('DTSTAMP:20261201T100000Z');
    expect(ics.replace(/\r\n /g, '')).toContain('Porta dos fundos\\; tocar\\, campainha');
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2);
    expect(ics).not.toContain('Alface');
    for (const line of ics.split('\r\n')) expect(line.length).toBeLessThanOrEqual(75);
  });
});
