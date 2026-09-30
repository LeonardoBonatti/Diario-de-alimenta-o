import 'server-only';
import { sql } from './db';
import { AppError, MEAL_TYPES, type Entry, type EntryInput, type MealType, type Symptom } from './types';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_TAG_LENGTH = 80;

const cleanTag = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');

/**
 * Valida e normaliza a entrada vinda do cliente. Server Actions são endpoints
 * públicos, então nada do formulário é confiável.
 */
export function normalizeEntryInput(input: EntryInput) {
  if (input.mealType !== null && !MEAL_TYPES.includes(input.mealType as MealType)) {
    throw new AppError('Tipo de refeição inválido.');
  }
  if (!Array.isArray(input.foods) || !Array.isArray(input.symptoms)) {
    throw new AppError('Dados inválidos.');
  }

  const foods = [...new Set(input.foods.filter((f) => typeof f === 'string').map(cleanTag).filter(Boolean))];
  if (foods.length > 50 || foods.some((f) => f.length > MAX_TAG_LENGTH)) {
    throw new AppError('Lista de alimentos muito longa.');
  }

  // Mesmo sintoma repetido: mantém a maior intensidade.
  const bySymptom = new Map<string, Symptom>();
  for (const s of input.symptoms) {
    const name = typeof s?.name === 'string' ? cleanTag(s.name) : '';
    if (!name) continue;
    if (name.length > MAX_TAG_LENGTH || !Number.isInteger(s.intensity) || s.intensity < 1 || s.intensity > 5) {
      throw new AppError('Sintoma inválido.');
    }
    const prev = bySymptom.get(name);
    if (!prev || s.intensity > prev.intensity) bySymptom.set(name, { name, intensity: s.intensity });
  }
  const symptoms = [...bySymptom.values()];
  if (symptoms.length > 20) throw new AppError('Sintomas demais em um registro.');

  if (foods.length === 0 && symptoms.length === 0) {
    throw new AppError('Informe ao menos um alimento ou um sintoma.');
  }

  const occurredAt = new Date(input.occurredAt);
  if (Number.isNaN(occurredAt.getTime())) throw new AppError('Data/hora inválida.');
  if (occurredAt.getTime() > Date.now() + 5 * 60_000) throw new AppError('A data/hora não pode estar no futuro.');

  const notes = typeof input.notes === 'string' ? input.notes.trim().slice(0, 1000) || null : null;

  return { mealType: input.mealType, foods, symptoms, occurredAt, notes };
}

function assertUuid(id: string) {
  if (!UUID_RE.test(id)) throw new AppError('Registro não encontrado.');
}

function entryFromRow(row: Record<string, unknown>): Entry {
  return {
    id: row.id as string,
    mealType: (row.meal_type as MealType | null) ?? null,
    foods: (row.foods as string[]) ?? [],
    symptoms: (row.symptoms as Symptom[]) ?? [],
    occurredAt: new Date(row.occurred_at as string | Date),
    notes: (row.notes as string | null) ?? null,
  };
}

export async function insertEntry(userId: string, input: EntryInput) {
  const e = normalizeEntryInput(input);
  await sql`
    insert into entries (user_id, meal_type, foods, symptoms, notes, occurred_at)
    values (${userId}, ${e.mealType}, ${e.foods}::text[], ${JSON.stringify(e.symptoms)}::jsonb,
            ${e.notes}, ${e.occurredAt.toISOString()})`;
}

export async function updateEntry(userId: string, id: string, input: EntryInput) {
  assertUuid(id);
  const e = normalizeEntryInput(input);
  // O filtro por user_id é a "regra de segurança": ninguém edita registro alheio.
  const rows = await sql`
    update entries
       set meal_type = ${e.mealType}, foods = ${e.foods}::text[], symptoms = ${JSON.stringify(e.symptoms)}::jsonb,
           notes = ${e.notes}, occurred_at = ${e.occurredAt.toISOString()}, updated_at = now()
     where id = ${id} and user_id = ${userId}
     returning id`;
  if (rows.length === 0) throw new AppError('Registro não encontrado.');
}

export async function deleteEntry(userId: string, id: string) {
  assertUuid(id);
  await sql`delete from entries where id = ${id} and user_id = ${userId}`;
}

/** Registros em [start, end), ordem cronológica. Usa o índice (user_id, occurred_at). */
export async function fetchEntriesInRange(userId: string, start: Date, end: Date): Promise<Entry[]> {
  const rows = await sql`
    select id, meal_type, foods, symptoms, notes, occurred_at
      from entries
     where user_id = ${userId}
       and occurred_at >= ${start.toISOString()}
       and occurred_at <  ${end.toISOString()}
     order by occurred_at asc`;
  return rows.map(entryFromRow);
}
