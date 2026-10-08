'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { DataTable } from '@/components/DataTable';
import { SearchSelect } from '@/components/SearchSelect';
import { Button, EmptyState, Modal, Skeleton } from '@/components/ui';
import { api } from '@/lib/api';
import { searchWorkOrders } from '@/lib/search';

type PortalLink = {
  id: string;
  token: string;
  expiresAt?: string | null;
  workOrder?: { number: string; title: string; status: string };
};

export default function PortalAdminPage() {
  const [links, setLinks] = useState<PortalLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [createdUrl, setCreatedUrl] = useState<string | null>(null);
  const [workOrderId, setWorkOrderId] = useState('');
  const [workOrderLabel, setWorkOrderLabel] = useState('');

  async function load() {
    setLoading(true);
    try {
      const l = await api<PortalLink[]>('/portal/links');
      setLinks(l);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!workOrderId) {
      setError('Choisissez une intervention');
      return;
    }
    try {
      const link = await api<{ token: string }>(
        `/portal/work-orders/${workOrderId}/link`,
        { method: 'POST' },
      );
      const url = `${window.location.origin}/p/${link.token}`;
      setCreatedUrl(url);
      setOpen(false);
      setWorkOrderId('');
      setWorkOrderLabel('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Création impossible');
    }
  }

  return (
    <AppShell
      title="Portail client"
      actions={<Button onClick={() => setOpen(true)}>Générer un lien</Button>}
    >
      {error ? <div className="error-box" style={{ marginBottom: 12 }}>{error}</div> : null}
      {createdUrl ? (
        <div className="success-box" style={{ marginBottom: 12 }}>
          Lien créé : <a href={createdUrl}>{createdUrl}</a>
        </div>
      ) : null}

      <Modal open={open} title="Lien portail" onClose={() => setOpen(false)}>
        <form className="form-stack" onSubmit={onSubmit}>
          <SearchSelect
            label="Intervention"
            value={workOrderId}
            selectedLabel={workOrderLabel}
            placeholder="Rechercher une intervention…"
            loadOptions={searchWorkOrders}
            onChange={(id, opt) => {
              setWorkOrderId(id);
              setWorkOrderLabel(opt?.label ?? '');
            }}
            required
          />
          <Button type="submit">Générer</Button>
        </form>
      </Modal>

      {loading ? (
        <Skeleton height={220} />
      ) : (
        <DataTable
          rows={links}
          rowKey={(l) => l.id}
          defaultSortKey="workOrder"
          empty={
            <EmptyState title="Aucun lien" description="Générez un lien pour une intervention." />
          }
          columns={[
            {
              key: 'workOrder',
              header: 'Intervention',
              sortValue: (l) => `${l.workOrder?.number ?? ''} ${l.workOrder?.title ?? ''}`,
              render: (l) => (
                <>
                  {l.workOrder?.number} {l.workOrder?.title}
                </>
              ),
            },
            {
              key: 'link',
              header: 'Lien',
              sortable: false,
              render: (l) => {
                const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/p/${l.token}`;
                return (
                  <a href={url} target="_blank" rel="noreferrer">
                    Ouvrir
                  </a>
                );
              },
            },
            {
              key: 'expiresAt',
              header: 'Expire',
              sortValue: (l) => (l.expiresAt ? new Date(l.expiresAt) : null),
              render: (l) =>
                l.expiresAt ? new Date(l.expiresAt).toLocaleDateString('fr-FR') : '',
            },
          ]}
        />
      )}
    </AppShell>
  );
}
