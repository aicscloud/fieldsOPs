import { Suspense } from 'react';
import WorkOrdersClient from './page-client';
import { PageLoading } from '@/components/ui';

export default function WorkOrdersPage() {
  return (
    <Suspense
      fallback={
        <div className="page">
          <PageLoading height={320} />
        </div>
      }
    >
      <WorkOrdersClient />
    </Suspense>
  );
}
