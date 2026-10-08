'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { DataTable } from '@/components/DataTable';
import { SearchSelect } from '@/components/SearchSelect';
import { Button, EmptyState, Modal, Skeleton } from '@/components/ui';
import { api } from '@/lib/api';

type Category = {
  id: string;
  name: string;
  description?: string | null;
  defaultDuration?: number | null;
  requiresTransport?: boolean;
  active: boolean;
};

const TEAM_OPTIONS = [
  { value: 'field', label: 'Technicien' },
  { value: 'both', label: 'Tech + transport' },
];

const ACTIVE_OPTIONS = [
  { value: 'yes', label: 'Actif' },
  { value: 'no', label: 'Inactif' },
];

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [requiresTransport, setRequiresTransport] = useState(false);
  const [q, setQ] = useState('');
  const [team, setTeam] = useState('');
  const [active, setActive] = useState('');

  async function load() {
    setLoading(true);
    try {
      setCategories(await api<Category[]>('/work-order-types'));
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
    return categories.filter((c) => {
      if (team === 'both' && !c.requiresTransport) return false;
      if (team === 'field' && c.requiresTransport) return false;
      if (active === 'yes' && !c.active) return false;
      if (active === 'no' && c.active) return false;
      if (!needle) return true;
      const hay = `${c.name} ${c.description ?? ''}`.toLowerCase();
      return hay.includes(needle);
    });
  }, [categories, q, team, active]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await api('/work-order-types', {
        method: 'POST',
        body: JSON.stringify({
          name: form.get('name'),
          description: form.get('description') || undefined,
          defaultDuration: Number(form.get('defaultDuration') || 60),
          requiresTransport,
        }),
      });
      setRequiresTransport(false);
      setOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Création impossible');
    }
  }

  return (
    <AppShell
      title="Catégories"
      actions={
        <Button onClick={() => setOpen(true)}>Ajouter une catégorie</Button>
      }
    >
      {error ? <div className="error-box" style={{ marginBottom: 12 }}>{error}</div> : null}

      <Modal
        open={open}
        title="Nouvelle catégorie"
        onClose={() => setOpen(false)}
      >
        <form className="form-stack" onSubmit={onSubmit}>
          <label className="field">
            <span>Nom</span>
            <input className="input" name="name" required />
          </label>
          <label className="field">
            <span>Description</span>
            <input className="input" name="description" />
          </label>
          <label className="field">
            <span>Durée par défaut (min)</span>
            <input
              className="input"
              name="defaultDuration"
              type="number"
              defaultValue={60}
              min={15}
            />
          </label>
          <label className="field" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              checked={requiresTransport}
              onChange={(e) => setRequiresTransport(e.target.checked)}
            />
            <span>Technicien et transporteur</span>
          </label>
          <Button type="submit">Ajouter</Button>
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
              value={team}
              selectedLabel={TEAM_OPTIONS.find((o) => o.value === team)?.label}
              placeholder="Équipe"
              staticOptions={TEAM_OPTIONS}
              loadOptions={async () => TEAM_OPTIONS}
              onChange={setTeam}
              allowClear
            />
            <SearchSelect
              compact
              value={active}
              selectedLabel={ACTIVE_OPTIONS.find((o) => o.value === active)?.label}
              placeholder="Actif"
              staticOptions={ACTIVE_OPTIONS}
              loadOptions={async () => ACTIVE_OPTIONS}
              onChange={setActive}
              allowClear
            />
          </div>
          <DataTable
          rows={filtered}
          rowKey={(c) => c.id}
          defaultSortKey="name"
          empty={<EmptyState title="Aucune catégorie" />}
          columns={[
            {
              key: 'name',
              header: 'Nom',
              sortValue: (c) => c.name,
              render: (c) => c.name,
            },
            {
              key: 'description',
              header: 'Description',
              sortValue: (c) => c.description || '',
              render: (c) => c.description || '',
            },
            {
              key: 'defaultDuration',
              header: 'Durée',
              sortValue: (c) => c.defaultDuration ?? 0,
              render: (c) => (c.defaultDuration ? `${c.defaultDuration} min` : ''),
            },
            {
              key: 'requiresTransport',
              header: 'Équipe',
              sortValue: (c) => (c.requiresTransport ? 1 : 0),
              render: (c) => (c.requiresTransport ? 'Tech + transport' : 'Technicien'),
            },
            {
              key: 'active',
              header: 'Actif',
              sortValue: (c) => (c.active ? 1 : 0),
              render: (c) => (c.active ? 'Oui' : 'Non'),
            },
          ]}
        />
        </>
      )}
    </AppShell>
  );
}
