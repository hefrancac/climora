import { ArrowRight, Check, Clock3, CloudRain, Droplets, MessageCircle, PackageCheck, Pencil, ShoppingBasket, Sun, Truck, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HourBars } from '@/components/hour-bars';
import { dateLabel, shortDate } from '@/lib/dates';
import { STATUS_LABEL, type Plan } from '@/lib/harvest';
import { customerMessage, whatsappLink } from '@/lib/share';
import { contextHours, type Assessment, type Forecast } from '@/lib/weather';

type Props = {
  plan: Plan;
  assessment: Assessment;
  forecast: Forecast | null;
  farmName: string;
  onEdit: () => void;
  onKeep: (chance: number) => void;
  onApply: (start: string, end: string) => void;
  onStatus: (status: Plan['status']) => void;
};

function missingText(a: Extract<Assessment, { kind: 'sem-previsao' }>): string {
  switch (a.reason) {
    case 'sem-local': return 'Defina a localização da propriedade para ver a chuva';
    case 'carregando': return 'Buscando previsão…';
    case 'passado': return 'Data já passou';
    case 'distante': return a.availableFrom ? `Previsão disponível a partir de ${shortDate(a.availableFrom)}` : 'Data além do alcance da previsão';
    default: return 'Sem previsão para este horário';
  }
}

export function PlanCard({ plan, assessment: a, forecast, farmName, onEdit, onKeep, onApply, onStatus }: Props) {
  const alert = a.kind === 'alerta';
  const delivered = plan.status === 'entregue';
  const hours = forecast && a.kind !== 'sem-previsao' ? contextHours(forecast, plan) : [];
  return <article className={`plan-card${alert && !a.kept ? ' attention' : ''}${delivered ? ' delivered' : ''}`} aria-label={`${plan.crop}, ${plan.sale}, ${dateLabel(plan.date)}`}>
    <div className="card-body">
      <div className="card-topline">
        <span className="sale-tag"><ShoppingBasket size={13} />{plan.sale}</span>
        <span className={`status-chip status-${plan.status}`}>{STATUS_LABEL[plan.status]}</span>
      </div>
      <div className="crop-line">
        <h3 className="crop-name">{plan.crop}</h3>
        {plan.quantity && <span className="crop-qty">{plan.quantity}</span>}
      </div>
      {plan.customer && <p className="card-customer"><User size={13} />{plan.customer}</p>}
      <div className="schedule">
        <div className="schedule-item"><span className="schedule-label"><Clock3 size={14} />Colheita</span><span className="schedule-time">{plan.start} – {plan.end}</span></div>
        <div className="schedule-item"><span className="schedule-label"><Truck size={15} />Entrega</span><span className="schedule-time">{plan.delivery}</span></div>
      </div>
      {plan.notes && <p className="card-notes">{plan.notes}</p>}
      {!delivered && <div className={`weather ${alert ? (a.kept ? 'weather-kept' : 'weather-alert') : a.kind === 'ok' ? 'weather-calm' : 'weather-missing'}`}>
        {a.kind === 'sem-previsao'
          ? <div className="weather-title"><Droplets size={17} /><span>{missingText(a)}</span></div>
          : <>
            <div className="weather-title">
              {alert ? <CloudRain size={17} /> : <Sun size={17} />}
              <span>{alert ? (a.kept ? 'Chuva prevista · plano mantido' : 'Atenção à chuva na colheita') : 'Colheita sem alerta de chuva'}</span>
              <span className="weather-chance">{a.risk.maxChance}%</span>
            </div>
            <p className="weather-note">Maior chance de chuva na janela{a.risk.totalMm > 0 ? ` · até ${a.risk.totalMm.toLocaleString('pt-BR')} mm` : ''}</p>
            <HourBars hours={hours} start={plan.start} end={plan.end} delivery={plan.delivery} alert={alert} />
          </>}
      </div>}
    </div>
    {alert && !a.kept && !delivered && <div className="alert-detail">
      {a.rose && <p className="alert-rose">A chance subiu desde que você decidiu manter o plano.</p>}
      {a.suggestion
        ? <div className="suggestion"><div><span className="suggestion-label">Horário mais seco antes da entrega</span><strong>{a.suggestion.start} – {a.suggestion.end} · {a.suggestion.maxChance}%</strong></div><Button size="sm" onClick={() => onApply(a.suggestion!.start, a.suggestion!.end)}><ArrowRight />Usar este horário</Button></div>
        : <p>Nenhum horário mais seco antes da entrega neste dia. Considere colher na véspera ou combinar outro horário com o cliente.</p>}
    </div>}
    <div className="card-actions">
      <Button variant="ghost" size="sm" onClick={onEdit}><Pencil />Editar</Button>
      <div className="card-actions-right">
        {plan.customer && !delivered && <Button variant="ghost" size="sm" asChild><a href={whatsappLink(customerMessage(plan, farmName))} target="_blank" rel="noreferrer"><MessageCircle />Avisar cliente</a></Button>}
        {alert && !a.kept && !delivered && <Button variant="outline" size="sm" onClick={() => onKeep(a.risk.maxChance)}><Check />Manter plano</Button>}
        {plan.status === 'planejado' && !(alert && !a.kept) && <Button variant="outline" size="sm" onClick={() => onStatus('colhido')}><Check />Colhido</Button>}
        {plan.status === 'colhido' && <Button variant="outline" size="sm" onClick={() => onStatus('entregue')}><PackageCheck />Entregue</Button>}
        {delivered && <Button variant="ghost" size="sm" onClick={() => onStatus('planejado')}>Reabrir</Button>}
      </div>
    </div>
  </article>;
}
