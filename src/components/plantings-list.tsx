import { useState } from 'react';
import { CalendarClock, Check, Droplets, Sprout, Trash2, Wheat } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { daysBetween, shortFullDate } from '@/lib/dates';
import { RATING_LABEL, rating } from '@/lib/suitability';
import type { Planting, PlantingStatus } from '@/lib/harvest';

type Props = {
  plantings: Planting[];
  today: string;
  onStatus: (id: string, status: PlantingStatus) => void;
  onDelete: (id: string) => void;
  onScheduleHarvest: (planting: Planting) => void;
  onPlan: () => void;
};

function stage(p: Planting, today: string): { label: string; progress: number; tone: 'wait' | 'grow' | 'ready' | 'done' } {
  if (p.status === 'colhido') return { label: 'Colhido', progress: 1, tone: 'done' };
  const total = Math.max(1, daysBetween(p.plantDate, p.harvestFrom));
  const elapsed = daysBetween(p.plantDate, today);
  if (elapsed < 0) return { label: elapsed === -1 ? 'Plantar amanhã' : `Plantar em ${-elapsed} dias`, progress: 0, tone: 'wait' };
  if (today >= p.harvestFrom) return { label: today > p.harvestTo ? 'Colheita atrasada' : 'Época de colher', progress: 1, tone: 'ready' };
  return { label: `Crescendo · colheita em ${daysBetween(today, p.harvestFrom)} dias`, progress: elapsed / total, tone: 'grow' };
}

export function PlantingsList({ plantings, today, onStatus, onDelete, onScheduleHarvest, onPlan }: Props) {
  const [confirm, setConfirm] = useState<string | null>(null);
  if (!plantings.length) return <div className="empty-state"><Sprout size={32} /><h3>Nenhuma plantação salva</h3><p>Escolha uma cultura em Planejar, veja as melhores épocas e salve a data do plantio aqui.</p><div className="empty-actions"><Button onClick={onPlan}><Sprout />Planejar um plantio</Button></div></div>;
  return <div className="planting-grid">{plantings.map(p => {
    const s = stage(p, today);
    const r = rating(p.score);
    return <article key={p.id} className={`planting-card tone-${s.tone}`}>
      <div className="card-topline">
        <span className={`rating-chip r-${r}`}>Época {RATING_LABEL[r].toLowerCase()}</span>
        {p.irrigated && <span className="sale-tag"><Droplets size={13} />Irrigado</span>}
      </div>
      <h3 className="crop-name">{p.crop}</h3>
      <p className={`stage stage-${s.tone}`}>{s.label}</p>
      <div className="progress" aria-hidden="true"><span style={{ width: `${Math.round(s.progress * 100)}%` }} /></div>
      <div className="schedule">
        <div className="schedule-item"><span className="schedule-label"><Sprout size={14} />Plantio</span><span className="schedule-time small">{shortFullDate(p.plantDate)}</span></div>
        <div className="schedule-item"><span className="schedule-label"><Wheat size={14} />Colheita</span><span className="schedule-time small">{shortFullDate(p.harvestFrom)}<br /><small>até {shortFullDate(p.harvestTo)}</small></span></div>
      </div>
      <div className="card-actions">
        {confirm === p.id
          ? <div className="delete-confirm"><span>Remover?</span><Button variant="ghost" size="sm" onClick={() => setConfirm(null)}>Não</Button><Button variant="outline" size="sm" className="danger" onClick={() => onDelete(p.id)}><Trash2 />Remover</Button></div>
          : <Button variant="ghost" size="sm" className="danger" onClick={() => setConfirm(p.id)} aria-label={`Remover ${p.crop}`}><Trash2 /></Button>}
        <div className="card-actions-right">
          {p.status === 'previsto' && <Button variant="outline" size="sm" onClick={() => onStatus(p.id, 'plantado')}><Check />Plantei</Button>}
          {p.status !== 'colhido' && s.tone !== 'wait' && <Button variant="outline" size="sm" onClick={() => onScheduleHarvest(p)}><CalendarClock />Agendar colheita</Button>}
          {p.status === 'plantado' && s.tone === 'ready' && <Button size="sm" onClick={() => onStatus(p.id, 'colhido')}><Check />Colhi</Button>}
          {p.status === 'colhido' && <Button variant="ghost" size="sm" onClick={() => onStatus(p.id, 'plantado')}>Reabrir</Button>}
        </div>
      </div>
    </article>;
  })}</div>;
}
