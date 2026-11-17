import { minutes } from '@/lib/dates';
import type { HourPoint } from '@/lib/weather';

/** Hour-by-hour rain chance around a plan; the harvest hours are highlighted. */
export function HourBars({ hours, start, end, delivery, alert }: { hours: HourPoint[]; start: string; end: string; delivery: string; alert: boolean }) {
  const s = minutes(start), e = minutes(end);
  const deliveryHour = Math.floor(minutes(delivery) / 60);
  if (!hours.length) return null;
  return <div className="hour-bars" role="img" aria-label={`Chance de chuva por hora: ${hours.map(h => `${h.time.slice(11, 13)}h ${h.chance ?? '?'}%`).join(', ')}`}>
    {hours.map(h => {
      const slot = minutes(h.time.slice(11, 16));
      const inWindow = slot < e && slot + 60 > s;
      const isDelivery = Math.floor(slot / 60) === deliveryHour;
      const chance = h.chance ?? 0;
      return <div key={h.time} className={`hour${inWindow ? ' in-window' : ''}${inWindow && alert ? ' risky' : ''}${isDelivery ? ' delivery' : ''}`}>
        <span className="hour-value">{h.chance === null ? '–' : `${chance}`}</span>
        <span className="hour-track"><span className="hour-fill" style={{ height: `${Math.max(4, chance)}%` }} /></span>
        <span className="hour-label">{h.time.slice(11, 13)}h</span>
      </div>;
    })}
  </div>;
}
