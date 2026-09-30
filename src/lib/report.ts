import 'server-only';
import { correlate, DEFAULT_WINDOW_HOURS, type CorrelationReport, type FoodStat } from './correlation';
import { DATE_KEY_RE, DAY_MS, HOUR_MS, rangeFromDateKeys } from './dates';
import { sql } from './db';
import { fetchEntriesInRange } from './entries';
import { AppError } from './types';

export const MAX_RANGE_DAYS = 366;
const MAX_WINDOW_HOURS = 48;

export interface RangeReport {
  entryCount: number;
  report: CorrelationReport;
}

/**
 * Filtro por datas do dashboard.
 *
 * 1. Valida as datas "YYYY-MM-DD" (inclusivas) e converte para o intervalo
 *    semiaberto [início do dia inicial, início do dia seguinte ao final).
 * 2. Estende o início para trás em `windowHours`: um sintoma às 01h do dia
 *    inicial pode ter sido causado pelo jantar da véspera.
 * 3. Faz UMA consulta de range em occurred_at e roda a correlação em memória.
 */
export async function getReportForRange(
  userId: string,
  fromKey: string,
  toKey: string,
  windowHours = DEFAULT_WINDOW_HOURS,
): Promise<RangeReport> {
  if (!DATE_KEY_RE.test(fromKey) || !DATE_KEY_RE.test(toKey)) {
    throw new AppError('Datas inválidas. Use o formato AAAA-MM-DD.');
  }
  if (fromKey > toKey) {
    throw new AppError('A data inicial deve ser anterior ou igual à data final.');
  }
  if (!Number.isInteger(windowHours) || windowHours < 1 || windowHours > MAX_WINDOW_HOURS) {
    throw new AppError(`A janela deve ficar entre 1 e ${MAX_WINDOW_HOURS} horas.`);
  }

  const { start, end } = rangeFromDateKeys(fromKey, toKey);
  if ((end.getTime() - start.getTime()) / DAY_MS > MAX_RANGE_DAYS) {
    throw new AppError(`O intervalo máximo é de ${MAX_RANGE_DAYS} dias.`);
  }

  const lookbackStart = new Date(start.getTime() - windowHours * HOUR_MS);
  const entries = await fetchEntriesInRange(userId, lookbackStart, end);

  return {
    entryCount: entries.filter((e) => e.occurredAt >= start).length,
    report: correlate(entries, { periodStart: start, periodEnd: end, windowHours }),
  };
}

export interface WeeklyReportSummary {
  weekStart: string;
  weekEnd: string;
  entryCount: number;
  topTriggers: FoodStat[];
}

export async function getLatestWeeklyReport(userId: string): Promise<WeeklyReportSummary | null> {
  const rows = await sql`
    select week_start::text as week_start, week_end::text as week_end, entry_count, top_triggers
      from weekly_reports
     where user_id = ${userId}
     order by week_start desc
     limit 1`;
  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    weekStart: r.week_start,
    weekEnd: r.week_end,
    entryCount: r.entry_count,
    topTriggers: r.top_triggers,
  };
}
