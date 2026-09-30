import 'server-only';
import { sql } from './db';
import { RSI_ITEMS } from './rsi';
import { AppError } from './types';

export interface RsiAssessment {
  id: string;
  answeredAt: Date;
  answers: number[];
  total: number;
  notes: string | null;
}

export async function insertRsi(userId: string, answers: number[], notes?: string | null): Promise<number> {
  if (
    !Array.isArray(answers) ||
    answers.length !== RSI_ITEMS.length ||
    answers.some((a) => !Number.isInteger(a) || a < 0 || a > 5)
  ) {
    throw new AppError('Responda todos os itens com uma nota de 0 a 5.');
  }
  const total = answers.reduce((sum, a) => sum + a, 0);
  const cleanNotes = typeof notes === 'string' ? notes.trim().slice(0, 1000) || null : null;

  await sql`
    insert into rsi_assessments (user_id, answers, total, notes)
    values (${userId}, ${answers}::smallint[], ${total}, ${cleanNotes})`;
  return total;
}

export async function listRsi(userId: string, limit = 24): Promise<RsiAssessment[]> {
  const rows = await sql`
    select id, answered_at, answers, total, notes
      from rsi_assessments
     where user_id = ${userId}
     order by answered_at desc
     limit ${limit}`;
  return rows.map((r) => ({
    id: r.id,
    answeredAt: new Date(r.answered_at),
    answers: (r.answers as unknown[]).map(Number),
    total: Number(r.total),
    notes: r.notes ?? null,
  }));
}
