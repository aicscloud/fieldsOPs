'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { DataTable } from '@/components/DataTable';
import { Button, EmptyState, Modal, Skeleton } from '@/components/ui';
import { api } from '@/lib/api';

type Category = {
  id: string;
  name: string;
  description?: string | null;
  defaultDuration?: number | null;
  active: boolean;
};

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

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
        }),
      });
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
          <Button type="submit">Ajouter</Button>
        </form>
      </Modal>

      {loading ? (
        <Skeleton height={220} />
      ) : (
        <DataTable
          rows={categories}
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
              key: 'active',
              header: 'Actif',
              sortValue: (c) => (c.active ? 1 : 0),
              render: (c) => (c.active ? 'Oui' : 'Non'),
            },
          ]}
        />
      )}
    </AppShell>
  );
}
