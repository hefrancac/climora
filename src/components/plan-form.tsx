import { useRef, useState, type FormEvent } from 'react';
import { ArrowLeft, Check, Clock3, ShoppingBasket, Trash2, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { emptyFields, fieldsOf, LIMITS, SALE_TYPES, validatePlan, type FieldErrors, type Plan, type PlanFields } from '@/lib/harvest';
import { CROPS } from '@/lib/crops';

type Props = {
  plan: Plan | null;
  seed?: { crop: string; date: string } | null;
  onSave: (fields: PlanFields) => void;
  onCancel: () => void;
  onDelete?: () => void;
};

export function PlanForm({ plan, seed, onSave, onCancel, onDelete }: Props) {
  const [fields, setFields] = useState<PlanFields>(plan ? fieldsOf(plan) : emptyFields(seed));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [confirmDelete, setConfirmDelete] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  function update(key: keyof PlanFields, value: string) { setFields(current => ({ ...current, [key]: value })); }
  function submit(event: FormEvent) {
    event.preventDefault();
    const nextErrors = validatePlan(fields);
    setErrors(nextErrors);
    const first = Object.keys(nextErrors)[0];
    if (first) { formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus(); return; }
    onSave(fields);
  }
  function field(key: Exclude<keyof PlanFields, 'sale' | 'notes'>, label: string, type: string, extra?: { hint?: string; list?: string; placeholder?: string; optional?: boolean }) {
    return <div className="form-field">
      <label htmlFor={key}>{label}{extra?.optional && <span className="optional"> · opcional</span>}</label>
      <Input className="field-input" id={key} name={key} type={type} value={fields[key]} onChange={e => update(key, e.target.value)} required={!extra?.optional} aria-invalid={!!errors[key]} aria-describedby={errors[key] ? `${key}-error` : undefined} autoComplete="off" list={extra?.list} placeholder={extra?.placeholder} />
      {errors[key] && <p className="field-error" id={`${key}-error`}>{errors[key]}</p>}
      {extra?.hint && <p className="field-hint">{extra.hint}</p>}
    </div>;
  }
  return <div className="form-content mx-auto">
    <Button className="back-link" variant="ghost" onClick={onCancel}><ArrowLeft />Voltar à agenda</Button>
    <p className="eyebrow">Seu planejamento</p><h1 className="page-title">{plan ? 'Editar colheita' : 'Nova colheita'}</h1>
    <form className="plan-form" ref={formRef} noValidate onSubmit={submit}>
      <div className="form-row stack-mobile">
        {field('crop', 'Cultura', 'text', { list: 'crop-names', hint: `Até ${LIMITS.crop} caracteres` })}
        {field('quantity', 'Quantidade', 'text', { placeholder: 'Ex.: 30 maços, 50 kg', optional: true })}
      </div>
      <datalist id="crop-names">{CROPS.map(c => <option value={c.name} key={c.key} />)}</datalist>
      {field('date', 'Data', 'date')}
      <section className="form-section"><h3 className="flex items-center gap-2"><Clock3 size={17} />Colheita</h3><div className="form-row">{field('start', 'Início da colheita', 'time')}{field('end', 'Fim da colheita', 'time')}</div></section>
      <section className="form-section"><h3 className="flex items-center gap-2"><ShoppingBasket size={17} />Venda</h3>
        <div className="form-row stack-mobile">
          <div className="form-field"><label htmlFor="sale">Tipo de venda</label><select id="sale" name="sale" className="field-input select-input" required value={fields.sale} onChange={e => update('sale', e.target.value)} aria-invalid={!!errors.sale} aria-describedby={errors.sale ? 'sale-error' : undefined}><option value="">Selecione</option>{SALE_TYPES.map(t => <option value={t} key={t}>{t}</option>)}</select>{errors.sale && <p className="field-error" id="sale-error">{errors.sale}</p>}</div>
          {field('customer', 'Cliente ou local', 'text', { placeholder: 'Ex.: Feira da praça, Escola', optional: true })}
        </div>
      </section>
      <section className="form-section"><h3 className="flex items-center gap-2"><Truck size={17} />Entrega</h3>
        {field('delivery', 'Horário da entrega', 'time', { hint: 'No mesmo dia, depois do fim da colheita. O tempo entre os dois é preservado quando o Climora sugere outro horário.' })}
        <div className="form-field"><label htmlFor="notes">Observações<span className="optional"> · opcional</span></label><textarea id="notes" name="notes" className="field-input textarea-input" rows={3} value={fields.notes} onChange={e => update('notes', e.target.value)} aria-invalid={!!errors.notes} aria-describedby={errors.notes ? 'notes-error' : undefined} />{errors.notes && <p className="field-error" id="notes-error">{errors.notes}</p>}</div>
      </section>
      <div className="form-actions">
        {plan && onDelete && (confirmDelete
          ? <div className="delete-confirm"><span>Apagar esta colheita?</span><Button type="button" variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>Não</Button><Button type="button" variant="outline" size="sm" className="danger" onClick={onDelete}><Trash2 />Apagar</Button></div>
          : <Button type="button" variant="ghost" className="danger" onClick={() => setConfirmDelete(true)}><Trash2 />Apagar</Button>)}
        <span className="spacer" />
        <Button variant="outline" type="button" onClick={onCancel}>Cancelar</Button>
        <Button type="submit"><Check />Salvar</Button>
      </div>
    </form>
  </div>;
}
