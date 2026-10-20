import { Suspense } from 'react';
import ContractsClient from './page-client';
import { PageLoading } from '@/components/ui';

export default function ContractsPage() {
  return (
    <Suspense
      fallback={
        <div className="page">
          <PageLoading height={320} />
        </div>
      }
    >
      <ContractsClient />
    </Suspense>
  );
}
