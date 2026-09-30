'use client';

import { useState, type FormEvent } from 'react';
import { getReportAction } from '@/lib/actions';
import { DEFAULT_WINDOW_HOURS, type CorrelationReport, type FactorStat } from '@/lib/correlation';
import { addDays, toDateKey } from '@/lib/dates';
import { isCommonTrigger } from '@/lib/reflux';

const WINDOW_OPTIONS = [2, 4, 6, 12, 24];
const pct = (rate: number) => `${Math.round(rate * 100)}%`;

export default function ReportView() {
  const today = toDateKey(new Date());
  const [from, setFrom] = useState(addDays(today, -6));
  const [to, setTo] = useState(today);
  const [windowHours, setWindowHours] = useState(DEFAULT_WINDOW_HOURS);
  const [refluxOnly, setRefluxOnly] = useState(true);
  const [report, setReport] = useState<CorrelationReport | null>(null);
  const [reportRefluxOnly, setReportRefluxOnly] = useState(true);
  const [entryCount, setEntryCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await getReportAction(from, to, windowHours, refluxOnly);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setReport(result.data.report);
      setReportRefluxOnly(refluxOnly);
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
  const symptomWord = reportRefluxOnly ? 'sintoma de refluxo' : 'sintoma';

  return (
    <section className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-wrap items-end gap-4">
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
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={refluxOnly}
            onChange={(e) => setRefluxOnly(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
          />
          Considerar apenas sintomas de refluxo (garganta, voz, azia, regurgitação…)
        </label>
        <p className="text-xs text-slate-400">
          Sintomas de garganta do refluxo laringofaríngeo podem surgir horas depois. Se aparecem tarde, aumente a janela
          (12h ou 24h).
        </p>
      </form>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {report && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Registros" value={entryCount} />
            <Stat label="Refeições" value={report.totalMeals} />
            <Stat label={`Seguidas de ${symptomWord}`} value={report.mealsFollowedBySymptom} />
            <Stat label="Taxa-base" value={pct(report.baselineRate)} />
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h3 className="mb-4 font-semibold">Alimentos × {reportRefluxOnly ? 'sintomas de refluxo' : 'sintomas'}</h3>
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
                        <td className="py-2 pr-4 font-medium">
                          {f.food}
                          {isCommonTrigger(f.food) && (
                            <span
                              title="Alimento frequentemente associado ao refluxo"
                              className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-normal text-amber-800"
                            >
                              gatilho comum
                            </span>
                          )}
                        </td>
                        <td className="py-2 pr-4">
                          {f.timesFollowedBySymptom}/{f.timesEaten}
                          <div className="mt-1 h-1.5 w-24 rounded bg-slate-100">
                            <div className="h-1.5 rounded bg-rose-500" style={{ width: pct(f.symptomRate) }} />
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
              Correlação não é causalidade: use os padrões para conversar com o médico.
            </p>
          </div>

          {report.factors.length > 0 && <FactorsCard factors={report.factors} symptomWord={symptomWord} />}

          {report.symptoms.length > 0 && (
            <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <h3 className="mb-4 font-semibold">{reportRefluxOnly ? 'Sintomas de refluxo no período' : 'Sintomas no período'}</h3>
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

function FactorsCard({ factors, symptomWord }: { factors: FactorStat[]; symptomWord: string }) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <h3 className="font-semibold">Hábitos × {symptomWord}</h3>
      <p className="mb-4 mt-1 text-xs text-slate-500">
        Porcentagem das refeições seguidas de {symptomWord}, com e sem cada hábito.
      </p>
      <div className="space-y-4">
        {factors.map((f) => {
          const known = f.withMeals + f.withoutMeals;
          return (
            <div key={f.factor} className="space-y-1.5">
              <p className="text-sm font-medium text-slate-700">{f.factor}</p>
              {known === 0 ? (
                <p className="text-xs text-slate-400">Ainda sem dados. Marque esse hábito nos registros.</p>
              ) : (
                <>
                  <FactorBar label="Com" rate={f.withRate} count={`${f.withFollowed}/${f.withMeals}`} tone="bg-rose-500" />
                  <FactorBar label="Sem" rate={f.withoutRate} count={`${f.withoutFollowed}/${f.withoutMeals}`} tone="bg-slate-400" />
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FactorBar({ label, rate, count, tone }: { label: string; rate: number; count: string; tone: string }) {
  return (
    <div className="flex items-center gap-3 text-xs text-slate-600">
      <span className="w-8">{label}</span>
      <div className="h-2 flex-1 rounded bg-slate-100">
        <div className={`h-2 rounded ${tone}`} style={{ width: pct(rate) }} />
      </div>
      <span className="w-20 text-right tabular-nums">
        {pct(rate)} ({count})
      </span>
    </div>
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
