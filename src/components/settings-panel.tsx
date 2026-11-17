import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowLeft, Download, LocateFixed, MapPin, RotateCcw, Search, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LIMITS, parseState, THRESHOLDS, type AppState, type Place, type Settings } from '@/lib/harvest';
import { searchPlaces } from '@/lib/weather';
import { apiConfig } from '@/hooks/use-forecast';

type Props = {
  state: AppState;
  onboarding: boolean;
  onSave: (settings: Settings) => void;
  onCancel: () => void;
  onImport: (state: AppState) => void;
  onReset: () => void;
  onExport: () => void;
};

export function SettingsPanel({ state, onboarding, onSave, onCancel, onImport, onReset, onExport }: Props) {
  const [farmName, setFarmName] = useState(state.settings.farmName);
  const [place, setPlace] = useState<Place | null>(state.settings.location);
  const [threshold, setThreshold] = useState(state.settings.threshold);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Place[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [importMsg, setImportMsg] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const searchId = useRef(0);
  async function runSearch(text: string) {
    const id = ++searchId.current;
    setBusy(true); setError('');
    try {
      const found = await searchPlaces(text, apiConfig);
      if (id !== searchId.current) return; // a newer search is on its way
      setResults(found);
      if (!found.length) setError('Nenhuma cidade encontrada. Confira a grafia ou tente a cidade vizinha.');
    } catch {
      if (id === searchId.current) setError('Não foi possível buscar agora. Verifique a conexão.');
    } finally { if (id === searchId.current) setBusy(false); }
  }
  function search(event: FormEvent) {
    event.preventDefault();
    if (query.trim().length < 2) { setError('Digite pelo menos 2 letras do nome da cidade.'); return; }
    void runSearch(query);
  }
  // Search as the farmer types, after a short pause.
  useEffect(() => {
    if (query.trim().length < 3) { searchId.current++; setResults(null); return; }
    const timer = setTimeout(() => void runSearch(query), 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  function locate() {
    if (!('geolocation' in navigator)) { setError('Este aparelho não informa a localização.'); return; }
    setBusy(true); setError('');
    navigator.geolocation.getCurrentPosition(
      pos => {
        setBusy(false);
        setResults(null);
        setPlace({ name: 'Minha propriedade', region: `${pos.coords.latitude.toFixed(3)}, ${pos.coords.longitude.toFixed(3)}`, latitude: pos.coords.latitude, longitude: pos.coords.longitude });
      },
      () => { setBusy(false); setError('Não foi possível obter a localização. Busque pelo nome da cidade.'); },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 600000 },
    );
  }

  async function importFile(file: File | undefined) {
    if (!file) return;
    try {
      const next = parseState(await file.text());
      onImport(next);
      setImportMsg(`Backup restaurado: ${next.plans.length} colheita${next.plans.length === 1 ? '' : 's'}.`);
    } catch {
      setImportMsg('Arquivo inválido. Use um backup exportado pelo Climora.');
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!place) { setError('Escolha a localização da propriedade.'); return; }
    onSave({ farmName: farmName.trim(), location: place, threshold });
  }

  return <div className="form-content mx-auto">
    {!onboarding && <Button className="back-link" variant="ghost" onClick={onCancel}><ArrowLeft />Voltar à agenda</Button>}
    <p className="eyebrow">{onboarding ? 'Bem-vindo ao Climora' : 'Ajustes'}</p>
    <h1 className="page-title">{onboarding ? 'Vamos configurar sua propriedade' : 'Sua propriedade'}</h1>
    {onboarding && <p className="subtitle">Leva menos de um minuto. O clima e a previsão de chuva são analisados para o município que você escolher.</p>}

    <form className="plan-form" noValidate onSubmit={submit}>
      <div className="form-field"><label htmlFor="farmName">Nome da propriedade<span className="optional"> · opcional</span></label><Input id="farmName" className="field-input" value={farmName} maxLength={LIMITS.farmName} placeholder="Ex.: Sítio Boa Vista" onChange={e => setFarmName(e.target.value)} /><p className="field-hint">Aparece nas mensagens que você envia aos clientes.</p></div>

      <section className="form-section">
        <h3 className="flex items-center gap-2"><MapPin size={17} />Localização</h3>
        {place && <div className="place-chosen"><MapPin size={16} /><div><strong>{place.name}</strong>{place.region && <span>{place.region}</span>}</div></div>}
        <div className="place-search">
          <label htmlFor="place-q" className="field-label">{place ? 'Trocar município' : 'Município da propriedade'}</label>
          <div className="place-search-row">
            <Input id="place-q" className="field-input" value={query} placeholder="Digite o nome do município" autoComplete="off" onChange={e => setQuery(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') search(e); }} />
            <Button type="button" variant="outline" disabled={busy} onClick={search}><Search />Buscar</Button>
          </div>
          <Button type="button" variant="link" className="locate-btn" disabled={busy} onClick={locate}><LocateFixed />Usar a localização deste aparelho</Button>
          {error && <p className="field-error" role="alert">{error}</p>}
          {results && results.length > 0 && <ul className="place-results">{results.map(r => <li key={`${r.latitude},${r.longitude}`}><button type="button" onClick={() => { searchId.current++; setPlace(r); setResults(null); setQuery(''); setError(''); setBusy(false); }}><MapPin size={15} /><span><strong>{r.name}</strong>{r.region && <small>{r.region}</small>}</span></button></li>)}</ul>}
        </div>
      </section>

      <section className="form-section">
        <h3>Alertas de chuva na colheita</h3>
        <div className="form-field">
          <label htmlFor="threshold">Alertar quando a chance de chuva na colheita for a partir de</label>
          <select id="threshold" className="field-input select-input" value={threshold} onChange={e => setThreshold(Number(e.target.value))}>{THRESHOLDS.map(t => <option key={t} value={t}>{t}%{t === 50 ? ' (recomendado)' : t < 50 ? ' · mais avisos' : ' · menos avisos'}</option>)}</select>
          <p className="field-hint">Folhosas como alface e couve sofrem mais com colheita molhada; considere um limite menor se vende principalmente folhas.</p>
        </div>
      </section>

      <div className="form-actions">
        {!onboarding && <Button variant="outline" type="button" onClick={onCancel}>Cancelar</Button>}
        <Button type="submit">{onboarding ? 'Começar a planejar' : 'Salvar ajustes'}</Button>
      </div>
    </form>

    {!onboarding && <section className="data-section">
      <h3>Seus dados</h3>
      <p className="field-hint">Ficam guardados neste aparelho. Faça um backup antes de trocar de celular ou limpar o navegador.</p>
      <div className="data-actions">
        <Button variant="outline" onClick={onExport}><Download />Baixar backup</Button>
        <Button variant="outline" onClick={() => fileRef.current?.click()}><Upload />Restaurar backup</Button>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={e => { void importFile(e.target.files?.[0]); e.target.value = ''; }} />
      </div>
      {importMsg && <p className="field-hint" role="status">{importMsg}</p>}
      <div className="danger-zone">
        {confirmReset
          ? <><span>Apagar todas as colheitas e ajustes deste aparelho?</span><Button variant="ghost" size="sm" onClick={() => setConfirmReset(false)}>Não</Button><Button variant="outline" size="sm" className="danger" onClick={onReset}><RotateCcw />Apagar tudo</Button></>
          : <Button variant="ghost" size="sm" className="danger" onClick={() => setConfirmReset(true)}><RotateCcw />Apagar tudo e recomeçar</Button>}
      </div>
    </section>}
  </div>;
}
