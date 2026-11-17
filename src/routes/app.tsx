import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, HardDrive, MapPin, Settings as SettingsIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Brand, PlantingLines } from '@/components/brand';
import { HarvestAgenda } from '@/components/harvest-agenda';
import { PlanForm } from '@/components/plan-form';
import { Planner } from '@/components/planner';
import { PlantingsList } from '@/components/plantings-list';
import { SettingsPanel } from '@/components/settings-panel';
import { useClimate } from '@/hooks/use-climate';
import { useForecast } from '@/hooks/use-forecast';
import { useHarvest } from '@/hooks/use-harvest';
import { dayMonth, localToday, relativeDay } from '@/lib/dates';
import {
  addExamples, deletePlan, deletePlanting, keepPlan, moveHarvest, savePlan, savePlanting, setPlantingStatus, setStatus, sortedPlantings, updateSettings,
  type AppState, type Plan, type PlanFields, type Settings,
} from '@/lib/harvest';
import { assessPlan, type Assessment } from '@/lib/weather';

export const Route = createFileRoute('/app')({
  head: () => ({ meta: [
    { title: 'Planejar plantio · Climora' },
    { name: 'description', content: 'Descubra as melhores épocas para plantar no seu município, com a data prevista da colheita.' },
    { property: 'og:title', content: 'Planejar plantio · Climora' },
    { property: 'og:description', content: 'Melhores épocas de plantio pelo clima do seu município, com colheita prevista.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary_large_image' },
  ] }),
  component: ClimoraApp,
});

type Section = 'planejar' | 'plantacoes' | 'colheitas';
type Overlay = null | 'form' | 'settings';

const SECTIONS: { key: Section; label: string; title: string; subtitle: string }[] = [
  { key: 'planejar', label: 'Planejar', title: 'Quando plantar?', subtitle: 'As melhores épocas pelo clima do seu município, com a colheita prevista' },
  { key: 'plantacoes', label: 'Plantações', title: 'Minhas plantações', subtitle: 'O que está plantado e quando colher' },
  { key: 'colheitas', label: 'Colheitas', title: 'Agenda de colheita', subtitle: 'Colheitas e entregas com a chuva hora a hora' },
];

function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function ClimoraApp() {
  const { state, setState, ready, storageWarning, reset, replace } = useHarvest();
  const place = state.settings.location;
  const { forecast, status, error, refresh } = useForecast(ready ? place : null);
  const climate = useClimate(ready ? place : null);
  const [today, setToday] = useState('');
  const [section, setSection] = useState<Section>('planejar');
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [seed, setSeed] = useState<{ crop: string; date: string } | null>(null);
  const [message, setMessage] = useState('');
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => { setToday(localToday()); }, []);
  useEffect(() => { if (!message) return; const t = setTimeout(() => setMessage(''), 4000); return () => clearTimeout(t); }, [message]);

  const onboarding = ready && !place && state.plans.length === 0 && state.plantings.length === 0;
  const view: Overlay = onboarding && overlay !== 'form' ? 'settings' : overlay;
  const threshold = state.settings.threshold;

  const assessments = useMemo(() => {
    const map = new Map<string, Assessment>();
    for (const plan of state.plans) map.set(plan.id, place ? assessPlan(forecast, plan, threshold) : { kind: 'sem-previsao', reason: 'sem-local' });
    return map;
  }, [state.plans, forecast, threshold, place]);
  const alerts = state.plans.filter(p => {
    const a = assessments.get(p.id);
    return p.status !== 'entregue' && p.date >= today && a?.kind === 'alerta' && !a.kept;
  });
  const plantings = sortedPlantings(state);
  const openPlantings = plantings.filter(p => p.status !== 'colhido').length;

  function go(next: Section | null, nextOverlay: Overlay = null) {
    if (next) setSection(next);
    setOverlay(nextOverlay);
    window.scrollTo({ top: 0 });
    if (!nextOverlay) requestAnimationFrame(() => headingRef.current?.focus());
  }
  function openForm(plan: Plan | null, nextSeed: { crop: string; date: string } | null = null) {
    setSeed(nextSeed); setEditing(plan); setMessage(''); go('colheitas', 'form');
  }
  function update(fn: (s: AppState) => AppState, msg: string) { setState(fn); setMessage(msg); }
  function save(fields: PlanFields) {
    const id = editing?.id ?? crypto.randomUUID();
    setState(current => savePlan(current, fields, id));
    setEditing(null); go('colheitas'); setMessage(editing ? 'Colheita atualizada' : 'Colheita salva');
  }
  function saveSettings(settings: Settings) {
    setState(current => updateSettings(current, settings));
    go(null); setMessage('Ajustes salvos');
  }

  const current = SECTIONS.find(s => s.key === section)!;
  const counts: Record<Section, number> = { planejar: 0, plantacoes: openPlantings, colheitas: alerts.length };

  return <div className="app-shell">
    <header className="app-header"><div className="header-inner">
      <PlantingLines />
      <Link to="/" className="brand-link" aria-label="Climora, página inicial"><Brand {...(state.settings.farmName ? { subtitle: state.settings.farmName } : {})} /></Link>
      <div className="header-actions">
        {place && <button type="button" className="place-chip" onClick={() => go(null, 'settings')}><MapPin size={14} />{place.name}</button>}
        {!onboarding && <Button variant="ghost" size="icon" className="header-icon" aria-label="Ajustes" onClick={() => go(null, 'settings')}><SettingsIcon /></Button>}
      </div>
    </div>
      {!view && <>
        <div className="agenda-heading"><div><h1 className="page-title" tabIndex={-1} ref={headingRef}>{current.title}</h1><p className="subtitle">{today ? `${relativeDay(today, today)}, ${dayMonth(today)} · ` : ''}{current.subtitle}</p></div></div>
        <nav className="section-tabs" aria-label="Seções">{SECTIONS.map(s => <button key={s.key} type="button" aria-current={section === s.key ? 'page' : undefined} className={section === s.key ? 'on' : ''} onClick={() => go(s.key)}>
          {s.label}{counts[s.key] > 0 && <span className={`tab-badge${s.key === 'colheitas' ? ' warn' : ''}`}>{counts[s.key]}</span>}
        </button>)}</nav>
      </>}
    </header>
    <main className="main-content">
      {storageWarning && <div className="notice storage-warning" role="alert">Os dados podem não ser preservados neste navegador. Você pode continuar nesta sessão e baixar um backup nos ajustes.</div>}
      {message && <div className="notice" role="status"><Check size={18} />{message}</div>}

      {!ready ? <div className="loading-block" aria-busy="true">Carregando…</div>
        : view === 'form' ? <PlanForm plan={editing} seed={seed} onSave={save} onCancel={() => { setEditing(null); go('colheitas'); }} {...(editing ? { onDelete: () => { const id = editing.id; setEditing(null); go('colheitas'); update(s => deletePlan(s, id), 'Colheita apagada'); } } : {})} />
        : view === 'settings' ? <SettingsPanel state={state} onboarding={onboarding} onSave={saveSettings} onCancel={() => go(null)}
            onImport={next => { replace(next); setMessage('Backup restaurado'); }}
            onReset={() => { reset(); go('planejar'); setMessage('Dados apagados'); }}
            onExport={() => download(`climora-backup-${today}.json`, JSON.stringify(state, null, 2), 'application/json')} />
        : section === 'planejar' ? <Planner place={place} climate={climate.climate} climateStatus={climate.status} today={today} onRetry={climate.retry} onSetPlace={() => go(null, 'settings')}
            onSave={planting => update(s => savePlanting(s, planting), `${planting.crop} salvo em Minhas plantações`)} />
        : section === 'plantacoes' ? <PlantingsList plantings={plantings} today={today} onPlan={() => go('planejar')}
            onStatus={(id, next) => update(s => setPlantingStatus(s, id, next), next === 'plantado' ? 'Plantio registrado' : next === 'colhido' ? 'Colheita registrada' : 'Plantação reaberta')}
            onDelete={id => update(s => deletePlanting(s, id), 'Plantação removida')}
            onScheduleHarvest={p => openForm(null, { crop: p.crop.replace(/ \(.*\)$/, ''), date: p.harvestFrom < today ? today : p.harvestFrom })} />
        : <HarvestAgenda state={state} today={today} forecast={forecast} forecastStatus={status} forecastError={error} assessments={assessments} alertCount={alerts.length}
            onRefresh={refresh} onSetPlace={() => go(null, 'settings')} onNew={() => openForm(null)} onEdit={plan => openForm(plan)}
            onKeep={(plan, chance) => update(s => keepPlan(s, plan.id, chance), 'Plano mantido. Avisaremos se a chance subir.')}
            onApply={(plan, start, end) => update(s => moveHarvest(s, plan.id, start, end), `Colheita de ${plan.crop} movida para ${start}–${end}`)}
            onStatus={(plan, next) => update(s => setStatus(s, plan.id, next), next === 'entregue' ? 'Entrega registrada' : next === 'colhido' ? 'Colheita registrada' : 'Colheita reaberta')}
            onExamples={() => update(s => addExamples(s, today), 'Exemplos adicionados')} onDownload={download} />}

      {ready && !view && <footer className="footer">
        <span className="footer-note"><HardDrive size={14} />{storageWarning ? 'Dados apenas nesta sessão' : 'Dados guardados neste aparelho'}</span>
        <span className="footer-note">Clima e previsão: <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open-Meteo.com</a> (CC BY 4.0)</span>
      </footer>}
    </main>
  </div>;
}
