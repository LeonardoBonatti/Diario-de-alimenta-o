'use server';

import { auth } from './auth';
import { DAY_MS } from './dates';
import { deleteEntry, fetchEntriesInRange, insertEntry, updateEntry } from './entries';
import { getReportForRange } from './report';
import { AppError, type EntryInput } from './types';

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

/**
 * Toda Server Action passa por aqui: exige sessão e converte erros em
 * resultado (em produção, exceções lançadas chegam mascaradas ao cliente).
 */
async function run<T>(fn: (userId: string) => Promise<T>): Promise<ActionResult<T>> {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new AppError('Sessão expirada. Entre novamente.');
    return { ok: true, data: await fn(session.user.id) };
  } catch (err) {
    if (err instanceof AppError) return { ok: false, error: err.message };
    console.error(err);
    return { ok: false, error: 'Erro inesperado. Tente novamente.' };
  }
}

export async function createEntryAction(input: EntryInput) {
  return run((userId) => insertEntry(userId, input));
}

export async function updateEntryAction(id: string, input: EntryInput) {
  return run((userId) => updateEntry(userId, id, input));
}

export async function deleteEntryAction(id: string) {
  return run((userId) => deleteEntry(userId, id));
}

export async function listRecentEntriesAction() {
  return run(async (userId) => {
    const entries = await fetchEntriesInRange(
      userId,
      new Date(Date.now() - 7 * DAY_MS),
      new Date(Date.now() + DAY_MS),
    );
    return entries.reverse();
  });
}

export async function getReportAction(fromKey: string, toKey: string, windowHours: number) {
  return run((userId) => getReportForRange(userId, fromKey, toKey, windowHours));
}
