'use client';

import { useState, type FormEvent, type KeyboardEvent } from 'react';
import { createEntryAction, updateEntryAction } from '@/lib/actions';
import { toDatetimeLocalValue } from '@/lib/dates';
import {
  COMMON_SYMPTOMS,
  MEAL_LABELS,
  MEAL_TYPES,
  type Entry,
  type Intensity,
  type MealType,
  type Symptom,
} from '@/lib/types';

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

export default function EntryForm({ initial, onSaved, onCancel }: EntryFormProps) {
  const isEdit = Boolean(initial);
  const [mealType, setMealType] = useState<MealType | ''>(initial?.mealType ?? '');
  const [foods, setFoods] = useState<string[]>(initial?.foods ?? []);
  const [symptoms, setSymptoms] = useState<Symptom[]>(initial?.symptoms ?? []);
  const [useNow, setUseNow] = useState(!isEdit);
  const [occurredAt, setOccurredAt] = useState(toDatetimeLocalValue(initial?.occurredAt ?? new Date()));
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [status, setStatus] = useState<Status>({ type: 'idle' });

  const addSymptom = (name = '', intensity: Intensity = 3) =>
    setSymptoms((prev) => [...prev, { name, intensity }]);

  const updateSymptom = (index: number, patch: Partial<Symptom>) =>
    setSymptoms((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));

  const removeSymptom = (index: number) => setSymptoms((prev) => prev.filter((_, i) => i !== index));

  function resetForm() {
    setMealType('');
    setFoods([]);
    setSymptoms([]);
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
      const input = { mealType: mealType || null, foods, symptoms: validSymptoms, occurredAt: when, notes };
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

  const unusedSuggestions = COMMON_SYMPTOMS.filter(
    (name) => !symptoms.some((s) => s.name.trim().toLowerCase() === name),
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <h2 className="text-lg font-semibold text-slate-900">{isEdit ? 'Editar registro' : 'Novo registro'}</h2>

      {/* Refeição */}
      <div className="space-y-2">
        <label htmlFor="mealType" className="block text-sm font-medium text-slate-700">
          Refeição <span className="font-normal text-slate-400">(deixe vazio para registrar só sintomas)</span>
        </label>
        <select
          id="mealType"
          value={mealType}
          onChange={(e) => setMealType(e.target.value as MealType | '')}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
        >
          <option value="">— Nenhuma —</option>
          {MEAL_TYPES.map((t) => (
            <option key={t} value={t}>
              {MEAL_LABELS[t]}
            </option>
          ))}
        </select>
      </div>

      {/* Alimentos */}
      <div className="space-y-2">
        <label htmlFor="foods" className="block text-sm font-medium text-slate-700">
          Alimentos consumidos
        </label>
        <TagInput id="foods" tags={foods} onChange={setFoods} placeholder="Ex.: pão, ovos, café — Enter ou vírgula para adicionar" />
      </div>

      {/* Sintomas */}
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-slate-700">Sintomas</legend>

        {symptoms.length === 0 && <p className="text-sm text-slate-400">Nenhum sintoma adicionado.</p>}

        {symptoms.map((symptom, i) => (
          <div key={i} className="flex flex-col gap-3 rounded-lg border border-slate-200 p-3 sm:flex-row sm:items-center">
            <input
              aria-label={`Nome do sintoma ${i + 1}`}
              list="symptom-suggestions"
              value={symptom.name}
              onChange={(e) => updateSymptom(i, { name: e.target.value })}
              placeholder="Ex.: azia"
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
          {COMMON_SYMPTOMS.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => addSymptom()}
            className="rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:border-teal-500 hover:text-teal-700"
          >
            + Adicionar sintoma
          </button>
          {unusedSuggestions.slice(0, 6).map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => addSymptom(name)}
              className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600 hover:bg-teal-50 hover:text-teal-700"
            >
              {name}
            </button>
          ))}
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
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30 sm:w-auto"
          />
        )}
      </div>

      {/* Observações */}
      <div className="space-y-2">
        <label htmlFor="notes" className="block text-sm font-medium text-slate-700">
          Observações <span className="font-normal text-slate-400">(opcional)</span>
        </label>
        <textarea
          id="notes"
          rows={2}
          maxLength={1000}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
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
