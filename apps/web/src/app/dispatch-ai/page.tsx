'use client';

import { AppShell } from '@/components/AppShell';
import { EmptyState } from '@/components/ui';

export default function DispatchAiPage() {
  return (
    <AppShell
      title="IA dispatch"
    >
      <EmptyState
        title="Module à venir"
        description="Proposition automatique de technicien selon distance, charge et compétences."
      />
    </AppShell>
  );
}
