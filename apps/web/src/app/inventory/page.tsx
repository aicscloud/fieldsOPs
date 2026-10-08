'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { DataTable } from '@/components/DataTable';
import { SearchSelect } from '@/components/SearchSelect';
import { Button, EmptyState, Modal, Skeleton } from '@/components/ui';
import { api } from '@/lib/api';

type Part = {
  id: string;
  sku: string;
  name: string;
  unit: string;
  quantity: number;
  minQuantity: number;
  unitCost?: number | null;
};

function money(n?: number | null) {
  return `${(n ?? 0).toFixed(2)} €`;
}

const STOCK_OPTIONS = [
  { value: 'low', label: 'Sous seuil' },
  { value: 'ok', label: 'En stock' },
];

export default function InventoryPage() {
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [adjustId, setAdjustId] = useState<string | null>(null);
  const [editPart, setEditPart] = useState<Part | null>(null);
  const [q, setQ] = useState('');
  const [stock, setStock] = useState('');
  const [unit, setUnit] = useState('');

  async function load() {
    setLoading(true);
    try {
      setParts(await api<Part[]>('/inventory/parts'));
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

  const unitOptions = useMemo(() => {
    const units = new Set(parts.map((p) => p.unit).filter(Boolean));
    return [...units].sort((a, b) => a.localeCompare(b, 'fr')).map((name) => ({ value: name, label: name }));
  }, [parts]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return parts.filter((p) => {
      const low = p.quantity <= p.minQuantity;
      if (stock === 'low' && !low) return false;
      if (stock === 'ok' && low) return false;
      if (unit && p.unit !== unit) return false;
      if (!needle) return true;
      return `${p.sku} ${p.name}`.toLowerCase().includes(needle);
    });
  }, [parts, q, stock, unit]);

  async function onCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await api('/inventory/parts', {
        method: 'POST',
        body: JSON.stringify({
          sku: form.get('sku'),
          name: form.get('name'),
          unit: form.get('unit') || 'pcs',
          quantity: Number(form.get('quantity') || 0),
          minQuantity: Number(form.get('minQuantity') || 0),
          unitCost: Number(form.get('unitCost') || 0),
        }),
      });
      setOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Création impossible');
    }
  }

  async function onEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editPart) return;
    const form = new FormData(event.currentTarget);
    try {
      await api(`/inventory/parts/${editPart.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: form.get('name'),
          unit: form.get('unit') || 'pcs',
          minQuantity: Number(form.get('minQuantity') || 0),
          unitCost: Number(form.get('unitCost') || 0),
        }),
      });
      setEditPart(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mise à jour impossible');
    }
  }

  async function onAdjust(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!adjustId) return;
    const form = new FormData(event.currentTarget);
    try {
      await api(`/inventory/parts/${adjustId}/adjust`, {
        method: 'POST',
        body: JSON.stringify({
          delta: Number(form.get('delta')),
          reason: form.get('reason') || undefined,
        }),
      });
      setAdjustId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ajustement impossible');
    }
  }

  return (
    <AppShell
      title="Equipements"
      actions={<Button onClick={() => setOpen(true)}>Nouvel equipement</Button>}
    >
      {error ? <div className="error-box" style={{ marginBottom: 12 }}>{error}</div> : null}

      <Modal open={open} title="Nouvelle pièce" onClose={() => setOpen(false)}>
        <form className="form-stack" onSubmit={onCreate}>
          <label className="field">
            <span>SKU</span>
            <input className="input" name="sku" required />
          </label>
          <label className="field">
            <span>Nom</span>
            <input className="input" name="name" required />
          </label>
          <div className="row">
            <label className="field" style={{ flex: 1 }}>
              <span>Unité</span>
              <input className="input" name="unit" defaultValue="pcs" />
            </label>
            <label className="field" style={{ flex: 1 }}>
              <span>Prix unitaire (€)</span>
              <input
                className="input"
                name="unitCost"
                type="number"
                min={0}
                step="0.01"
                required
                defaultValue={0}
              />
            </label>
          </div>
          <div className="row">
            <label className="field" style={{ flex: 1 }}>
              <span>Quantité</span>
              <input className="input" name="quantity" type="number" defaultValue={0} min={0} />
            </label>
            <label className="field" style={{ flex: 1 }}>
              <span>Seuil min</span>
              <input className="input" name="minQuantity" type="number" defaultValue={0} min={0} />
            </label>
          </div>
          <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>
            Ce prix sera repris automatiquement sur la facture avec la main d’œuvre.
          </p>
          <Button type="submit">Créer</Button>
        </form>
      </Modal>

      <Modal
        open={!!editPart}
        title="Modifier la pièce"
        onClose={() => setEditPart(null)}
      >
        {editPart ? (
          <form className="form-stack" onSubmit={onEdit}>
            <label className="field">
              <span>Nom</span>
              <input className="input" name="name" required defaultValue={editPart.name} />
            </label>
            <div className="row">
              <label className="field" style={{ flex: 1 }}>
                <span>Unité</span>
                <input className="input" name="unit" defaultValue={editPart.unit} />
              </label>
              <label className="field" style={{ flex: 1 }}>
                <span>Prix unitaire (€)</span>
                <input
                  className="input"
                  name="unitCost"
                  type="number"
                  min={0}
                  step="0.01"
                  required
                  defaultValue={editPart.unitCost ?? 0}
                />
              </label>
              <label className="field" style={{ flex: 1 }}>
                <span>Seuil min</span>
                <input
                  className="input"
                  name="minQuantity"
                  type="number"
                  min={0}
                  defaultValue={editPart.minQuantity}
                />
              </label>
            </div>
            <Button type="submit">Enregistrer</Button>
          </form>
        ) : null}
      </Modal>

      <Modal open={!!adjustId} title="Ajuster le stock" onClose={() => setAdjustId(null)}>
        <form className="form-stack" onSubmit={onAdjust}>
          <label className="field">
            <span>Delta (+ entrée / − sortie)</span>
            <input className="input" name="delta" type="number" required step="any" />
          </label>
          <label className="field">
            <span>Motif</span>
            <input className="input" name="reason" placeholder="Réception, inventaire…" />
          </label>
          <Button type="submit">Valider</Button>
        </form>
      </Modal>

      {loading ? (
        <Skeleton height={240} />
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
              value={stock}
              selectedLabel={STOCK_OPTIONS.find((o) => o.value === stock)?.label}
              placeholder="Stock"
              staticOptions={STOCK_OPTIONS}
              loadOptions={async () => STOCK_OPTIONS}
              onChange={setStock}
              allowClear
            />
            <SearchSelect
              compact
              value={unit}
              selectedLabel={unit}
              placeholder="Unité"
              staticOptions={unitOptions}
              loadOptions={async () => unitOptions}
              onChange={setUnit}
              allowClear
            />
          </div>
          <DataTable
          rows={filtered}
          rowKey={(p) => p.id}
          defaultSortKey="name"
          empty={<EmptyState title="Aucun article" />}
          columns={[
            {
              key: 'sku',
              header: 'SKU',
              sortValue: (p) => p.sku,
              render: (p) => p.sku,
            },
            {
              key: 'name',
              header: 'Nom',
              sortValue: (p) => p.name,
              render: (p) => p.name,
            },
            {
              key: 'unitCost',
              header: 'Prix',
              sortValue: (p) => p.unitCost ?? 0,
              render: (p) => money(p.unitCost),
            },
            {
              key: 'quantity',
              header: 'Stock',
              sortValue: (p) => p.quantity,
              render: (p) => (
                <span style={{ color: p.quantity <= p.minQuantity ? 'var(--danger)' : undefined }}>
                  {p.quantity} {p.unit}
                </span>
              ),
            },
            {
              key: 'minQuantity',
              header: 'Seuil',
              sortValue: (p) => p.minQuantity,
              render: (p) => `${p.minQuantity} ${p.unit}`,
            },
            {
              key: 'actions',
              header: 'Gestion',
              sortable: false,
              render: (p) => (
                <div className="row" onClick={(e) => e.stopPropagation()}>
                  <Button size="sm" variant="secondary" onClick={() => setEditPart(p)}>
                    Prix
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => setAdjustId(p.id)}>
                    Ajuster
                  </Button>
                </div>
              ),
            },
          ]}
        />
        </>
      )}
    </AppShell>
  );
}
