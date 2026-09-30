'use client';

import { useState, type FormEvent } from 'react';
import { getReportAction } from '@/lib/actions';
import { DEFAULT_WINDOW_HOURS, type CorrelationReport } from '@/lib/correlation';
import { addDays, toDateKey } from '@/lib/dates';

const WINDOW_OPTIONS = [2, 4, 6, 12, 24];

export default function ReportView() {
  const today = toDateKey(new Date());
  const [from, setFrom] = useState(addDays(today, -6));
  const [to, setTo] = useState(today);
  const [windowHours, setWindowHours] = useState(DEFAULT_WINDOW_HOURS);
  const [report, setReport] = useState<CorrelationReport | null>(null);
  const [entryCount, setEntryCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await getReportAction(from, to, windowHours);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setReport(result.data.report);
      setEntryCount(result.data.entryCount);
    } catch (err) {
      console.error(err);
      setError('Erro ao gerar relatório. Verifique sua conexão.');
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    'rounded-lg border border-slate-300 px-3 py-2 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30';

  return (
    <section className="space-y-6">
      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Data inicial
          <input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className={inputClass} required />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Data final
          <input type="date" value={to} min={from} max={today} onChange={(e) => setTo(e.target.value)} className={inputClass} required />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Janela após refeição
          <select value={windowHours} onChange={(e) => setWindowHours(Number(e.target.value))} className={inputClass}>
            {WINDOW_OPTIONS.map((h) => (
              <option key={h} value={h}>
                até {h}h
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-teal-600 px-5 py-2.5 font-medium text-white hover:bg-teal-700 disabled:opacity-60"
        >
          {loading ? 'Gerando…' : 'Gerar relatório'}
        </button>
      </form>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {report && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Registros" value={entryCount} />
            <Stat label="Refeições" value={report.totalMeals} />
            <Stat label="Seguidas de sintoma" value={report.mealsFollowedBySymptom} />
            <Stat label="Taxa-base" value={`${Math.round(report.baselineRate * 100)}%`} />
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h3 className="mb-4 font-semibold">Alimentos × sintomas</h3>
            {report.foods.length === 0 ? (
              <p className="text-sm text-slate-400">Nenhuma refeição no período.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs uppercase text-slate-500">
                    <tr>
                      <th className="py-2 pr-4">Alimento</th>
                      <th className="py-2 pr-4">Com sintoma</th>
                      <th className="py-2 pr-4">Intens. média</th>
                      <th className="py-2 pr-4">Sintomas associados</th>
                      <th className="py-2">Índice</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {report.foods.map((f) => (
                      <tr key={f.food} className={f.lowConfidence ? 'text-slate-400' : ''}>
                        <td className="py-2 pr-4 font-medium">{f.food}</td>
                        <td className="py-2 pr-4">
                          {f.timesFollowedBySymptom}/{f.timesEaten}
                          <div className="mt-1 h-1.5 w-24 rounded bg-slate-100">
                            <div className="h-1.5 rounded bg-orange-500" style={{ width: `${f.symptomRate * 100}%` }} />
                          </div>
                        </td>
                        <td className="py-2 pr-4">{f.avgIntensity ? f.avgIntensity.toFixed(1) : '—'}</td>
                        <td className="py-2 pr-4">{f.symptoms.map((s) => `${s.symptom} (${s.count})`).join(', ') || '—'}</td>
                        <td className="py-2 font-semibold">{f.score.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="mt-4 text-xs text-slate-400">
              Itens em cinza têm menos de 3 ocorrências. Índice = taxa de sintoma × intensidade × confiança da amostra.
              Correlação não é causalidade.
            </p>
          </div>

          {report.symptoms.length > 0 && (
            <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <h3 className="mb-4 font-semibold">Sintomas no período</h3>
              <ul className="space-y-1 text-sm">
                {report.symptoms.map((s) => (
                  <li key={s.symptom}>
                    <span className="font-medium">{s.symptom}</span>: {s.count}× · intensidade média {s.avgIntensity.toFixed(1)}
                    {s.unattributed > 0 && <span className="text-slate-400"> · {s.unattributed} sem refeição na janela</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-2xl font-semibold">{value}</p>
    </div>
  );
}
