'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { DataTable } from '@/components/DataTable';
import { SearchSelect } from '@/components/SearchSelect';
import { Button, EmptyState, Modal, Skeleton } from '@/components/ui';
import { api } from '@/lib/api';
import { searchWorkOrders, STATUS_FILTER_OPTIONS } from '@/lib/search';

const EXPIRY_OPTIONS = [
  { value: 'active', label: 'Valide' },
  { value: 'expired', label: 'Expiré' },
];

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
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [expiry, setExpiry] = useState('');

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

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const now = Date.now();
    return links.filter((l) => {
      if (status && l.workOrder?.status !== status) return false;
      const expired = l.expiresAt ? new Date(l.expiresAt).getTime() < now : false;
      if (expiry === 'expired' && !expired) return false;
      if (expiry === 'active' && expired) return false;
      if (!needle) return true;
      const hay = `${l.workOrder?.number ?? ''} ${l.workOrder?.title ?? ''}`.toLowerCase();
      return hay.includes(needle);
    });
  }, [links, q, status, expiry]);

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
        <>
          <div className="filters">
            <input
              className="input"
              placeholder="Recherche"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label="Recherche"
            />
            <SearchSelect
              compact
              value={status}
              selectedLabel={STATUS_FILTER_OPTIONS.find((o) => o.value === status)?.label}
              placeholder="Statut"
              staticOptions={STATUS_FILTER_OPTIONS}
              loadOptions={async () => STATUS_FILTER_OPTIONS}
              onChange={setStatus}
              allowClear
            />
            <SearchSelect
              compact
              value={expiry}
              selectedLabel={EXPIRY_OPTIONS.find((o) => o.value === expiry)?.label}
              placeholder="Validité"
              staticOptions={EXPIRY_OPTIONS}
              loadOptions={async () => EXPIRY_OPTIONS}
              onChange={setExpiry}
              allowClear
            />
          </div>
          <DataTable
          rows={filtered}
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
        </>
      )}
    </AppShell>
  );
}
