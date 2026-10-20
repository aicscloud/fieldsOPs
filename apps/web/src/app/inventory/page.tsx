'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { DataTable } from '@/components/DataTable';
import { ParkDue, UnitHistoryDrawer } from '@/components/EquipmentPark';
import { InstallEquipment } from '@/components/InstallEquipment';
import { SearchSelect } from '@/components/SearchSelect';
import { Button, EmptyState, Modal, PageLoading } from '@/components/ui';
import { api } from '@/lib/api';
import { searchCustomers, searchSites } from '@/lib/search';

type Part = {
  id: string;
  sku: string;
  name: string;
  unit: string;
  quantity: number;
  minQuantity: number;
  unitCost?: number | null;
  salePrice?: number | null;
};

type Installed = {
  id: string;
  serialNumber: string;
  status: 'INSTALLED' | 'REMOVED';
  installedAt: string;
  lastVisitAt?: string | null;
  nextDueAt?: string | null;
  notes?: string | null;
  part: { sku: string; name: string };
  customer: { name: string };
  site: { name: string; city?: string | null };
  workOrder?: { number: string } | null;
  _count?: { repairs: number };
};

type Movement = { id: string; delta: number; reason?: string | null; createdAt: string };

function money(n?: number | null) {
  return `${(n ?? 0).toFixed(2)} €`;
}

const STOCK_OPTIONS = [
  { value: 'low', label: 'Sous seuil' },
  { value: 'ok', label: 'En stock' },
];

const PLACE_OPTIONS = [
  { value: 'INSTALLED', label: 'Installés' },
  { value: 'REMOVED', label: 'Retirés' },
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
  const [tab, setTab] = useState<'stock' | 'installed'>('stock');
  const [installed, setInstalled] = useState<Installed[]>([]);
  const [place, setPlace] = useState('INSTALLED');
  const [customerId, setCustomerId] = useState('');
  const [customerLabel, setCustomerLabel] = useState('');
  const [siteId, setSiteId] = useState('');
  const [siteLabel, setSiteLabel] = useState('');
  const [installOpen, setInstallOpen] = useState(false);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [unitId, setUnitId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (place) params.set('status', place);
      if (customerId) params.set('customerId', customerId);
      if (siteId) params.set('siteId', siteId);
      const [partRows, installedRows] = await Promise.all([
        api<Part[]>('/inventory/parts'),
        api<Installed[]>(`/inventory/installed?${params.toString()}`),
      ]);
      setParts(partRows);
      setInstalled(installedRows);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [place, customerId, siteId]);

  const unitOptions = useMemo(() => {
    const units = new Set(parts.map((p) => p.unit).filter(Boolean));
    return [...units].sort((a, b) => a.localeCompare(b, 'fr')).map((name) => ({ value: name, label: name }));
  }, [parts]);

  const installedRows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return installed;
    return installed.filter((row) =>
      `${row.serialNumber} ${row.part.name} ${row.part.sku} ${row.customer.name} ${row.site.name}`.toLowerCase().includes(needle),
    );
  }, [installed, q]);

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
          salePrice: Number(form.get('salePrice') || 0),
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
          salePrice: Number(form.get('salePrice') || 0),
        }),
      });
      setEditPart(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mise à jour impossible');
    }
  }

  async function retire(id: string, returnToStock: boolean) {
    const label = returnToStock
      ? 'Remettre cette unité en stock ? Elle ne sera plus facturée sur l’intervention.'
      : 'Retirer cet équipement du site ? Il reste sorti du stock.';
    if (!window.confirm(label)) return;
    try {
      await api(`/inventory/installed/${id}/remove`, {
        method: 'POST',
        body: JSON.stringify({ returnToStock }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Retrait impossible');
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
      title="Équipements"
      actions={
        <div className="row">
          <Button variant="secondary" onClick={() => setInstallOpen(true)}>Installer chez un client</Button>
          <Button onClick={() => setOpen(true)}>Nouvel équipement</Button>
        </div>
      }
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
              <span>Coût d’achat (€)</span>
              <input className="input" name="unitCost" type="number" min={0} step="0.01" required defaultValue={0} />
            </label>
            <label className="field" style={{ flex: 1 }}>
              <span>Prix de vente (€)</span>
              <input className="input" name="salePrice" type="number" min={0} step="0.01" required defaultValue={0} />
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
            Le prix de vente est repris sur la facture. Le coût d’achat sert au stock.
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
                <span>Coût d’achat (€)</span>
                <input className="input" name="unitCost" type="number" min={0} step="0.01" required defaultValue={editPart.unitCost ?? 0} />
              </label>
              <label className="field" style={{ flex: 1 }}>
                <span>Prix de vente (€)</span>
                <input className="input" name="salePrice" type="number" min={0} step="0.01" required defaultValue={editPart.salePrice ?? editPart.unitCost ?? 0} />
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

      <Modal
        open={!!adjustId}
        title="Mouvements de stock"
        onClose={() => {
          setAdjustId(null);
          setMovements([]);
        }}
      >
        <form className="form-stack" onSubmit={onAdjust}>
          <label className="field">
            <span>Delta (+ entrée / − sortie)</span>
            <input className="input" name="delta" type="number" required step="any" />
          </label>
          <label className="field">
            <span>Motif</span>
            <input className="input" name="reason" placeholder="Réception, inventaire, casse…" />
          </label>
          <Button type="submit">Valider</Button>
        </form>
        {movements.length ? (
          <ul className="plan-drawer-parts" style={{ marginTop: 16 }}>
            {movements.map((move) => (
              <li key={move.id}>
                <div>
                  <strong>{move.delta > 0 ? `+${move.delta}` : move.delta}</strong>
                  <div className="muted">
                    {move.reason || 'Ajustement'} · {new Date(move.createdAt).toLocaleString('fr-FR')}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted" style={{ marginTop: 16 }}>Aucun mouvement.</p>
        )}
      </Modal>

      <Modal open={installOpen} title="Installer chez un client" onClose={() => setInstallOpen(false)} size="lg">
        <InstallEquipment
          onDone={() => {
            setInstallOpen(false);
            setTab('installed');
            void load();
          }}
        />
      </Modal>

      {loading ? (
        <PageLoading height={240} />
      ) : (
        <>
          <div className="row" style={{ marginBottom: 12 }}>
            <Button variant={tab === 'stock' ? 'primary' : 'secondary'} onClick={() => setTab('stock')}>
              Stock
            </Button>
            <Button variant={tab === 'installed' ? 'primary' : 'secondary'} onClick={() => setTab('installed')}>
              Chez les clients
            </Button>
          </div>
          <div className="filters">
            <input
              className="input"
              placeholder="Recherche"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label="Recherche"
            />
            {tab === 'stock' ? (
              <>
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
              </>
            ) : (
              <>
                <SearchSelect
                  compact
                  value={customerId}
                  selectedLabel={customerLabel}
                  placeholder="Client"
                  loadOptions={searchCustomers}
                  onChange={(id, opt) => {
                    setCustomerId(id);
                    setCustomerLabel(opt?.label ?? '');
                    setSiteId('');
                    setSiteLabel('');
                  }}
                  allowClear
                />
                <SearchSelect
                  compact
                  value={siteId}
                  selectedLabel={siteLabel}
                  placeholder="Site"
                  loadOptions={(query) => searchSites(query, customerId || undefined)}
                  onChange={(id, opt) => {
                    setSiteId(id);
                    setSiteLabel(opt?.label ?? '');
                  }}
                  allowClear
                />
                <SearchSelect
                  compact
                  value={place}
                  selectedLabel={PLACE_OPTIONS.find((o) => o.value === place)?.label}
                  placeholder="État"
                  staticOptions={PLACE_OPTIONS}
                  loadOptions={async () => PLACE_OPTIONS}
                  onChange={setPlace}
                  allowClear={false}
                />
              </>
            )}
          </div>
          {tab === 'installed' ? (
            <DataTable
              rows={installedRows}
              rowKey={(row) => row.id}
              defaultSortKey="installedAt"
              onRowClick={(row) => setUnitId(row.id)}
              empty={<EmptyState title="Aucun équipement identifié chez un client" />}
              columns={[
                {
                  key: 'serialNumber',
                  header: 'N° de série',
                  sortValue: (row) => row.serialNumber,
                  render: (row) => row.serialNumber,
                },
                {
                  key: 'part',
                  header: 'Équipement',
                  sortValue: (row) => row.part.name,
                  render: (row) => (
                    <>
                      {row.part.name}
                      <div className="muted">{row.part.sku}</div>
                    </>
                  ),
                },
                {
                  key: 'customer',
                  header: 'Client',
                  sortValue: (row) => row.customer.name,
                  render: (row) => row.customer.name,
                },
                {
                  key: 'site',
                  header: 'Site',
                  sortValue: (row) => row.site.name,
                  render: (row) => `${row.site.name}${row.site.city ? ` · ${row.site.city}` : ''}`,
                },
                {
                  key: 'installedAt',
                  header: 'Installé le',
                  sortValue: (row) => row.installedAt,
                  render: (row) => new Date(row.installedAt).toLocaleDateString('fr-FR'),
                },
                {
                  key: 'lastVisitAt',
                  header: 'Dernière visite',
                  sortValue: (row) => row.lastVisitAt ?? '',
                  render: (row) =>
                    row.lastVisitAt
                      ? new Date(row.lastVisitAt).toLocaleDateString('fr-FR')
                      : '—',
                },
                {
                  key: 'nextDueAt',
                  header: 'Prochaine',
                  sortValue: (row) => row.nextDueAt ?? '',
                  render: (row) => <ParkDue iso={row.nextDueAt} />,
                },
                {
                  key: 'repairs',
                  header: 'Réparations',
                  sortValue: (row) => row._count?.repairs ?? 0,
                  render: (row) => row._count?.repairs ?? 0,
                },
                {
                  key: 'workOrder',
                  header: 'Intervention',
                  sortValue: (row) => row.workOrder?.number ?? '',
                  render: (row) => row.workOrder?.number ?? '—',
                },
                {
                  key: 'actions',
                  header: '',
                  sortable: false,
                  render: (row) =>
                    row.status === 'INSTALLED' ? (
                      <div className="row" onClick={(e) => e.stopPropagation()}>
                        <Button size="sm" variant="secondary" onClick={() => void retire(row.id, true)}>
                          Remettre en stock
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => void retire(row.id, false)}>
                          Retirer
                        </Button>
                      </div>
                    ) : (
                      <span className="muted">Retiré</span>
                    ),
                },
              ]}
            />
          ) : (
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
              key: 'salePrice',
              header: 'Prix de vente',
              sortValue: (p) => p.salePrice ?? p.unitCost ?? 0,
              render: (p) => money(p.salePrice ?? p.unitCost),
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
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setAdjustId(p.id);
                      setMovements([]);
                      void api<Movement[]>(`/inventory/parts/${p.id}/movements`)
                        .then(setMovements)
                        .catch(() => setMovements([]));
                    }}
                  >
                    Stock
                  </Button>
                </div>
              ),
            },
          ]}
        />
          )}
        </>
      )}
      <UnitHistoryDrawer unitId={unitId} onClose={() => setUnitId(null)} />
    </AppShell>
  );
}
