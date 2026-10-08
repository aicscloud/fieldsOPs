import { Suspense } from 'react';
import WorkOrdersClient from './page-client';
import { Skeleton } from '@/components/ui';

export default function WorkOrdersPage() {
  return (
    <Suspense
      fallback={
        <div className="page">
          <Skeleton height={320} />
        </div>
      }
    >
      <WorkOrdersClient />
    </Suspense>
  );
}
