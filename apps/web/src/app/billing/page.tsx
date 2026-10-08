'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { DataTable } from '@/components/DataTable';
import { SearchSelect } from '@/components/SearchSelect';
import { Button, EmptyState, Modal, Skeleton, StatusBadge } from '@/components/ui';
import { api } from '@/lib/api';
import { searchCustomers, searchWorkOrders } from '@/lib/search';

type Doc = {
  id: string;
  kind: 'QUOTE' | 'INVOICE';
  number: string;
  title: string;
  status: string;
  total: number;
  currency: string;
  customer?: { name: string };
  workOrder?: { number: string } | null;
  lines?: { id: string; label: string; quantity: number; unitPrice: number }[];
};

type BillLine = {
  label: string;
  quantity: number;
  unitPrice: number;
};

type FromWorkOrder = {
  workOrderId: string;
  number: string;
  title: string;
  customerId: string;
  customerName: string;
  taxRate?: number;
  labor: BillLine;
  parts: (BillLine & { sku?: string; unit?: string })[];
  lines: BillLine[];
};

const KIND_OPTIONS = [
  { value: 'QUOTE', label: 'Devis' },
  { value: 'INVOICE', label: 'Facture' },
];

export default function BillingPage() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState('QUOTE');
  const [customerId, setCustomerId] = useState('');
  const [customerLabel, setCustomerLabel] = useState('');
  const [workOrderId, setWorkOrderId] = useState('');
  const [workOrderLabel, setWorkOrderLabel] = useState('');
  const [title, setTitle] = useState('');
  const [laborLabel, setLaborLabel] = useState('Main d’œuvre');
  const [laborQty, setLaborQty] = useState(1);
  const [laborPrice, setLaborPrice] = useState(0);
  const [partLines, setPartLines] = useState<BillLine[]>([]);
  const [taxRate, setTaxRate] = useState(20);

  const previewTotal = useMemo(() => {
    const sub =
      laborQty * laborPrice +
      partLines.reduce((acc, l) => acc + l.quantity * l.unitPrice, 0);
    return sub * (1 + taxRate / 100);
  }, [laborQty, laborPrice, partLines, taxRate]);

  async function load() {
    setLoading(true);
    try {
      const d = await api<Doc[]>('/billing');
      setDocs(d);
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

  async function onPickWorkOrder(id: string, label?: string) {
    setWorkOrderId(id);
    setWorkOrderLabel(label ?? '');
    setPartLines([]);
    if (!id) return;
    try {
      const data = await api<FromWorkOrder>(`/billing/from-work-order/${id}`);
      setCustomerId(data.customerId);
      setCustomerLabel(data.customerName);
      setTitle(data.title);
      setLaborLabel(data.labor.label);
      setLaborQty(data.labor.quantity);
      setLaborPrice(data.labor.unitPrice);
      if (data.taxRate != null) setTaxRate(data.taxRate);
      setPartLines(
        data.parts.map((p) => ({
          label: p.sku ? `${p.label} (${p.sku})` : p.label,
          quantity: p.quantity,
          unitPrice: p.unitPrice,
        })),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de charger l’intervention');
    }
  }

  function resetForm() {
    setKind('QUOTE');
    setCustomerId('');
    setCustomerLabel('');
    setWorkOrderId('');
    setWorkOrderLabel('');
    setTitle('');
    setLaborLabel('Main d’œuvre');
    setLaborQty(1);
    setLaborPrice(0);
    setPartLines([]);
    setTaxRate(20);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!customerId) {
      setError('Choisissez un client');
      return;
    }
    try {
      const lines: BillLine[] = [
        { label: laborLabel, quantity: laborQty, unitPrice: laborPrice },
        ...partLines,
      ];
      await api('/billing', {
        method: 'POST',
        body: JSON.stringify({
          kind,
          customerId,
          workOrderId: workOrderId || undefined,
          title: title || laborLabel,
          taxRate,
          lines,
          skipPartsFromWorkOrder: true,
        }),
      });
      setOpen(false);
      resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Création impossible');
    }
  }

  async function setStatus(id: string, status: string) {
    await api(`/billing/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    await load();
  }

  return (
    <AppShell
      title="Facturation"
      actions={
        <Button
          onClick={() => {
            resetForm();
            setOpen(true);
          }}
        >
          Nouveau document
        </Button>
      }
    >
      {error ? <div className="error-box" style={{ marginBottom: 12 }}>{error}</div> : null}

      <Modal open={open} title="Devis / Facture" onClose={() => setOpen(false)} size="lg">
        <form className="form-stack" onSubmit={onSubmit}>
          <SearchSelect
            label="Type"
            value={kind}
            selectedLabel={KIND_OPTIONS.find((k) => k.value === kind)?.label}
            staticOptions={KIND_OPTIONS}
            loadOptions={async () => KIND_OPTIONS}
            onChange={setKind}
            allowClear={false}
            required
          />
          <SearchSelect
            label="Intervention"
            value={workOrderId}
            selectedLabel={workOrderLabel}
            placeholder="Rechercher une intervention…"
            loadOptions={searchWorkOrders}
            onChange={(id, opt) => void onPickWorkOrder(id, opt?.label)}
            allowClear
          />
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
            <span>Titre</span>
            <input
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </label>

          <section className="plan-drawer-card">
            <div className="plan-drawer-card-title">Main d’œuvre</div>
            <label className="field">
              <span>Libellé</span>
              <input
                className="input"
                value={laborLabel}
                onChange={(e) => setLaborLabel(e.target.value)}
                required
              />
            </label>
            <div className="row">
              <label className="field" style={{ flex: 1 }}>
                <span>Quantité (h)</span>
                <input
                  className="input"
                  type="number"
                  min={0}
                  step="any"
                  value={laborQty}
                  onChange={(e) => setLaborQty(Number(e.target.value) || 0)}
                />
              </label>
              <label className="field" style={{ flex: 1 }}>
                <span>Prix / h (€)</span>
                <input
                  className="input"
                  type="number"
                  min={0}
                  step="0.01"
                  value={laborPrice}
                  onChange={(e) => setLaborPrice(Number(e.target.value) || 0)}
                />
              </label>
            </div>
          </section>

          <section className="plan-drawer-card">
            <div className="plan-drawer-card-title">
              Pièces (stock)
              <span className="plan-drawer-count">{partLines.length}</span>
            </div>
            {partLines.length ? (
              <ul className="plan-drawer-parts">
                {partLines.map((line, i) => (
                  <li key={`${line.label}-${i}`}>
                    <div style={{ flex: 1 }}>
                      <strong>{line.label}</strong>
                      <div className="muted">
                        {line.quantity} × {line.unitPrice.toFixed(2)} € ={' '}
                        {(line.quantity * line.unitPrice).toFixed(2)} €
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>
                {workOrderId
                  ? 'Aucune pièce consommée sur cette intervention.'
                  : 'Choisissez une intervention pour importer les pièces au prix stock.'}
              </p>
            )}
          </section>

          <div className="row">
            <label className="field" style={{ flex: 1 }}>
              <span>TVA %</span>
              <input
                className="input"
                type="number"
                min={0}
                step="any"
                value={taxRate}
                onChange={(e) => setTaxRate(Number(e.target.value) || 0)}
              />
            </label>
            <label className="field" style={{ flex: 1 }}>
              <span>Total TTC estimé</span>
              <input className="input" readOnly value={`${previewTotal.toFixed(2)} €`} />
            </label>
          </div>

          <Button type="submit">Créer</Button>
        </form>
      </Modal>

      {loading ? (
        <Skeleton height={240} />
      ) : (
        <DataTable
          rows={docs}
          rowKey={(d) => d.id}
          defaultSortKey="number"
          defaultSortDir="desc"
          empty={<EmptyState title="Aucun document" />}
          columns={[
            {
              key: 'number',
              header: 'N°',
              sortValue: (d) => d.number,
              render: (d) => d.number,
            },
            {
              key: 'kind',
              header: 'Type',
              sortValue: (d) => d.kind,
              render: (d) => (d.kind === 'QUOTE' ? 'Devis' : 'Facture'),
            },
            {
              key: 'title',
              header: 'Titre',
              sortValue: (d) => d.title,
              render: (d) => (
                <>
                  {d.title}
                  {d.workOrder ? (
                    <div className="muted" style={{ fontSize: '0.85rem' }}>
                      {d.workOrder.number}
                    </div>
                  ) : null}
                </>
              ),
            },
            {
              key: 'customer',
              header: 'Client',
              sortValue: (d) => d.customer?.name ?? '',
              render: (d) => d.customer?.name ?? '',
            },
            {
              key: 'total',
              header: 'Total',
              sortValue: (d) => d.total,
              render: (d) => `${d.total.toFixed(2)} ${d.currency}`,
            },
            {
              key: 'status',
              header: 'Statut',
              sortValue: (d) => d.status,
              render: (d) => <StatusBadge status={d.status} />,
            },
            {
              key: 'actions',
              header: '',
              sortable: false,
              render: (d) => (
                <div className="row" onClick={(e) => e.stopPropagation()}>
                  {d.status === 'DRAFT' ? (
                    <Button size="sm" variant="secondary" onClick={() => void setStatus(d.id, 'SENT')}>
                      Envoyer
                    </Button>
                  ) : null}
                  {d.kind === 'INVOICE' && d.status !== 'PAID' ? (
                    <Button size="sm" onClick={() => void setStatus(d.id, 'PAID')}>
                      Marquer payé
                    </Button>
                  ) : null}
                </div>
              ),
            },
          ]}
        />
      )}
    </AppShell>
  );
}
