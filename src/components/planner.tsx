import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { CalendarCheck, Check, CircleAlert, MapPin, Plus, RefreshCw, Search, Sprout, Wheat } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { daysBetween, MONTH_SHORT, shortFullDate } from '@/lib/dates';
import { CROPS, GROUPS, POPULAR, TEMPLATES, cropByKey, customCrop, searchCrops, type Crop, type TemplateKey } from '@/lib/crops';
import { dateOfDoy, nextDateOf, type Climate } from '@/lib/climate';
import type { Place, Planting } from '@/lib/harvest';
import {
  RATING_LABEL, bestWindows, explain, harvestFor, limitingFactor, plantsYearRound, rating, scanYear, windowDates,
  type PlantingWindow, type Season,
} from '@/lib/suitability';
import type { ClimateStatus } from '@/hooks/use-climate';

type Props = {
  place: Place | null;
  climate: Climate | null;
  climateStatus: ClimateStatus;
  today: string;
  onRetry: () => void;
  onSetPlace: () => void;
  onSave: (planting: Planting) => void;
};

function cycleText(crop: Crop): string {
  const [a, b] = crop.cycle;
  if (a >= 300) return `${Math.round(a / 30)}–${Math.round(b / 30)} meses até a primeira colheita`;
  return `${a}–${b} dias até a colheita`;
}

// ---------- Crop picker ----------

function CropPicker({ crop, onPick }: { crop: Crop | null; onPick: (crop: Crop) => void }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState(false);
  const [customName, setCustomName] = useState('');
  const [template, setTemplate] = useState<TemplateKey>('fruto-quente');
  const [cycle, setCycle] = useState('90');
  const [error, setError] = useState('');
  const results = query ? searchCrops(query, 8) : [];
  const listRef = useRef<HTMLUListElement>(null);

  function pick(c: Crop) { onPick(c); setQuery(''); setOpen(false); setCustom(false); }
  function submitCustom(e: FormEvent) {
    e.preventDefault();
    const days = Number(cycle);
    if (!customName.trim()) { setError('Informe o nome da cultura.'); return; }
    if (!Number.isFinite(days) || days < 20 || days > 2000) { setError('Informe o ciclo entre 20 e 2000 dias.'); return; }
    setError('');
    pick(customCrop(customName.slice(0, 40), template, days));
  }

  return <div className="crop-picker">
    <label htmlFor="crop-q" className="field-label">O que você quer plantar?</label>
    <div className="crop-search">
      <Search size={18} />
      <Input id="crop-q" className="field-input" role="combobox" aria-expanded={open && results.length > 0} aria-controls="crop-options" autoComplete="off"
        placeholder={crop ? `Trocar ${crop.name.toLowerCase()} por…` : 'Ex.: feijão, alface, banana, aipim'} value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true); }}
        onKeyDown={e => {
          if (e.key === 'Enter' && results[0]) { e.preventDefault(); pick(results[0]); }
          if (e.key === 'ArrowDown') { e.preventDefault(); listRef.current?.querySelector('button')?.focus(); }
          if (e.key === 'Escape') setOpen(false);
        }} />
    </div>
    {open && query && <ul className="crop-options" id="crop-options" ref={listRef} role="listbox">
      {results.map(c => <li key={c.key} role="option" aria-selected={false}><button type="button" onClick={() => pick(c)}><strong>{c.name}</strong><small>{GROUPS[c.group]}{c.aliases.length ? ` · ${c.aliases.slice(0, 2).join(', ')}` : ''}</small></button></li>)}
      <li role="option" aria-selected={false}><button type="button" className="crop-custom-link" onClick={() => { setCustom(true); setCustomName(query); setOpen(false); }}><Plus size={15} /><span>Não está na lista? <strong>Cadastrar “{query}”</strong></span></button></li>
    </ul>}
    {!query && !custom && <div className="crop-chips" aria-label="Culturas mais buscadas">
      {POPULAR.map(key => { const c = cropByKey(key)!; return <button key={key} type="button" className={`chip${crop?.key === key ? ' on' : ''}`} onClick={() => pick(c)}>{c.name}</button>; })}
      <button type="button" className="chip ghost" onClick={() => setCustom(true)}><Plus size={14} />Outra cultura</button>
    </div>}
    {custom && <form className="custom-crop" onSubmit={submitCustom} noValidate>
      <p className="custom-title">Cadastrar outra cultura</p>
      <div className="form-row stack-mobile">
        <div className="form-field"><label htmlFor="cc-name">Nome</label><Input id="cc-name" className="field-input" value={customName} maxLength={40} onChange={e => setCustomName(e.target.value)} /></div>
        <div className="form-field"><label htmlFor="cc-cycle">Dias até a colheita</label><Input id="cc-cycle" className="field-input" type="number" inputMode="numeric" min={20} max={2000} value={cycle} onChange={e => setCycle(e.target.value)} /></div>
      </div>
      <div className="form-field"><label htmlFor="cc-type">Parece mais com</label><select id="cc-type" className="field-input select-input" value={template} onChange={e => setTemplate(e.target.value as TemplateKey)}>{Object.entries(TEMPLATES).map(([k, t]) => <option key={k} value={k}>{t.label}</option>)}</select></div>
      {error && <p className="field-error" role="alert">{error}</p>}
      <div className="custom-actions"><Button type="button" variant="ghost" onClick={() => { setCustom(false); setError(''); }}>Cancelar</Button><Button type="submit"><Check />Usar esta cultura</Button></div>
    </form>}
  </div>;
}

// ---------- Year strip ----------

function YearStrip({ scan, today, onPick }: { scan: Season[]; today: string; onPick: (doy: number) => void }) {
  const todayDoy = scan.length ? Math.floor(daysBetween(`${today.slice(0, 4)}-01-01`, today) / (365 / scan.length)) : -1;
  return <div className="year-strip">
    <div className="year-bars" role="list" aria-label="Qualidade da época de plantio ao longo do ano">
      {scan.map((s, i) => {
        const r = rating(s.score);
        const date = dateOfDoy(2025, s.doy);
        return <button type="button" role="listitem" key={s.doy} className={`ybar r-${r}${i === todayDoy ? ' today' : ''}`} style={{ height: `${Math.max(8, s.score)}%` }}
          title={`Plantar em ${Number(date.slice(8))}/${MONTH_SHORT[Number(date.slice(5, 7)) - 1]}: ${RATING_LABEL[r]} (${s.score})`}
          aria-label={`Plantar em ${Number(date.slice(8))} de ${MONTH_SHORT[Number(date.slice(5, 7)) - 1]}: ${RATING_LABEL[r]}`}
          onClick={() => onPick(s.doy)} />;
      })}
    </div>
    <div className="year-months" aria-hidden="true">{MONTH_SHORT.map(m => <span key={m}>{m}</span>)}</div>
    <div className="year-legend" aria-hidden="true">
      {(['otima', 'boa', 'regular', 'desfavoravel'] as const).map(r => <span key={r}><i className={`r-${r}`} />{RATING_LABEL[r]}</span>)}
    </div>
  </div>;
}

// ---------- Option card ----------

type OptionView = { win: PlantingWindow; dates: ReturnType<typeof windowDates> };

function OptionCard({ option, crop, irrigated, today, onUse }: { option: OptionView; crop: Crop; irrigated: boolean; today: string; onUse: (date: string) => void }) {
  const { win, dates } = option;
  const wait = daysBetween(today, dates.plantFrom);
  const reasons = explain(win.peak, crop, irrigated);
  const peakDate = (() => {
    const d = nextDateOf(win.peak.doy, today);
    return d < dates.plantFrom ? dates.plantFrom : d > dates.plantTo ? dates.plantTo : d;
  })();
  return <article className={`season-card r-${win.rating}`}>
    <div className="season-top">
      <span className="season-rank">{win.rank}ª opção</span>
      <span className={`rating-chip r-${win.rating}`}>{RATING_LABEL[win.rating]} · {win.peak.score}</span>
    </div>
    <div className="season-dates">
      <div><span className="season-label"><Sprout size={15} />Plantar</span><strong>{shortFullDate(dates.plantFrom)}</strong><span className="season-to">até {shortFullDate(dates.plantTo)}</span></div>
      <div><span className="season-label"><Wheat size={15} />{crop.establish ? 'Primeira colheita' : 'Colher'}</span><strong>{shortFullDate(dates.harvestFrom)}</strong><span className="season-to">até {shortFullDate(dates.harvestTo)}</span></div>
    </div>
    <p className="season-when">{dates.inProgress || wait <= 0 ? 'É época agora' : wait === 1 ? 'Começa amanhã' : `Começa em ${wait} dias`}</p>
    <ul className="reasons">{reasons.map(r => <li key={r.text} className={r.ok ? 'ok' : 'warn'}>{r.ok ? <Check size={15} /> : <CircleAlert size={15} />}<span>{r.text}</span></li>)}</ul>
    <Button variant={win.rank === 1 ? 'default' : 'outline'} onClick={() => onUse(peakDate)}><CalendarCheck />Planejar nesta época</Button>
  </article>;
}

// ---------- Planner ----------

export function Planner({ place, climate, climateStatus, today, onRetry, onSetPlace, onSave }: Props) {
  const [crop, setCrop] = useState<Crop | null>(null);
  const [irrigated, setIrrigated] = useState(false);
  const [simDate, setSimDate] = useState('');
  const [saved, setSaved] = useState(false);
  const simRef = useRef<HTMLDivElement>(null);

  const analysis = useMemo(() => {
    if (!crop || !climate || !today) return null;
    const scan = scanYear(crop, climate, irrigated);
    const windows = bestWindows(scan);
    const options = windows.map(win => ({ win, dates: windowDates(win, crop, climate, irrigated, today) }));
    const worst = [...scan].sort((a, b) => a.score - b.score)[0];
    return { scan, options, yearRound: plantsYearRound(scan), worst, good: windows.some(w => w.rating !== 'desfavoravel') };
  }, [crop, climate, irrigated, today]);

  useEffect(() => { setSaved(false); }, [crop, irrigated, simDate]);
  useEffect(() => { setSimDate(''); }, [crop]);

  const sim = crop && climate && simDate ? harvestFor(crop, climate, simDate, irrigated) : null;

  function useDate(date: string) {
    setSimDate(date);
    requestAnimationFrame(() => simRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
  }
  function save() {
    if (!crop || !sim) return;
    onSave({ id: crypto.randomUUID(), crop: crop.name, cropKey: crop.key, plantDate: simDate, harvestFrom: sim.from, harvestTo: sim.to, irrigated, score: sim.season.score, status: simDate <= today ? 'plantado' : 'previsto' });
    setSaved(true);
  }

  return <div className="planner">
    <section className="planner-input">
      {place
        ? <p className="planner-place"><MapPin size={15} />Clima de <strong>{place.name}{place.region ? `, ${place.region}` : ''}</strong> <button type="button" className="link-btn" onClick={onSetPlace}>trocar</button></p>
        : <div className="planner-noplace"><MapPin size={18} /><span>Escolha o município da propriedade para analisar o clima.</span><Button size="sm" onClick={onSetPlace}>Escolher município</Button></div>}
      <CropPicker crop={crop} onPick={setCrop} />
      <label className="irrigation-toggle">
        <input type="checkbox" checked={irrigated} onChange={e => setIrrigated(e.target.checked)} />
        <span className="switch" aria-hidden="true" />
        <span><strong>Tenho irrigação</strong><small>Sem irrigação, a época depende da chuva da região.</small></span>
      </label>
    </section>

    {!crop ? <div className="planner-hint"><Sprout size={30} /><p>Escolha uma cultura para ver as melhores épocas de plantio no seu município, com a data prevista da colheita.</p></div>
      : !place ? null
      : climateStatus === 'loading' || (!climate && climateStatus !== 'error') ? <div className="planner-loading" aria-busy="true"><RefreshCw className="spin" /><p>Analisando 10 anos de clima de {place.name}…</p></div>
      : climateStatus === 'error' || !climate ? <div className="planner-loading"><CircleAlert /><p>Não foi possível carregar o clima da região. Verifique a conexão.</p><Button variant="outline" onClick={onRetry}><RefreshCw />Tentar de novo</Button></div>
      : analysis && <section className="planner-results" aria-live="polite">
        <div className="results-head">
          <h2>Melhores épocas para plantar {crop.name.toLowerCase()} {irrigated ? 'com irrigação ' : ''}em {place.name}</h2>
          <p>{crop.start === 'semeadura' ? 'Contando da semeadura' : `Contando do ${crop.start}`} · {cycleText(crop)} · clima de {climate.years[0]} a {climate.years[1]}</p>
        </div>
        {!analysis.good && <div className="notice-warn"><CircleAlert size={18} /><span>Nenhuma época do ano é realmente favorável para {crop.name.toLowerCase()} aqui{irrigated ? '' : ' sem irrigação'}. A opção abaixo é a de menor risco{irrigated ? '' : '; veja também com irrigação'}.</span></div>}
        {analysis.yearRound && <div className="notice-ok"><Check size={18} /><span>Dá para plantar em quase todo o ano. As opções abaixo são os períodos de menor risco.</span></div>}
        <div className="season-grid">{analysis.options.map(o => <OptionCard key={o.win.rank} option={o} crop={crop} irrigated={irrigated} today={today} onUse={useDate} />)}</div>

        <div className="year-panel">
          <h3>O ano todo</h3>
          <p className="field-hint">Cada barra é uma data de plantio. Toque para simular.{analysis.worst && analysis.worst.score < 40 ? ` Evite plantar perto de ${shortFullDate(dateOfDoy(2025, analysis.worst.doy)).slice(0, -5)}: ${limitingFactor(analysis.worst)}.` : ''}</p>
          <YearStrip scan={analysis.scan} today={today} onPick={doy => useDate(nextDateOf(doy, today))} />
        </div>

        <div className="simulator" ref={simRef}>
          <h3>Simular uma data de plantio</h3>
          <div className="sim-row">
            <div className="form-field"><label htmlFor="sim-date">Data do plantio</label><Input id="sim-date" type="date" className="field-input" value={simDate} min={today} onChange={e => setSimDate(e.target.value)} /></div>
            {sim && <div className="sim-result">
              <span className={`rating-chip r-${rating(sim.season.score)}`}>{RATING_LABEL[rating(sim.season.score)]} · {sim.season.score}</span>
              <p><Wheat size={16} />{crop.establish ? 'Primeira colheita' : 'Colheita'} prevista entre <strong>{shortFullDate(sim.from)}</strong> e <strong>{shortFullDate(sim.to)}</strong></p>
            </div>}
          </div>
          {sim && <ul className="reasons">{explain(sim.season, crop, irrigated).map(r => <li key={r.text} className={r.ok ? 'ok' : 'warn'}>{r.ok ? <Check size={15} /> : <CircleAlert size={15} />}<span>{r.text}</span></li>)}</ul>}
          {sim && <div className="sim-actions">{saved ? <p className="saved-msg" role="status"><Check size={16} />Salvo em Minhas plantações</p> : <Button onClick={save}><Plus />Salvar em Minhas plantações</Button>}</div>}
          {!sim && <p className="field-hint">Escolha uma das opções acima ou uma data qualquer para ver a colheita prevista.</p>}
        </div>

        <details className="method">
          <summary>Como o Climora calcula</summary>
          <p>Usamos o clima diário dos últimos 10 anos no seu município (temperatura, chuva e evaporação, dados Open-Meteo/ERA5) para montar um ano típico. Para cada data de plantio, simulamos o ciclo de {crop.name.toLowerCase()} e avaliamos: temperatura em relação à faixa ideal da cultura ({crop.temp[1]}–{crop.temp[2]} °C), chuva frente à necessidade de água{crop.dryHarvest ? ', chuva na colheita' : ''} e risco de geada. Em períodos frios o ciclo fica mais longo, por isso a data da colheita muda conforme a época.</p>
          <p>Os parâmetros das culturas são referências gerais, não específicos de cada variedade. Para crédito rural e seguro agrícola vale o <a href="https://www.gov.br/agricultura/pt-br/assuntos/riscos-seguro/programa-nacional-de-zoneamento-agricola-de-risco-climatico" target="_blank" rel="noreferrer">Zoneamento Agrícola de Risco Climático (ZARC)</a>. Na dúvida, converse com a assistência técnica (ATER) da sua região.</p>
        </details>
      </section>}
    {crop && <p className="sr-only" aria-live="polite">{crop.name} selecionado</p>}
    {!crop && <p className="crop-count">{CROPS.length} culturas cadastradas, de hortaliças a frutas. Não achou a sua? Cadastre em “Outra cultura”.</p>}
  </div>;
}
