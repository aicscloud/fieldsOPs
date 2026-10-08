'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { DataTable } from '@/components/DataTable';
import { SearchSelect } from '@/components/SearchSelect';
import { Button, EmptyState, Modal, Skeleton } from '@/components/ui';
import { api } from '@/lib/api';
import { searchCustomers } from '@/lib/search';

type Site = {
  id: string;
  name: string;
  address: string;
  city?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  contactName?: string | null;
  contactPhone?: string | null;
  customer?: { id: string; name: string };
};

export default function SitesPage() {
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
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

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (!customerId) {
      setError('Choisissez un client');
      return;
    }
    try {
      await api('/sites', {
        method: 'POST',
        body: JSON.stringify({
          customerId,
          name: form.get('name'),
          address: form.get('address'),
          city: form.get('city') || undefined,
          country: form.get('country') || undefined,
          latitude: form.get('latitude') ? Number(form.get('latitude')) : undefined,
          longitude: form.get('longitude') ? Number(form.get('longitude')) : undefined,
          accessInstructions: form.get('accessInstructions') || undefined,
          contactName: form.get('contactName') || undefined,
          contactPhone: form.get('contactPhone') || undefined,
        }),
      });
      setShowForm(false);
      setCustomerId('');
      setCustomerLabel('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Création impossible');
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
          <Button onClick={() => setShowForm(true)}>Nouveau site</Button>
        </div>
      }
    >
      {error ? <div className="error-box" style={{ marginBottom: 12 }}>{error}</div> : null}

      <Modal open={showForm} title="Nouveau site" onClose={() => setShowForm(false)} size="lg">
        <form className="form-stack" onSubmit={onSubmit}>
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
          <label className="field">
            <span>Nom du site</span>
            <input className="input" name="name" required />
          </label>
          <label className="field">
            <span>Adresse</span>
            <input className="input" name="address" required />
          </label>
          <div className="row">
            <label className="field" style={{ flex: 1 }}>
              <span>Ville</span>
              <input className="input" name="city" />
            </label>
            <label className="field" style={{ flex: 1 }}>
              <span>Pays</span>
              <input className="input" name="country" />
            </label>
          </div>
          <div className="row">
            <label className="field" style={{ flex: 1 }}>
              <span>Latitude</span>
              <input className="input" name="latitude" type="number" step="any" />
            </label>
            <label className="field" style={{ flex: 1 }}>
              <span>Longitude</span>
              <input className="input" name="longitude" type="number" step="any" />
            </label>
          </div>
          <Button type="submit">Enregistrer</Button>
        </form>
      </Modal>

      <div style={{ marginTop: 14 }}>
        {loading ? (
          <Skeleton height={260} />
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
            ]}
          />
          </>
        )}
      </div>
    </AppShell>
  );
}
