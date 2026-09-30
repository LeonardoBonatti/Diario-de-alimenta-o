'use client';

import { useState, type FormEvent, type KeyboardEvent } from 'react';
import { createEntryAction, updateEntryAction } from '@/lib/actions';
import { toDatetimeLocalValue } from '@/lib/dates';
import { ALL_SYMPTOMS, COMMON_TRIGGERS, SYMPTOM_GROUPS } from '@/lib/reflux';
import { MEAL_LABELS, MEAL_TYPES, type Entry, type Intensity, type MealType, type Symptom } from '@/lib/types';

interface EntryFormProps {
  /** Quando presente, o formulário edita o registro em vez de criar um novo. */
  initial?: Entry;
  onSaved?: () => void;
  onCancel?: () => void;
}

type Status = { type: 'idle' | 'saving' | 'success' | 'error'; message?: string };

const INTENSITIES: Intensity[] = [1, 2, 3, 4, 5];

const INTENSITY_ACTIVE: Record<Intensity, string> = {
  1: 'bg-emerald-500 border-emerald-500 text-white',
  2: 'bg-lime-500 border-lime-500 text-white',
  3: 'bg-amber-500 border-amber-500 text-white',
  4: 'bg-orange-500 border-orange-500 text-white',
  5: 'bg-red-600 border-red-600 text-white',
};

const INTENSITY_LABELS: Record<Intensity, string> = {
  1: 'Muito leve',
  2: 'Leve',
  3: 'Moderado',
  4: 'Forte',
  5: 'Muito forte',
};

const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30';

export default function EntryForm({ initial, onSaved, onCancel }: EntryFormProps) {
  const isEdit = Boolean(initial);
  const [mealType, setMealType] = useState<MealType | ''>(initial?.mealType ?? '');
  const [mealLabel, setMealLabel] = useState(initial?.mealLabel ?? '');
  const [foods, setFoods] = useState<string[]>(initial?.foods ?? []);
  const [layDownSoon, setLayDownSoon] = useState<boolean | null>(initial?.layDownSoon ?? null);
  const [largeMeal, setLargeMeal] = useState<boolean | null>(initial?.largeMeal ?? null);
  const [symptoms, setSymptoms] = useState<Symptom[]>(initial?.symptoms ?? []);
  const [symptomDraft, setSymptomDraft] = useState('');
  const [useNow, setUseNow] = useState(!isEdit);
  const [occurredAt, setOccurredAt] = useState(toDatetimeLocalValue(initial?.occurredAt ?? new Date()));
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [status, setStatus] = useState<Status>({ type: 'idle' });

  const isMeal = mealType !== '' || foods.length > 0;

  const addSymptom = (name = '', intensity: Intensity = 3) =>
    setSymptoms((prev) => [...prev, { name, intensity }]);

  const updateSymptom = (index: number, patch: Partial<Symptom>) =>
    setSymptoms((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));

  const removeSymptom = (index: number) => setSymptoms((prev) => prev.filter((_, i) => i !== index));

  /** Adiciona os sintomas digitados (aceita vários separados por vírgula), ignorando repetidos. */
  function commitSymptomDraft() {
    const names = symptomDraft
      .split(/[,;\n]/)
      .map((n) => n.trim().toLowerCase())
      .filter(Boolean);
    if (names.length) {
      setSymptoms((prev) => {
        const used = new Set(prev.map((s) => s.name.trim().toLowerCase()));
        const fresh = [...new Set(names)].filter((n) => !used.has(n));
        return [...prev, ...fresh.map((name) => ({ name, intensity: 3 as Intensity }))];
      });
    }
    setSymptomDraft('');
  }

  function handleSymptomKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.nativeEvent.isComposing) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      commitSymptomDraft();
    }
  }

  function resetForm() {
    setMealType('');
    setMealLabel('');
    setFoods([]);
    setLayDownSoon(null);
    setLargeMeal(null);
    setSymptoms([]);
    setSymptomDraft('');
    setNotes('');
    setUseNow(true);
    setOccurredAt(toDatetimeLocalValue(new Date()));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const validSymptoms = symptoms.filter((s) => s.name.trim());

    if (foods.length === 0 && validSymptoms.length === 0) {
      setStatus({ type: 'error', message: 'Informe ao menos um alimento ou um sintoma.' });
      return;
    }
    if (mealType === 'outro' && !mealLabel.trim()) {
      setStatus({ type: 'error', message: 'Informe qual foi a refeição.' });
      return;
    }

    // "Agora" é capturado no momento do envio, não quando a página abriu.
    const when = useNow ? new Date() : new Date(occurredAt);
    if (Number.isNaN(when.getTime())) {
      setStatus({ type: 'error', message: 'Data/hora inválida.' });
      return;
    }
    if (when.getTime() > Date.now() + 5 * 60_000) {
      setStatus({ type: 'error', message: 'A data/hora não pode estar no futuro.' });
      return;
    }

    // A validação acima é só UX; o servidor valida de novo (normalizeEntryInput).
    setStatus({ type: 'saving' });
    try {
      const input = {
        mealType: mealType || null,
        mealLabel: mealType === 'outro' ? mealLabel : null,
        foods,
        symptoms: validSymptoms,
        layDownSoon: isMeal ? layDownSoon : null,
        largeMeal: isMeal ? largeMeal : null,
        occurredAt: when,
        notes,
      };
      const result = initial ? await updateEntryAction(initial.id, input) : await createEntryAction(input);
      if (!result.ok) {
        setStatus({ type: 'error', message: result.error });
        return;
      }

      if (!isEdit) resetForm();
      setStatus({ type: 'success', message: isEdit ? 'Registro atualizado.' : 'Registro salvo!' });
      onSaved?.();
    } catch (err) {
      console.error(err);
      setStatus({ type: 'error', message: 'Não foi possível salvar. Verifique sua conexão.' });
    }
  }

  const usedSymptoms = new Set(symptoms.map((s) => s.name.trim().toLowerCase()));
  const unusedTriggers = COMMON_TRIGGERS.filter((t) => !foods.includes(t));

  return (
    <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">{isEdit ? 'Editar registro' : 'Novo registro'}</h2>
        {!isEdit && (
          <p className="mt-1 text-sm text-slate-500">
            Registre o que comeu e, quando surgirem, os sintomas. No refluxo laringofaríngeo os sintomas costumam ser
            de garganta e voz (pigarro, rouquidão, tosse) e podem aparecer horas depois, sem azia.
          </p>
        )}
      </div>

      {/* Refeição */}
      <div className="space-y-2">
        <label htmlFor="mealType" className="block text-sm font-medium text-slate-700">
          Refeição <span className="font-normal text-slate-400">(deixe vazio para registrar só sintomas)</span>
        </label>
        <select
          id="mealType"
          value={mealType}
          onChange={(e) => setMealType(e.target.value as MealType | '')}
          className={inputClass}
        >
          <option value="">— Nenhuma —</option>
          {MEAL_TYPES.map((t) => (
            <option key={t} value={t}>
              {MEAL_LABELS[t]}
            </option>
          ))}
        </select>
        {mealType === 'outro' && (
          <input
            aria-label="Qual refeição?"
            value={mealLabel}
            onChange={(e) => setMealLabel(e.target.value)}
            maxLength={60}
            required
            autoFocus
            placeholder="Qual refeição? Ex.: pré-treino, lanche da madrugada"
            className={inputClass}
          />
        )}
      </div>

      {/* Alimentos */}
      <div className="space-y-2">
        <label htmlFor="foods" className="block text-sm font-medium text-slate-700">
          Alimentos e bebidas
        </label>
        <TagInput id="foods" tags={foods} onChange={setFoods} placeholder="Ex.: pão, ovos, café. Enter ou vírgula para adicionar" />
        {unusedTriggers.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-500">Gatilhos comuns de refluxo:</span>
            {unusedTriggers.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setFoods((prev) => [...prev, t])}
                className="rounded-full bg-amber-50 px-3 py-1 text-xs text-amber-800 hover:bg-amber-100"
              >
                + {t}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Hábitos da refeição */}
      {isMeal && (
        <div className="space-y-3 rounded-lg bg-slate-50 p-4">
          <p className="text-sm font-medium text-slate-700">Hábitos nesta refeição</p>
          <YesNo label="Deitei ou fui dormir até 3h depois de comer" value={layDownSoon} onChange={setLayDownSoon} />
          <YesNo label="Comi uma quantidade grande" value={largeMeal} onChange={setLargeMeal} />
          <p className="text-xs text-slate-500">
            Deitar logo após comer e refeições volumosas estão entre os fatores mais ligados ao refluxo. Se ainda não
            sabe, deixe em branco e edite o registro depois.
          </p>
        </div>
      )}

      {/* Sintomas */}
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-slate-700">Sintomas</legend>

        <div className="flex gap-2">
          <input
            aria-label="Digite um sintoma"
            list="symptom-suggestions"
            value={symptomDraft}
            onChange={(e) => setSymptomDraft(e.target.value)}
            onKeyDown={handleSymptomKeyDown}
            onBlur={commitSymptomDraft}
            maxLength={80}
            placeholder="Digite um sintoma e aperte Enter. Ex.: garganta arranhando"
            className={inputClass}
          />
          <button
            type="button"
            onClick={commitSymptomDraft}
            className="shrink-0 rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:border-teal-500 hover:text-teal-700"
          >
            Adicionar
          </button>
        </div>

        {symptoms.length === 0 && (
          <p className="text-sm text-slate-400">Nenhum sintoma adicionado. Digite acima ou toque numa sugestão abaixo.</p>
        )}

        {symptoms.map((symptom, i) => (
          <div key={i} className="flex flex-col gap-3 rounded-lg border border-slate-200 p-3 sm:flex-row sm:items-center">
            <input
              aria-label={`Nome do sintoma ${i + 1}`}
              list="symptom-suggestions"
              value={symptom.name}
              onChange={(e) => updateSymptom(i, { name: e.target.value })}
              placeholder="Ex.: pigarro"
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
            />
            <div role="radiogroup" aria-label={`Intensidade do sintoma ${i + 1}`} className="flex gap-1">
              {INTENSITIES.map((level) => {
                const active = symptom.intensity === level;
                return (
                  <button
                    key={level}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    title={INTENSITY_LABELS[level]}
                    onClick={() => updateSymptom(i, { intensity: level })}
                    className={`h-9 w-9 rounded-full border text-sm font-semibold transition ${
                      active ? INTENSITY_ACTIVE[level] : 'border-slate-300 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {level}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => removeSymptom(i)}
              className="self-end text-sm text-slate-400 hover:text-red-600 sm:self-auto"
              aria-label={`Remover sintoma ${i + 1}`}
            >
              Remover
            </button>
          </div>
        ))}

        <datalist id="symptom-suggestions">
          {ALL_SYMPTOMS.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>

        <div className="space-y-3">
          {SYMPTOM_GROUPS.map((group) => {
            const unused = group.symptoms.filter((s) => !usedSymptoms.has(s));
            if (unused.length === 0) return null;
            return (
              <div key={group.id} className="space-y-1.5">
                <p className="text-xs text-slate-500">
                  <span className="font-medium text-slate-600">{group.label}</span>
                  {group.description && ` · ${group.description}`}
                </p>
                <div className="flex flex-wrap gap-2">
                  {unused.map((name) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => addSymptom(name)}
                      className={`rounded-full px-3 py-1 text-xs ${
                        group.reflux
                          ? 'bg-rose-50 text-rose-800 hover:bg-rose-100'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      + {name}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </fieldset>

      {/* Data e hora */}
      <div className="space-y-2">
        <span className="block text-sm font-medium text-slate-700">Data e hora</span>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={useNow}
            onChange={(e) => setUseNow(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
          />
          Usar data e hora atuais
        </label>
        {!useNow && (
          <input
            type="datetime-local"
            aria-label="Data e hora do registro"
            value={occurredAt}
            max={toDatetimeLocalValue(new Date())}
            onChange={(e) => setOccurredAt(e.target.value)}
            className={`${inputClass} sm:w-auto`}
          />
        )}
      </div>

      {/* Observações */}
      <div className="space-y-2">
        <label htmlFor="notes" className="block text-sm font-medium text-slate-700">
          Observações <span className="font-normal text-slate-400">(opcional: remédios, estresse, exercício…)</span>
        </label>
        <textarea
          id="notes"
          rows={2}
          maxLength={1000}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className={inputClass}
        />
      </div>

      {status.message && (
        <p role="status" className={`text-sm ${status.type === 'error' ? 'text-red-600' : 'text-teal-700'}`}>
          {status.message}
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={status.type === 'saving'}
          className="rounded-lg bg-teal-600 px-5 py-2.5 font-medium text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status.type === 'saving' ? 'Salvando…' : isEdit ? 'Salvar alterações' : 'Registrar'}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="rounded-lg px-5 py-2.5 text-slate-600 hover:bg-slate-100">
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}

interface YesNoProps {
  label: string;
  value: boolean | null;
  onChange: (value: boolean | null) => void;
}

/** Sim / Não; clicar de novo na opção marcada volta para "não informado". */
function YesNo({ label, value, onChange }: YesNoProps) {
  const options: { v: boolean; text: string }[] = [
    { v: true, text: 'Sim' },
    { v: false, text: 'Não' },
  ];
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className="text-sm text-slate-700">{label}</span>
      <div role="radiogroup" aria-label={label} className="flex gap-1">
        {options.map(({ v, text }) => {
          const active = value === v;
          return (
            <button
              key={text}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(active ? null : v)}
              className={`rounded-lg border px-3 py-1 text-sm transition ${
                active ? 'border-teal-600 bg-teal-600 text-white' : 'border-slate-300 text-slate-600 hover:bg-white'
              }`}
            >
              {text}
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface TagInputProps {
  id: string;
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}

function TagInput({ id, tags, onChange, placeholder }: TagInputProps) {
  const [draft, setDraft] = useState('');

  function commit(raw: string) {
    const parts = raw
      .split(/[,;\n]/)
      .map((p) => p.trim().toLowerCase())
      .filter(Boolean);
    if (parts.length) onChange([...new Set([...tags, ...parts])]);
    setDraft('');
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.nativeEvent.isComposing) return;
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      commit(draft);
    } else if (e.key === 'Backspace' && !draft && tags.length) {
      onChange(tags.slice(0, -1));
    }
  }

  return (
    <div className="flex flex-wrap gap-2 rounded-lg border border-slate-300 px-2 py-2 focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-500/30">
      {tags.map((tag) => (
        <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-3 py-1 text-sm text-teal-800">
          {tag}
          <button
            type="button"
            onClick={() => onChange(tags.filter((t) => t !== tag))}
            className="text-teal-500 hover:text-teal-900"
            aria-label={`Remover ${tag}`}
          >
            ×
          </button>
        </span>
      ))}
      <input
        id={id}
        value={draft}
        onChange={(e) => (/[,;]/.test(e.target.value) ? commit(e.target.value) : setDraft(e.target.value))}
        onKeyDown={handleKeyDown}
        onBlur={() => commit(draft)}
        placeholder={tags.length ? '' : placeholder}
        className="min-w-[10rem] flex-1 border-0 px-1 py-1 text-slate-900 outline-none placeholder:text-slate-400"
      />
    </div>
  );
}
