'use client';

import { useEffect, useState } from 'react';
import { deleteEntryAction, listRecentEntriesAction } from '@/lib/actions';
import { formatDateTime } from '@/lib/dates';
import { MEAL_LABELS, type Entry } from '@/lib/types';
import EntryForm from './EntryForm';

interface Props {
  /** Mude este valor para forçar o recarregamento (ex.: após salvar). */
  refreshKey: number;
}

export default function RecentEntries({ refreshKey }: Props) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [editing, setEditing] = useState<Entry | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    listRecentEntriesAction()
      .then((res) => (res.ok ? setEntries(res.data) : setError(res.error)))
      .catch(console.error);
  }, [refreshKey, reload]);

  async function handleDelete(entry: Entry) {
    if (!confirm('Excluir este registro?')) return;
    const res = await deleteEntryAction(entry.id);
    if (!res.ok) setError(res.error);
    setReload((n) => n + 1);
  }

  if (editing) {
    return (
      <EntryForm
        key={editing.id}
        initial={editing}
        onCancel={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          setReload((n) => n + 1);
        }}
      />
    );
  }

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">Últimos 7 dias</h2>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {entries.length === 0 && !error && <p className="text-sm text-slate-400">Nenhum registro ainda.</p>}
      <ul className="space-y-2">
        {entries.map((e) => (
          <li key={e.id} className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <p className="text-xs text-slate-500">
                  {formatDateTime(e.occurredAt)}
                  {e.mealType && ` · ${MEAL_LABELS[e.mealType]}`}
                </p>
                {e.foods.length > 0 && <p className="text-sm">{e.foods.join(', ')}</p>}
                {e.symptoms.length > 0 && (
                  <p className="text-sm text-orange-700">
                    {e.symptoms.map((s) => `${s.name} (${s.intensity})`).join(', ')}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 gap-3 text-sm">
                <button onClick={() => setEditing(e)} className="text-teal-700 hover:underline">
                  Editar
                </button>
                <button onClick={() => handleDelete(e)} className="text-red-600 hover:underline">
                  Excluir
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
