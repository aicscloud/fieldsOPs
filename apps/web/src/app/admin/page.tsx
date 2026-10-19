'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DataTable } from '@/components/DataTable';
import { Button, EmptyState, PageLoading } from '@/components/ui';
import { api, clearSession, getSession } from '@/lib/api';

type OrgRow = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  country: string;
  city?: string | null;
  createdAt: string;
  members: number;
  customers: number;
  workOrders: number;
};

type Payload = { count: number; organizations: OrgRow[] };

export default function PlatformAdminPage() {
  const router = useRouter();
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const session = getSession();
    if (session?.role !== 'PLATFORM_ADMIN') {
      router.replace('/admin/login');
      return;
    }
    api<Payload>('/platform/organizations')
      .then((payload) => {
        setData(payload);
        setError(null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Erreur'))
      .finally(() => setLoading(false));
  }, [router]);

  function logout() {
    clearSession();
    router.replace('/admin/login');
  }

  return (
    <main className="page" style={{ maxWidth: 1100, margin: '0 auto', minHeight: '100vh', width: '100%' }}>
      <header className="page-header">
        <div>
          <h1 style={{ margin: 0 }}>Plateforme</h1>
          <p className="muted" style={{ margin: '6px 0 0' }}>
            Organisations inscrites sur Intervenio
          </p>
        </div>
        <Button type="button" variant="secondary" onClick={logout}>
          Déconnexion
        </Button>
      </header>

      {error ? <div className="error-box">{error}</div> : null}
      {loading ? (
        <PageLoading height={48} rows={5} />
      ) : (
        <>
          <p style={{ fontSize: '2rem', margin: '8px 0 18px' }}>
            <strong>{data?.count ?? 0}</strong>{' '}
            <span className="muted" style={{ fontSize: '1rem' }}>
              organisation{(data?.count ?? 0) > 1 ? 's' : ''}
            </span>
          </p>
          {data?.organizations.length ? (
            <DataTable
              rows={data.organizations}
              rowKey={(row) => row.id}
              pageSize={20}
              columns={[
                {
                  key: 'name',
                  header: 'Organisation',
                  sortable: true,
                  sortValue: (row) => row.name,
                  render: (row) => <strong>{row.name}</strong>,
                },
                {
                  key: 'email',
                  header: 'E-mail',
                  render: (row) => row.email || '—',
                },
                {
                  key: 'place',
                  header: 'Lieu',
                  render: (row) => [row.city, row.country].filter(Boolean).join(', ') || '—',
                },
                {
                  key: 'members',
                  header: 'Comptes',
                  sortable: true,
                  sortValue: (row) => row.members,
                  render: (row) => row.members,
                },
                {
                  key: 'customers',
                  header: 'Clients',
                  sortable: true,
                  sortValue: (row) => row.customers,
                  render: (row) => row.customers,
                },
                {
                  key: 'workOrders',
                  header: 'Interventions',
                  sortable: true,
                  sortValue: (row) => row.workOrders,
                  render: (row) => row.workOrders,
                },
                {
                  key: 'createdAt',
                  header: 'Créée le',
                  sortable: true,
                  sortValue: (row) => row.createdAt,
                  render: (row) => new Date(row.createdAt).toLocaleDateString('fr-FR'),
                },
              ]}
            />
          ) : (
            <EmptyState title="Aucune organisation" />
          )}
        </>
      )}
    </main>
  );
}
