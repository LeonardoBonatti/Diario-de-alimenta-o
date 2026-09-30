'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { saveRsiAction } from '@/lib/actions';
import { RSI_ITEMS, RSI_MAX, rsiInterpretation } from '@/lib/rsi';

const SCORES = [0, 1, 2, 3, 4, 5];

export default function RsiForm() {
  const router = useRouter();
  const [answers, setAnswers] = useState<(number | null)[]>(() => RSI_ITEMS.map(() => null));
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ error: boolean; text: string } | null>(null);

  const answered = answers.filter((a) => a !== null).length;
  const total = answers.reduce<number>((sum, a) => sum + (a ?? 0), 0);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (answered < RSI_ITEMS.length) {
      setMessage({ error: true, text: 'Responda todos os itens (use 0 quando não houver problema).' });
      return;
    }
    setSaving(true);
    try {
      const result = await saveRsiAction(answers as number[], notes);
      if (!result.ok) {
        setMessage({ error: true, text: result.error });
        return;
      }
      setMessage({ error: false, text: `Salvo! Pontuação ${result.data}/${RSI_MAX}. ${rsiInterpretation(result.data).label}.` });
      setAnswers(RSI_ITEMS.map(() => null));
      setNotes('');
      router.refresh();
    } catch (err) {
      console.error(err);
      setMessage({ error: true, text: 'Não foi possível salvar. Verifique sua conexão.' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Nova avaliação</h2>
        <p className="mt-1 text-sm text-slate-500">
          No último mês, quanto cada item incomodou? <strong>0</strong> = nenhum problema, <strong>5</strong> = problema
          intenso.
        </p>
      </div>

      <ol className="space-y-4">
        {RSI_ITEMS.map((item, i) => (
          <li key={item} className="space-y-2">
            <p className="text-sm text-slate-800">
              <span className="mr-1 text-slate-400">{i + 1}.</span>
              {item}
            </p>
            <div role="radiogroup" aria-label={item} className="flex gap-1">
              {SCORES.map((score) => {
                const active = answers[i] === score;
                return (
                  <button
                    key={score}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setAnswers((prev) => prev.map((a, j) => (j === i ? score : a)))}
                    className={`h-9 w-9 rounded-full border text-sm font-semibold transition ${
                      active ? 'border-teal-600 bg-teal-600 text-white' : 'border-slate-300 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {score}
                  </button>
                );
              })}
            </div>
          </li>
        ))}
      </ol>

      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-700">
          Observações <span className="font-normal text-slate-400">(opcional: tratamento, remédios, mudanças)</span>
        </span>
        <textarea
          rows={2}
          maxLength={1000}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
        />
      </label>

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-teal-600 px-5 py-2.5 font-medium text-white hover:bg-teal-700 disabled:opacity-60"
        >
          {saving ? 'Salvando…' : 'Salvar avaliação'}
        </button>
        <span className="text-sm text-slate-500">
          {answered}/{RSI_ITEMS.length} respondidos · parcial {total}/{RSI_MAX}
        </span>
      </div>

      {message && (
        <p role="status" className={`text-sm ${message.error ? 'text-red-600' : 'text-teal-700'}`}>
          {message.text}
        </p>
      )}
    </form>
  );
}
