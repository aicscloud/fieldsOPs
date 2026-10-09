'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { DataTable } from '@/components/DataTable';
import { SearchSelect } from '@/components/SearchSelect';
import { Button, EmptyState, Modal, PageLoading } from '@/components/ui';
import { api } from '@/lib/api';

const TYPE_OPTIONS = [
  { value: 'COMPANY', label: 'Entreprise' },
  { value: 'INDIVIDUAL', label: 'Particulier' },
];

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Actif' },
  { value: 'INACTIVE', label: 'Inactif' },
];

type Customer = {
  id: string;
  name: string;
  type: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  notes?: string | null;
  status: string;
  _count?: { sites: number; workOrders: number };
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [customerType, setCustomerType] = useState('COMPANY');
  const [customerStatus, setCustomerStatus] = useState('ACTIVE');
  const [q, setQ] = useState('');
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');

  async function load() {
    setLoading(true);
    try {
      setCustomers(await api<Customer[]>('/customers'));
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
    return customers.filter((c) => {
      if (type && c.type !== type) return false;
      if (status && c.status !== status) return false;
      if (!needle) return true;
      const hay = `${c.name} ${c.email ?? ''} ${c.phone ?? ''}`.toLowerCase();
      return hay.includes(needle);
    });
  }, [customers, q, type, status]);

  function closeForm() {
    setShowForm(false);
    setEditing(null);
    setCustomerType('COMPANY');
    setCustomerStatus('ACTIVE');
  }

  function openCreate() {
    setEditing(null);
    setCustomerType('COMPANY');
    setCustomerStatus('ACTIVE');
    setShowForm(true);
  }

  function openEdit(customer: Customer) {
    setShowForm(false);
    setEditing(customer);
    setCustomerType(customer.type);
    setCustomerStatus(customer.status);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const body = {
      type: customerType,
      name: form.get('name'),
      email: form.get('email') || undefined,
      phone: form.get('phone') || undefined,
      address: form.get('address') || undefined,
      notes: form.get('notes') || undefined,
      ...(editing ? { status: customerStatus } : {}),
    };
    try {
      if (editing) {
        await api(`/customers/${editing.id}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        });
      } else {
        await api('/customers', {
          method: 'POST',
          body: JSON.stringify(body),
        });
      }
      closeForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enregistrement impossible');
    }
  }

  return (
    <AppShell
      title="Clients"
      actions={
        <div className="row">
          <Link className="btn btn-secondary" href="/sites">
            Voir les sites
          </Link>
          <Button onClick={openCreate}>Nouveau client</Button>
        </div>
      }
    >
      {error ? <div className="error-box" style={{ marginBottom: 12 }}>{error}</div> : null}
      <Modal
        open={showForm || !!editing}
        title={editing ? 'Modifier le client' : 'Nouveau client'}
        onClose={closeForm}
      >
        <form className="form-stack" key={editing?.id ?? 'new'} onSubmit={onSubmit}>
          <SearchSelect
            label="Type"
            value={customerType}
            selectedLabel={TYPE_OPTIONS.find((t) => t.value === customerType)?.label}
            staticOptions={TYPE_OPTIONS}
            loadOptions={async () => TYPE_OPTIONS}
            onChange={setCustomerType}
            allowClear={false}
            required
          />
          <label className="field">
            <span>Nom</span>
            <input className="input" name="name" required defaultValue={editing?.name} />
          </label>
          <label className="field">
            <span>Email</span>
            <input className="input" name="email" type="email" defaultValue={editing?.email ?? ''} />
          </label>
          <label className="field">
            <span>Téléphone</span>
            <input className="input" name="phone" defaultValue={editing?.phone ?? ''} />
          </label>
          <label className="field">
            <span>Adresse</span>
            <input className="input" name="address" defaultValue={editing?.address ?? ''} />
          </label>
          <label className="field">
            <span>Notes</span>
            <input className="input" name="notes" defaultValue={editing?.notes ?? ''} />
          </label>
          {editing ? (
            <SearchSelect
              label="Statut"
              value={customerStatus}
              selectedLabel={STATUS_OPTIONS.find((s) => s.value === customerStatus)?.label}
              staticOptions={STATUS_OPTIONS}
              loadOptions={async () => STATUS_OPTIONS}
              onChange={setCustomerStatus}
              allowClear={false}
            />
          ) : null}
          <Button type="submit">Enregistrer</Button>
        </form>
      </Modal>

      {loading ? (
        <PageLoading height={260} />
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
              value={type}
              selectedLabel={TYPE_OPTIONS.find((o) => o.value === type)?.label}
              placeholder="Type"
              staticOptions={TYPE_OPTIONS}
              loadOptions={async () => TYPE_OPTIONS}
              onChange={setType}
              allowClear
            />
            <SearchSelect
              compact
              value={status}
              selectedLabel={STATUS_OPTIONS.find((o) => o.value === status)?.label}
              placeholder="Statut"
              staticOptions={STATUS_OPTIONS}
              loadOptions={async () => STATUS_OPTIONS}
              onChange={setStatus}
              allowClear
            />
          </div>
          <DataTable
          rows={filtered}
          rowKey={(c) => c.id}
          defaultSortKey="name"
          empty={<EmptyState title="Aucun client" />}
          columns={[
            {
              key: 'name',
              header: 'Nom',
              sortValue: (c) => c.name,
              render: (c) => c.name,
            },
            {
              key: 'type',
              header: 'Type',
              sortValue: (c) => c.type,
              render: (c) => c.type,
            },
            {
              key: 'contact',
              header: 'Contact',
              sortValue: (c) => c.email || c.phone || '',
              render: (c) => c.email || c.phone || '',
            },
            {
              key: 'sites',
              header: 'Sites',
              sortValue: (c) => c._count?.sites ?? 0,
              render: (c) => c._count?.sites ?? 0,
            },
            {
              key: 'workOrders',
              header: 'Interventions',
              sortValue: (c) => c._count?.workOrders ?? 0,
              render: (c) => c._count?.workOrders ?? 0,
            },
            {
              key: 'status',
              header: 'Statut',
              sortValue: (c) => c.status,
              render: (c) => <span className="badge">{c.status}</span>,
            },
            {
              key: 'actions',
              header: '',
              render: (c) => (
                <Button type="button" variant="secondary" size="sm" onClick={() => openEdit(c)}>
                  Modifier
                </Button>
              ),
            },
          ]}
        />
        </>
      )}
    </AppShell>
  );
}
