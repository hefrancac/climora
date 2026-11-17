import { CloudDrizzle, CloudLightning, CloudRain, CloudSun, Cloudy, MapPin, RefreshCw, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { relativeDay, shortDate } from '@/lib/dates';
import type { Place } from '@/lib/harvest';
import { ageLabel, upcomingDays, weatherLabel, type Forecast } from '@/lib/weather';
import type { ForecastStatus } from '@/hooks/use-forecast';

function DayIcon({ code, chance }: { code: number | null; chance: number | null }) {
  if (code !== null && code >= 95) return <CloudLightning />;
  if ((chance ?? 0) >= 60 || (code !== null && code >= 61)) return <CloudRain />;
  if (code !== null && code >= 51) return <CloudDrizzle />;
  if (code === 3) return <Cloudy />;
  if (code !== null && code >= 1) return <CloudSun />;
  return <Sun />;
}

type Props = { forecast: Forecast | null; status: ForecastStatus; error: string; place: Place | null; today: string; threshold: number; onRefresh: () => void; onSetPlace: () => void };

export function ForecastStrip({ forecast, status, error, place, today, threshold, onRefresh, onSetPlace }: Props) {
  if (!place) return <section className="forecast-panel forecast-empty" aria-label="Previsão">
    <MapPin /><div><p className="forecast-title">Onde fica a sua roça?</p><p className="forecast-details">Com a cidade definida, o Climora busca a chance de chuva hora a hora para os próximos 16 dias.</p></div>
    <Button onClick={onSetPlace}><MapPin />Definir localização</Button>
  </section>;
  const days = forecast ? upcomingDays(forecast, today, 7) : [];
  return <section className="forecast-panel" aria-label="Previsão dos próximos dias">
    <div className="forecast-head">
      <div>
        <p className="forecast-title">Chuva nos próximos dias</p>
        <p className="forecast-details">{place.name}{place.region ? `, ${place.region}` : ''} · {forecast ? `atualizada ${ageLabel(forecast.fetchedAt)}` : status === 'loading' ? 'buscando…' : 'sem dados'}</p>
      </div>
      <Button variant="outline" size="sm" onClick={onRefresh} disabled={status === 'loading'} aria-label="Atualizar previsão"><RefreshCw className={status === 'loading' ? 'spin' : ''} />Atualizar</Button>
    </div>
    {error && <p className="forecast-error" role="status">{error}</p>}
    {days.length > 0
      ? <ol className="day-strip">{days.map(d => <li key={d.date} className={`day${(d.chance ?? 0) >= threshold ? ' wet' : ''}`} title={weatherLabel(d.code)}>
        <span className="day-name">{relativeDay(d.date, today)}</span>
        <span className="day-date">{shortDate(d.date)}</span>
        <span className="day-icon"><DayIcon code={d.code} chance={d.chance} /></span>
        <span className="day-chance">{d.chance ?? '–'}%</span>
        <span className="day-mm">{d.mm !== null ? `${d.mm.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mm` : '–'}</span>
        <span className="day-temp">{d.tMin !== null && d.tMax !== null ? `${Math.round(d.tMin)}° / ${Math.round(d.tMax)}°` : ''}</span>
      </li>)}</ol>
      : status === 'loading' ? <div className="day-strip skeleton" aria-hidden="true">{Array.from({ length: 7 }, (_, i) => <span key={i} className="day" />)}</div> : null}
  </section>;
}
