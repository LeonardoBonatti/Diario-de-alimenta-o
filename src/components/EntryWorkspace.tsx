'use client';

import { useState } from 'react';
import EntryForm from './EntryForm';
import RecentEntries from './RecentEntries';

export default function EntryWorkspace() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="space-y-8">
      <EntryForm onSaved={() => setRefreshKey((n) => n + 1)} />
      <RecentEntries refreshKey={refreshKey} />
    </div>
  );
}
