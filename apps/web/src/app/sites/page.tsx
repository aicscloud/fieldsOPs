'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { DataTable } from '@/components/DataTable';
import { SearchSelect } from '@/components/SearchSelect';
import { Button, EmptyState, Modal, PageLoading } from '@/components/ui';
import { api } from '@/lib/api';
import { searchCustomers } from '@/lib/search';

type Site = {
  id: string;
  name: string;
  address: string;
  city?: string | null;
  country?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  accessInstructions?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  customer?: { id: string; name: string };
};

export default function SitesPage() {
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Site | null>(null);
  const [customerId, setCustomerId] = useState('');
  const [customerLabel, setCustomerLabel] = useState('');
  const [q, setQ] = useState('');
  const [filterCustomerId, setFilterCustomerId] = useState('');
  const [filterCustomerLabel, setFilterCustomerLabel] = useState('');
  const [city, setCity] = useState('');

  async function load() {
    setLoading(true);
    try {
      const siteList = await api<Site[]>('/sites');
      setSites(siteList);
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

  const cityOptions = useMemo(() => {
    const cities = new Set<string>();
    for (const site of sites) {
      if (site.city) cities.add(site.city);
    }
    return [...cities]
      .sort((a, b) => a.localeCompare(b, 'fr'))
      .map((name) => ({ value: name, label: name }));
  }, [sites]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return sites.filter((site) => {
      if (filterCustomerId && site.customer?.id !== filterCustomerId) return false;
      if (city && site.city !== city) return false;
      if (!needle) return true;
      const hay = `${site.name} ${site.address} ${site.city ?? ''} ${site.customer?.name ?? ''} ${site.contactName ?? ''}`.toLowerCase();
      return hay.includes(needle);
    });
  }, [sites, q, filterCustomerId, city]);

  function closeForm() {
    setShowForm(false);
    setEditing(null);
    setCustomerId('');
    setCustomerLabel('');
  }

  function openCreate() {
    setEditing(null);
    setCustomerId('');
    setCustomerLabel('');
    setShowForm(true);
  }

  function openEdit(site: Site) {
    setShowForm(false);
    setEditing(site);
    setCustomerId(site.customer?.id ?? '');
    setCustomerLabel(site.customer?.name ?? '');
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (!editing && !customerId) {
      setError('Choisissez un client');
      return;
    }
    const body = {
      name: form.get('name'),
      address: form.get('address'),
      city: form.get('city') || undefined,
      country: form.get('country') || undefined,
      latitude: form.get('latitude') ? Number(form.get('latitude')) : undefined,
      longitude: form.get('longitude') ? Number(form.get('longitude')) : undefined,
      accessInstructions: form.get('accessInstructions') || undefined,
      contactName: form.get('contactName') || undefined,
      contactPhone: form.get('contactPhone') || undefined,
    };
    try {
      if (editing) {
        await api(`/sites/${editing.id}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        });
      } else {
        await api('/sites', {
          method: 'POST',
          body: JSON.stringify({ ...body, customerId }),
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
      title="Sites"
      actions={
        <div className="row">
          <Link className="btn btn-secondary" href="/customers">
            Voir les clients
          </Link>
          <Button onClick={openCreate}>Nouveau site</Button>
        </div>
      }
    >
      {error ? <div className="error-box" style={{ marginBottom: 12 }}>{error}</div> : null}

      <Modal open={showForm || !!editing} title={editing ? 'Modifier le site' : 'Nouveau site'} onClose={closeForm} size="lg">
        <form className="form-stack" key={editing?.id ?? 'new'} onSubmit={onSubmit}>
          {editing ? (
            <label className="field">
              <span>Client</span>
              <input className="input" value={editing.customer?.name ?? ''} disabled />
            </label>
          ) : (
            <SearchSelect
              label="Client"
              value={customerId}
              selectedLabel={customerLabel}
              placeholder="Rechercher un client…"
              loadOptions={searchCustomers}
              onChange={(id, opt) => {
                setCustomerId(id);
                setCustomerLabel(opt?.label ?? '');
              }}
              required
            />
          )}
          <label className="field">
            <span>Nom du site</span>
            <input className="input" name="name" required defaultValue={editing?.name} />
          </label>
          <label className="field">
            <span>Adresse</span>
            <input className="input" name="address" required defaultValue={editing?.address} />
          </label>
          <div className="row">
            <label className="field" style={{ flex: 1 }}>
              <span>Ville</span>
              <input className="input" name="city" defaultValue={editing?.city ?? ''} />
            </label>
            <label className="field" style={{ flex: 1 }}>
              <span>Pays</span>
              <input className="input" name="country" defaultValue={editing?.country ?? ''} />
            </label>
          </div>
          <div className="row">
            <label className="field" style={{ flex: 1 }}>
              <span>Latitude</span>
              <input className="input" name="latitude" type="number" step="any" defaultValue={editing?.latitude ?? ''} />
            </label>
            <label className="field" style={{ flex: 1 }}>
              <span>Longitude</span>
              <input className="input" name="longitude" type="number" step="any" defaultValue={editing?.longitude ?? ''} />
            </label>
          </div>
          <label className="field">
            <span>Accès</span>
            <input className="input" name="accessInstructions" defaultValue={editing?.accessInstructions ?? ''} />
          </label>
          <div className="row">
            <label className="field" style={{ flex: 1 }}>
              <span>Contact</span>
              <input className="input" name="contactName" defaultValue={editing?.contactName ?? ''} />
            </label>
            <label className="field" style={{ flex: 1 }}>
              <span>Téléphone</span>
              <input className="input" name="contactPhone" defaultValue={editing?.contactPhone ?? ''} />
            </label>
          </div>
          <Button type="submit">Enregistrer</Button>
        </form>
      </Modal>

      <div style={{ marginTop: 14 }}>
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
                value={filterCustomerId}
                selectedLabel={filterCustomerLabel}
                placeholder="Client"
                loadOptions={searchCustomers}
                onChange={(id, opt) => {
                  setFilterCustomerId(id);
                  setFilterCustomerLabel(opt?.label ?? '');
                }}
                allowClear
              />
              <SearchSelect
                compact
                value={city}
                selectedLabel={city}
                placeholder="Ville"
                staticOptions={cityOptions}
                loadOptions={async () => cityOptions}
                onChange={setCity}
                allowClear
              />
            </div>
            <DataTable
            rows={filtered}
            rowKey={(site) => site.id}
            defaultSortKey="name"
            empty={<EmptyState title="Aucun site" />}
            columns={[
              {
                key: 'name',
                header: 'Site',
                sortValue: (site) => site.name,
                render: (site) => site.name,
              },
              {
                key: 'customer',
                header: 'Client',
                sortValue: (site) => site.customer?.name ?? '',
                render: (site) => site.customer?.name ?? '',
              },
              {
                key: 'address',
                header: 'Adresse',
                sortValue: (site) => `${site.address}${site.city ? `, ${site.city}` : ''}`,
                render: (site) => (
                  <>
                    {site.address}
                    {site.city ? `, ${site.city}` : ''}
                  </>
                ),
              },
              {
                key: 'gps',
                header: 'GPS',
                sortValue: (site) =>
                  site.latitude != null && site.longitude != null
                    ? `${site.latitude},${site.longitude}`
                    : '',
                render: (site) =>
                  site.latitude != null && site.longitude != null
                    ? `${site.latitude}, ${site.longitude}`
                    : '',
              },
              {
                key: 'contact',
                header: 'Contact',
                sortValue: (site) => site.contactName || site.contactPhone || '',
                render: (site) => site.contactName || site.contactPhone || '',
              },
              {
                key: 'actions',
                header: '',
                render: (site) => (
                  <Button type="button" variant="secondary" size="sm" onClick={() => openEdit(site)}>
                    Modifier
                  </Button>
                ),
              },
            ]}
          />
          </>
        )}
      </div>
    </AppShell>
  );
}
