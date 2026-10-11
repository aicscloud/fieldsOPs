'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { DataTable } from '@/components/DataTable';
import { SearchSelect } from '@/components/SearchSelect';
import { Button, EmptyState, Modal, PageLoading } from '@/components/ui';
import { api } from '@/lib/api';

type Kind = 'INSTALLATION' | 'REPAIR' | 'REPLACEMENT';

const KIND_OPTIONS = [
  { value: 'INSTALLATION', label: 'Installation' },
  { value: 'REPAIR', label: 'Réparation' },
  { value: 'REPLACEMENT', label: 'Changement' },
];

function kindLabel(kind?: string | null) {
  return KIND_OPTIONS.find((item) => item.value === kind)?.label ?? 'À classer';
}

type Category = {
  id: string;
  name: string;
  description?: string | null;
  kind?: Kind | null;
  defaultDuration?: number | null;
  active: boolean;
};

const ACTIVE_OPTIONS = [
  { value: 'yes', label: 'Actif' },
  { value: 'no', label: 'Inactif' },
];

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [kind, setKind] = useState<Kind | ''>('');
  const [q, setQ] = useState('');
  const [kindFilter, setKindFilter] = useState('');
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
      if (kindFilter && c.kind !== kindFilter) return false;
      if (active === 'yes' && !c.active) return false;
      if (active === 'no' && c.active) return false;
      if (!needle) return true;
      const hay = `${c.name} ${c.description ?? ''}`.toLowerCase();
      return hay.includes(needle);
    });
  }, [categories, q, active, kindFilter]);

  function closeForm() {
    setOpen(false);
    setEditing(null);
    setIsActive(true);
    setKind('');
  }

  function openCreate() {
    setEditing(null);
    setIsActive(true);
    setKind('');
    setOpen(true);
  }

  function openEdit(category: Category) {
    setOpen(false);
    setEditing(category);
    setIsActive(category.active);
    setKind(category.kind ?? '');
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (!kind) {
      setError('Choisissez le grand type : installation, réparation ou changement.');
      return;
    }
    const body = {
      name: form.get('name'),
      description: form.get('description') || undefined,
      defaultDuration: Number(form.get('defaultDuration') || 60),
      kind,
      ...(editing ? { active: isActive } : {}),
    };
    try {
      if (editing) {
        await api(`/work-order-types/${editing.id}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        });
      } else {
        await api('/work-order-types', {
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
      title="Catégories"
      actions={
        <Button onClick={openCreate}>Ajouter une catégorie</Button>
      }
    >
      {error ? <div className="error-box" style={{ marginBottom: 12 }}>{error}</div> : null}

      <Modal
        open={open || !!editing}
        title={editing ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
        onClose={closeForm}
      >
        <form className="form-stack" key={editing?.id ?? 'new'} onSubmit={onSubmit}>
          <label className="field">
            <span>Grand type</span>
            <select className="input" value={kind} onChange={(e) => setKind(e.target.value as Kind)} required>
              <option value="">Choisir…</option>
              {KIND_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Nom</span>
            <input className="input" name="name" required defaultValue={editing?.name} />
          </label>
          <label className="field">
            <span>Description</span>
            <input className="input" name="description" defaultValue={editing?.description ?? ''} />
          </label>
          <label className="field">
            <span>Durée par défaut (min)</span>
            <input
              className="input"
              name="defaultDuration"
              type="number"
              defaultValue={editing?.defaultDuration ?? 60}
              min={15}
            />
          </label>
          {editing ? (
            <label className="field" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              <span>Catégorie active</span>
            </label>
          ) : null}
          <Button type="submit">{editing ? 'Enregistrer' : 'Ajouter'}</Button>
        </form>
      </Modal>

      {loading ? (
        <PageLoading height={220} />
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
              value={kindFilter}
              selectedLabel={KIND_OPTIONS.find((item) => item.value === kindFilter)?.label}
              placeholder="Grand type"
              staticOptions={KIND_OPTIONS}
              loadOptions={async () => KIND_OPTIONS}
              onChange={setKindFilter}
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
              key: 'kind',
              header: 'Grand type',
              sortValue: (c) => kindLabel(c.kind),
              render: (c) => kindLabel(c.kind),
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
              key: 'active',
              header: 'Actif',
              sortValue: (c) => (c.active ? 1 : 0),
              render: (c) => (c.active ? 'Oui' : 'Non'),
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
