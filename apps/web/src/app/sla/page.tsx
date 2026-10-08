'use client';

import { AppShell } from '@/components/AppShell';
import { EmptyState } from '@/components/ui';

export default function SlaPage() {
  return (
    <AppShell
      title="SLA / Contrats"
    >
      <EmptyState
        title="Module à venir"
        description="Définissez des délais (4h, 24h…), suivez les retards et liez-les aux clients."
      />
    </AppShell>
  );
}
