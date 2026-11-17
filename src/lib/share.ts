// Sharing outputs: WhatsApp messages and calendar (.ics) export. Pure functions.
import { addDays, relativeDay, shortDate } from './dates';
import type { AppState, Plan } from './harvest';
import { assessPlan, type Forecast } from './weather';

export function whatsappLink(text: string, phone?: string): string {
  const digits = (phone ?? '').replace(/\D/g, '');
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

/** Message to the buyer confirming (or rescheduling) a delivery. */
export function customerMessage(plan: Plan, farmName: string): string {
  const who = plan.customer ? `Olá, ${plan.customer}!` : 'Olá!';
  const what = plan.quantity ? `${plan.quantity} de ${plan.crop.toLowerCase()}` : plan.crop.toLowerCase();
  const from = farmName ? ` — ${farmName}` : '';
  return `${who} Confirmando a entrega de ${what} no dia ${shortDate(plan.date)}, às ${plan.delivery}.${from}`;
}

/** Weekly summary the farmer can send to a family group, partner or cooperative. */
export function weekSummary(state: AppState, forecast: Forecast | null, today: string): string {
  const until = addDays(today, 6);
  const plans = state.plans
    .filter(p => p.status !== 'entregue' && p.date >= today && p.date <= until)
    .sort((a, b) => `${a.date} ${a.start}`.localeCompare(`${b.date} ${b.start}`));
  const title = state.settings.farmName ? `*${state.settings.farmName}* · agenda da semana` : '*Agenda da semana*';
  if (!plans.length) return `${title}\nNenhuma colheita planejada para os próximos 7 dias.`;
  const lines = plans.map(p => {
    const a = assessPlan(forecast, p, state.settings.threshold);
    const rain = a.kind === 'alerta' ? ` ⚠️ chuva ${a.risk.maxChance}%` : a.kind === 'ok' ? ` ☀️ ${a.risk.maxChance}%` : '';
    const buyer = p.customer ? ` → ${p.customer}` : '';
    return `• ${relativeDay(p.date, today)}: ${p.crop} (${p.sale}) colher ${p.start}–${p.end}, entregar ${p.delivery}${buyer}${rain}`;
  });
  return [title, ...lines, '', 'Enviado pelo Climora'].join('\n');
}

// ---------- iCalendar ----------

function icsText(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

/** Floating local time (no timezone): the event shows at the same wall-clock time everywhere. */
function icsLocal(date: string, time: string): string {
  return `${date.replace(/-/g, '')}T${time.replace(':', '')}00`;
}

function icsStamp(now: Date): string {
  return now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/** Folds lines longer than 75 octets as RFC 5545 requires (approximated by characters). */
function fold(line: string): string {
  const parts: string[] = [];
  let rest = line;
  while (rest.length > 74) { parts.push(rest.slice(0, 74)); rest = ` ${rest.slice(74)}`; }
  parts.push(rest);
  return parts.join('\r\n');
}

export function toICS(plans: Plan[], farmName: string, now: Date = new Date()): string {
  const stamp = icsStamp(now);
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Climora//Agenda de colheitas//PT-BR', 'CALSCALE:GREGORIAN', `X-WR-CALNAME:${icsText(farmName || 'Climora')}`];
  for (const p of plans.filter(x => x.status !== 'entregue')) {
    const details = [p.quantity && `Quantidade: ${p.quantity}`, p.customer && `Cliente: ${p.customer}`, p.notes].filter(Boolean).join('\n');
    lines.push(
      'BEGIN:VEVENT', `UID:${p.id}-colheita@climora`, `DTSTAMP:${stamp}`,
      `DTSTART:${icsLocal(p.date, p.start)}`, `DTEND:${icsLocal(p.date, p.end)}`,
      `SUMMARY:${icsText(`Colher ${p.crop}`)}`, `DESCRIPTION:${icsText(details)}`, 'END:VEVENT',
      'BEGIN:VEVENT', `UID:${p.id}-entrega@climora`, `DTSTAMP:${stamp}`,
      `DTSTART:${icsLocal(p.date, p.delivery)}`, 'DURATION:PT30M',
      `SUMMARY:${icsText(`Entregar ${p.crop} · ${p.sale}${p.customer ? ` · ${p.customer}` : ''}`)}`, `DESCRIPTION:${icsText(details)}`, 'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}
