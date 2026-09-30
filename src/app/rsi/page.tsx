import RsiForm from '@/components/RsiForm';
import { formatDateTime } from '@/lib/dates';
import { RSI_MAX, RSI_THRESHOLD, rsiInterpretation } from '@/lib/rsi';
import { listRsi } from '@/lib/rsi-store';
import { OWNER_ID } from '@/lib/schema';

export const dynamic = 'force-dynamic';

export default async function RsiPage() {
  const history = await listRsi(OWNER_ID);
  const latest = history[0];

  return (
    <div className="space-y-8">
      <section className="space-y-2 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h1 className="text-lg font-semibold text-slate-900">Escala RSI (Índice de Sintomas de Refluxo)</h1>
        <p className="text-sm text-slate-600">
          Questionário de 9 perguntas usado por otorrinos para acompanhar o <strong>refluxo laringofaríngeo</strong>.
          Pontuação acima de {RSI_THRESHOLD} (de {RSI_MAX}) é compatível com o quadro. Responda cerca de uma vez por mês
          para ver se o tratamento e as mudanças na alimentação estão funcionando.
        </p>
        <p className="text-xs text-slate-400">Ferramenta de acompanhamento. Não substitui avaliação médica.</p>
      </section>

      {latest && (
        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h2 className="mb-4 font-semibold text-slate-900">Evolução</h2>
          <ul className="space-y-3">
            {history.map((a, i) => {
              const { elevated } = rsiInterpretation(a.total);
              const previous = history[i + 1];
              const delta = previous ? a.total - previous.total : null;
              return (
                <li key={a.id} className="space-y-1">
                  <div className="flex items-baseline justify-between gap-4 text-sm">
                    <span className="text-slate-500">{formatDateTime(a.answeredAt)}</span>
                    <span className="font-semibold tabular-nums">
                      {a.total}/{RSI_MAX}
                      {delta !== null && delta !== 0 && (
                        <span className={`ml-2 text-xs font-normal ${delta < 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {delta > 0 ? `+${delta}` : delta}
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="relative h-2 rounded bg-slate-100">
                    <div
                      className={`h-2 rounded ${elevated ? 'bg-rose-500' : 'bg-emerald-500'}`}
                      style={{ width: `${(a.total / RSI_MAX) * 100}%` }}
                    />
                    {/* Marca do limite de referência */}
                    <div
                      className="absolute -top-0.5 h-3 w-0.5 bg-slate-500"
                      style={{ left: `${(RSI_THRESHOLD / RSI_MAX) * 100}%` }}
                      title={`Limite de referência: ${RSI_THRESHOLD}`}
                    />
                  </div>
                  {a.notes && <p className="text-xs text-slate-500">{a.notes}</p>}
                </li>
              );
            })}
          </ul>
          <p className="mt-4 text-xs text-slate-400">
            O traço vertical marca o limite de {RSI_THRESHOLD}. Queda na pontuação indica melhora.
          </p>
        </section>
      )}

      <RsiForm />
    </div>
  );
}
