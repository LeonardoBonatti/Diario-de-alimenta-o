import { getLatestWeeklyReport } from '@/lib/report';

const fmt = (key: string) => key.split('-').reverse().join('/');

/** Server Component: mostra o último relatório gerado pelo cron de sábado. */
export default async function WeeklyReportCard({ userId }: { userId: string }) {
  const data = await getLatestWeeklyReport(userId);

  return (
    <section className="rounded-2xl bg-gradient-to-br from-teal-600 to-teal-700 p-6 text-white shadow-sm">
      <h2 className="text-lg font-semibold">Resumo semanal de refluxo</h2>
      {data === null ? (
        <p className="mt-2 text-sm text-teal-100">O primeiro resumo será gerado no próximo sábado às 20h.</p>
      ) : (
        <>
          <p className="mt-1 text-sm text-teal-100">
            {fmt(data.weekStart)} a {fmt(data.weekEnd)} · {data.entryCount} registros
          </p>
          {data.topTriggers.length === 0 ? (
            <p className="mt-4">Nenhum gatilho relevante na semana. 🎉</p>
          ) : (
            <ol className="mt-4 space-y-2">
              {data.topTriggers.map((t, i) => (
                <li key={t.food} className="flex items-baseline justify-between gap-4 rounded-lg bg-white/10 px-3 py-2">
                  <span>
                    <span className="mr-2 font-semibold">{i + 1}.</span>
                    {t.food}
                    <span className="ml-2 text-sm text-teal-100">{t.symptoms.map((s) => s.symptom).join(', ')}</span>
                  </span>
                  <span className="text-sm">
                    {t.timesFollowedBySymptom}/{t.timesEaten} · int. {t.avgIntensity.toFixed(1)}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </>
      )}
    </section>
  );
}
