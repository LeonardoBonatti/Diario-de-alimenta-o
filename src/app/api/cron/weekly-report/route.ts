import { NextResponse } from 'next/server';
import { correlate, DEFAULT_WINDOW_HOURS, topTriggers, type FoodStat } from '@/lib/correlation';
import { addDays, HOUR_MS, rangeFromDateKeys, toDateKey } from '@/lib/dates';
import { sql } from '@/lib/db';
import { fetchEntriesInRange } from '@/lib/entries';
import { OWNER_ID } from '@/lib/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface WeekContext {
  weekStartKey: string;
  weekEndKey: string;
  start: Date;
  end: Date;
  lookbackStart: Date;
}

interface UserRow {
  id: string;
  email: string;
  notify_by_email: boolean;
}

/**
 * Disparado pelo Vercel Cron todo sábado às 20h (BRT); ver vercel.json.
 * Semana coberta: domingo 00:00 até sábado 23:59 (fuso do app).
 * Idempotente: re-execuções atualizam a mesma linha e não reenviam e-mail.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const weekEndKey = toDateKey(new Date());
  const weekStartKey = addDays(weekEndKey, -6);
  const { start, end } = rangeFromDateKeys(weekStartKey, weekEndKey);
  const ctx: WeekContext = {
    weekStartKey,
    weekEndKey,
    start,
    end,
    lookbackStart: new Date(start.getTime() - DEFAULT_WINDOW_HOURS * HOUR_MS),
  };

  // Usuário único; o e-mail do resumo vem de REPORT_EMAIL_TO (opcional).
  const recipient = process.env.REPORT_EMAIL_TO ?? '';
  const owner: UserRow = { id: OWNER_ID, email: recipient, notify_by_email: Boolean(recipient) };

  try {
    const result = await processUser(owner, ctx);
    return NextResponse.json({ week: `${weekStartKey}..${weekEndKey}`, ok: true, ...result });
  } catch (err) {
    console.error('[weekly-report] falha', err);
    return NextResponse.json({ week: `${weekStartKey}..${weekEndKey}`, ok: false }, { status: 500 });
  }
}

async function processUser(user: UserRow, ctx: WeekContext) {
  const entries = await fetchEntriesInRange(user.id, ctx.lookbackStart, ctx.end);
  const report = correlate(entries, { periodStart: ctx.start, periodEnd: ctx.end });
  const triggers = topTriggers(report);
  const entryCount = entries.filter((e) => e.occurredAt >= ctx.start).length;

  await sql`
    insert into weekly_reports (user_id, week_start, week_end, entry_count, top_triggers, report, generated_at)
    values (${user.id}, ${ctx.weekStartKey}, ${ctx.weekEndKey}, ${entryCount},
            ${JSON.stringify(triggers)}::jsonb, ${JSON.stringify(report)}::jsonb, now())
    on conflict (user_id, week_start) do update
      set week_end = excluded.week_end, entry_count = excluded.entry_count,
          top_triggers = excluded.top_triggers, report = excluded.report, generated_at = now()`;

  let emailed = false;
  if (user.notify_by_email && entryCount > 0 && process.env.RESEND_API_KEY) {
    // "Reserva" o envio atomicamente: execuções concorrentes não mandam e-mail duplicado.
    const claimed = await sql`
      update weekly_reports set emailed_at = now()
       where user_id = ${user.id} and week_start = ${ctx.weekStartKey} and emailed_at is null
       returning 1`;
    if (claimed.length > 0) {
      try {
        await sendReportEmail(user.email, ctx, triggers, entryCount);
        emailed = true;
      } catch (err) {
        await sql`update weekly_reports set emailed_at = null
                   where user_id = ${user.id} and week_start = ${ctx.weekStartKey}`;
        throw err;
      }
    }
  }

  return { entryCount, triggers: triggers.length, emailed };
}

async function sendReportEmail(to: string, ctx: WeekContext, triggers: FoodStat[], entryCount: number) {
  const period = `${formatKey(ctx.weekStartKey)} a ${formatKey(ctx.weekEndKey)}`;
  const rows = triggers
    .map(
      (t) => `<tr>
        <td style="padding:6px 12px">${escapeHtml(t.food)}</td>
        <td style="padding:6px 12px">${t.timesFollowedBySymptom}/${t.timesEaten}</td>
        <td style="padding:6px 12px">${t.avgIntensity.toFixed(1)}</td>
        <td style="padding:6px 12px">${escapeHtml(t.symptoms.map((s) => s.symptom).join(', '))}</td>
      </tr>`,
    )
    .join('');

  const body = triggers.length
    ? `<table style="border-collapse:collapse;font-size:14px">
         <thead><tr style="text-align:left;background:#f1f5f9">
           <th style="padding:6px 12px">Alimento</th><th style="padding:6px 12px">Com sintoma</th>
           <th style="padding:6px 12px">Intensidade média</th><th style="padding:6px 12px">Sintomas</th>
         </tr></thead><tbody>${rows}</tbody></table>`
    : '<p>Nenhum alimento se destacou como gatilho nesta semana. 🎉</p>';

  const html = `<div style="font-family:system-ui,sans-serif;color:#0f172a">
    <h2>Seu resumo semanal (${period})</h2>
    <p>${entryCount} registros na semana. Principais possíveis gatilhos:</p>
    ${body}
    <p style="font-size:12px;color:#64748b">Correlação não é causalidade — discuta os padrões com um profissional de saúde.</p>
    ${process.env.APP_URL ? `<p><a href="${process.env.APP_URL}/dashboard">Abrir o dashboard</a></p>` : ''}
  </div>`;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.REPORT_EMAIL_FROM,
      to: [to],
      subject: `Diário alimentar — resumo de ${period}`,
      html,
    }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
}

const formatKey = (key: string) => key.split('-').reverse().join('/');

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}
