import { useState } from 'react';
import { CalendarPlus, Check, CloudRain, MessageCircle, Plus, Sparkles, Wheat } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ForecastStrip } from '@/components/forecast-strip';
import { PlanCard } from '@/components/plan-card';
import { dayMonth, relativeDay } from '@/lib/dates';
import { deliveredPlans, upcomingGroups, type AppState, type Plan } from '@/lib/harvest';
import { toICS, weekSummary, whatsappLink } from '@/lib/share';
import type { Assessment, Forecast } from '@/lib/weather';
import type { ForecastStatus } from '@/hooks/use-forecast';

type Props = {
  state: AppState;
  today: string;
  forecast: Forecast | null;
  forecastStatus: ForecastStatus;
  forecastError: string;
  assessments: Map<string, Assessment>;
  alertCount: number;
  onRefresh: () => void;
  onSetPlace: () => void;
  onNew: () => void;
  onEdit: (plan: Plan) => void;
  onKeep: (plan: Plan, chance: number) => void;
  onApply: (plan: Plan, start: string, end: string) => void;
  onStatus: (plan: Plan, status: Plan['status']) => void;
  onExamples: () => void;
  onDownload: (name: string, content: string, type: string) => void;
};

/** Harvest and delivery agenda with the hour-by-hour rain forecast (next 16 days). */
export function HarvestAgenda(p: Props) {
  const [tab, setTab] = useState<'proximas' | 'entregues'>('proximas');
  const groups = upcomingGroups(p.state);
  const delivered = deliveredPlans(p.state);
  const place = p.state.settings.location;
  return <>
    <ForecastStrip forecast={p.forecast} status={p.forecastStatus} error={p.forecastError} place={place} today={p.today} threshold={p.state.settings.threshold} onRefresh={p.onRefresh} onSetPlace={p.onSetPlace} />

    {p.alertCount > 0 && tab === 'proximas' && <div className="alert-banner" role="status"><CloudRain size={20} /><div><strong>{p.alertCount === 1 ? 'Uma colheita pede atenção' : `${p.alertCount} colheitas pedem atenção`}</strong><span>Veja o horário mais seco sugerido em cada cartão ou mantenha o plano.</span></div></div>}

    <div className="agenda-toolbar">
      <div className="tabs" role="tablist" aria-label="Colheitas">
        <button role="tab" aria-selected={tab === 'proximas'} className={tab === 'proximas' ? 'active' : ''} onClick={() => setTab('proximas')}>Próximas <span className="count">{groups.reduce((n, g) => n + g.plans.length, 0)}</span></button>
        <button role="tab" aria-selected={tab === 'entregues'} className={tab === 'entregues' ? 'active' : ''} onClick={() => setTab('entregues')}>Entregues <span className="count">{delivered.length}</span></button>
      </div>
      <div className="share-actions">
        {p.state.plans.length > 0 && <>
          <Button variant="outline" size="sm" asChild><a href={whatsappLink(weekSummary(p.state, p.forecast, p.today))} target="_blank" rel="noreferrer"><MessageCircle />Semana no WhatsApp</a></Button>
          <Button variant="outline" size="sm" onClick={() => p.onDownload('climora-agenda.ics', toICS(p.state.plans, p.state.settings.farmName), 'text/calendar')}><CalendarPlus />Calendário</Button>
        </>}
        <Button size="sm" onClick={p.onNew}><Plus />Nova colheita</Button>
      </div>
    </div>

    {tab === 'proximas' ? (groups.length ? groups.map(group => <section key={group.date} className="day-group" aria-label={relativeDay(group.date, p.today)}>
      <h2 className={`day-heading${p.today && group.date < p.today ? ' overdue' : ''}`}>{relativeDay(group.date, p.today)}<span>{dayMonth(group.date)}{p.today && group.date < p.today ? ' · pendente' : ''}</span></h2>
      <div className="plan-grid">{group.plans.map(plan => <PlanCard key={plan.id} plan={plan} assessment={p.assessments.get(plan.id) ?? { kind: 'sem-previsao', reason: 'carregando' }} forecast={p.forecast} farmName={p.state.settings.farmName}
        onEdit={() => p.onEdit(plan)} onKeep={chance => p.onKeep(plan, chance)} onApply={(start, end) => p.onApply(plan, start, end)} onStatus={next => p.onStatus(plan, next)} />)}</div>
    </section>)
      : <div className="empty-state"><Wheat size={32} /><h3>Nenhuma colheita agendada</h3><p>Quando a colheita estiver perto, anote o dia, o horário e a entrega. O Climora confere a chuva hora a hora e sugere o horário mais seco.</p><div className="empty-actions"><Button onClick={p.onNew}><Plus />Nova colheita</Button><Button variant="outline" onClick={p.onExamples} disabled={!p.today}><Sparkles />Ver com exemplos</Button></div></div>)
      : (delivered.length ? <div className="plan-grid">{delivered.map(plan => <PlanCard key={plan.id} plan={plan} assessment={{ kind: 'sem-previsao', reason: 'passado' }} forecast={null} farmName={p.state.settings.farmName} onEdit={() => p.onEdit(plan)} onKeep={() => {}} onApply={() => {}} onStatus={next => p.onStatus(plan, next)} />)}</div>
        : <div className="empty-state"><Check size={32} /><h3>Nenhuma entrega registrada ainda</h3><p>Marque as colheitas como entregues para montar o seu histórico.</p></div>)}
  </>;
}
