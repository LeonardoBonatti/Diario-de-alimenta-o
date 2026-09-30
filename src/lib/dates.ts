/**
 * Todas as datas "de calendário" (filtros, dateKey, semana do relatório) são
 * interpretadas no fuso do usuário. O Brasil não tem horário de verão desde
 * 2019, então o offset fixo é seguro para America/Sao_Paulo.
 */
export const APP_TZ = 'America/Sao_Paulo';
export const APP_UTC_OFFSET = '-03:00';

export const HOUR_MS = 3_600_000;
export const DAY_MS = 24 * HOUR_MS;
export const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

const dateKeyFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: APP_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const hourFormatter = new Intl.DateTimeFormat('en-GB', { timeZone: APP_TZ, hour: '2-digit', hourCycle: 'h23' });

/** Hora do dia (0–23) no fuso do app. */
export function hourInTz(d: Date): number {
  return Number(hourFormatter.format(d));
}

/** Date -> "YYYY-MM-DD" no fuso do app. */
export function toDateKey(d: Date): string {
  return dateKeyFormatter.format(d);
}

/** "YYYY-MM-DD" -> instante da meia-noite desse dia no fuso do app. */
export function startOfDay(dateKey: string): Date {
  return new Date(`${dateKey}T00:00:00${APP_UTC_OFFSET}`);
}

export function addDays(dateKey: string, days: number): string {
  return toDateKey(new Date(startOfDay(dateKey).getTime() + days * DAY_MS));
}

/** Intervalo semiaberto [start, end) cobrindo os dias inteiros de from até to. */
export function rangeFromDateKeys(from: string, to: string): { start: Date; end: Date } {
  return { start: startOfDay(from), end: startOfDay(addDays(to, 1)) };
}

/** Valor para <input type="datetime-local"> no horário local do navegador. */
export function toDatetimeLocalValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatDateTime(d: Date): string {
  return d.toLocaleString('pt-BR', { timeZone: APP_TZ, dateStyle: 'short', timeStyle: 'short' });
}
