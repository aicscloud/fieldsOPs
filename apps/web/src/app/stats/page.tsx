'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { DataTable } from '@/components/DataTable';
import { DonutChart } from '@/components/charts/DonutChart';
import { LineChart } from '@/components/charts/LineChart';
import { StatusChart } from '@/components/StatusChart';
import { StatusBadge, Skeleton } from '@/components/ui';
import { api } from '@/lib/api';

type Stats = {
  total: number;
  completed: number;
  inProgress: number;
  overdue: number;
  today: number;
  cancelled: number;
  unassigned: number;
  completionRate: number;
  byStatus: { status: string; count: number }[];
  timeline: { date: string; created: number; completed: number }[];
  byWorker: { workerId: string | null; name: string; count: number }[];
  recent: {
    id: string;
    number: string;
    title: string;
    status: string;
    priority?: string;
    scheduledStart?: string | null;
    customer?: string | null;
    technician?: string | null;
    site?: string | null;
  }[];
};

type Part = {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  minQuantity: number;
  unit: string;
  unitCost?: number | null;
};

type Doc = {
  id: string;
  kind: string;
  status: string;
  total: number;
  currency: string;
  number: string;
  title: string;
  customer?: { name: string };
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT: '#8a96a3',
  SCHEDULED: '#3b6fd4',
  ASSIGNED: '#5b4fcf',
  EN_ROUTE: '#0f9aa8',
  IN_PROGRESS: '#5b4fcf',
  PAUSED: '#c9891a',
  COMPLETED: '#2f9e6b',
  CANCELLED: '#9aa3ad',
  FAILED: '#d64545',
};

function formatWhen(iso?: string | null) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function StatsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [parts, setParts] = useState<Part[]>([]);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api<Stats>('/work-orders/stats'),
      api<Part[]>('/inventory/parts'),
      api<Doc[]>('/billing'),
    ])
      .then(([s, partList, docList]) => {
        setStats(s);
        setParts(partList);
        setDocs(docList);
        setError(null);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const lowStock = useMemo(
    () => parts.filter((p) => p.quantity <= p.minQuantity).slice(0, 10),
    [parts],
  );

  const billing = useMemo(() => {
    const invoices = docs.filter((d) => d.kind === 'INVOICE');
    const quotes = docs.filter((d) => d.kind === 'QUOTE');
    const paid = invoices
      .filter((d) => d.status === 'PAID')
      .reduce((acc, d) => acc + d.total, 0);
    const open = invoices
      .filter((d) => d.status !== 'PAID' && d.status !== 'CANCELLED')
      .reduce((acc, d) => acc + d.total, 0);
    return {
      quotes: quotes.length,
      invoices: invoices.length,
      paid,
      open,
      recent: docs.slice(0, 8),
    };
  }, [docs]);

  const maxWorker = Math.max(1, ...(stats?.byWorker.map((w) => w.count) ?? [1]));

  const donutData = useMemo(() => {
    if (!stats) return [];
    return stats.byStatus.map((row) => ({
      label: row.status.replaceAll('_', ' '),
      value: row.count,
      color: STATUS_COLORS[row.status] ?? 'var(--primary)',
    }));
  }, [stats]);

  const barData = useMemo(() => {
    if (!stats) return [] as Array<[string, number]>;
    return stats.byStatus.map((r) => [r.status, r.count] as [string, number]);
  }, [stats]);

  return (
    <AppShell title="Statistiques">
      {error ? <div className="error-box" style={{ marginBottom: 12 }}>{error}</div> : null}

      {loading || !stats ? (
        <Skeleton height={420} />
      ) : (
        <div className="stats-page">
          <div className="stats-grid">
            <div className="stats-card">
              <div className="muted">Aujourd’hui</div>
              <strong>{stats.today}</strong>
            </div>
            <div className="stats-card">
              <div className="muted">En cours</div>
              <strong>{stats.inProgress}</strong>
            </div>
            <div className="stats-card">
              <div className="muted">En retard</div>
              <strong className={stats.overdue ? 'is-danger' : ''}>{stats.overdue}</strong>
            </div>
            <div className="stats-card">
              <div className="muted">Non affectées</div>
              <strong>{stats.unassigned}</strong>
            </div>
            <div className="stats-card">
              <div className="muted">Terminées</div>
              <strong>{stats.completed}</strong>
            </div>
            <div className="stats-card">
              <div className="muted">Taux de clôture</div>
              <strong>{stats.completionRate}%</strong>
            </div>
          </div>

          <div className="stats-charts-row">
            <section className="stats-panel">
              <div className="stats-panel-head">
                <h2>Activité 14 jours</h2>
                <p className="muted">Créées vs terminées</p>
              </div>
              <LineChart
                labels={stats.timeline.map((t) => t.date)}
                series={[
                  {
                    key: 'created',
                    label: 'Créées',
                    color: 'var(--primary)',
                    values: stats.timeline.map((t) => t.created),
                  },
                  {
                    key: 'completed',
                    label: 'Terminées',
                    color: 'var(--success)',
                    values: stats.timeline.map((t) => t.completed),
                  },
                ]}
              />
            </section>

            <section className="stats-panel">
              <div className="stats-panel-head">
                <h2>Répartition</h2>
                <p className="muted">Par statut</p>
              </div>
              <DonutChart data={donutData} centerLabel="Total" />
            </section>
          </div>

          <div className="stats-charts-row">
            <section className="stats-panel">
              <div className="stats-panel-head">
                <h2>Histogramme des statuts</h2>
              </div>
              <StatusChart data={barData} />
            </section>

            <section className="stats-panel">
              <div className="stats-panel-head">
                <h2>Charge techniciens</h2>
                <p className="muted">Interventions affectées</p>
              </div>
              {stats.byWorker.length ? (
                <ul className="stats-worker-bars">
                  {stats.byWorker.map((w) => (
                    <li key={w.workerId ?? w.name}>
                      <div className="stats-bar-row">
                        <span>{w.name}</span>
                        <span className="muted">{w.count}</span>
                      </div>
                      <div className="stats-bar-track">
                        <div
                          className="stats-bar-fill"
                          style={{ width: `${(w.count / maxWorker) * 100}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted" style={{ margin: 0 }}>Aucune affectation.</p>
              )}
            </section>
          </div>

          <div className="stats-charts-row stats-charts-row-3">
            <section className="stats-panel">
              <div className="stats-panel-head">
                <h2>Business</h2>
              </div>
              <div className="stats-mini">
                <div>
                  <div className="muted">Devis</div>
                  <strong>{billing.quotes}</strong>
                </div>
                <div>
                  <div className="muted">Factures</div>
                  <strong>{billing.invoices}</strong>
                </div>
                <div>
                  <div className="muted">Ouvert</div>
                  <strong>{billing.open.toFixed(0)} €</strong>
                </div>
              </div>
              <div className="stats-mini" style={{ marginTop: 10 }}>
                <div>
                  <div className="muted">Encaissé</div>
                  <strong>{billing.paid.toFixed(0)} €</strong>
                </div>
              </div>
              <Link className="btn btn-secondary" href="/billing" style={{ marginTop: 12 }}>
                Voir facturation
              </Link>
            </section>

            <section className="stats-panel stats-span-2">
              <div className="stats-panel-head">
                <h2>Documents récents</h2>
              </div>
              <DataTable
                rows={billing.recent}
                rowKey={(d) => d.id}
                defaultSortKey="number"
                defaultSortDir="desc"
                pageSize={8}
                empty={<p className="muted">Aucun document</p>}
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
                ]}
              />
            </section>
          </div>

          <section className="stats-panel">
            <div className="stats-panel-head">
              <h2>Dernières interventions</h2>
              <Link className="btn btn-ghost" href="/work-orders">
                Tout voir
              </Link>
            </div>
            <DataTable
              rows={stats.recent}
              rowKey={(o) => o.id}
              defaultSortKey="number"
              defaultSortDir="desc"
              pageSize={10}
              empty={<p className="muted">Aucune intervention</p>}
              columns={[
                {
                  key: 'number',
                  header: 'N°',
                  sortValue: (o) => o.number,
                  render: (o) => o.number,
                },
                {
                  key: 'title',
                  header: 'Titre',
                  sortValue: (o) => o.title,
                  render: (o) => (
                    <>
                      <div>{o.title}</div>
                      <div className="muted" style={{ fontSize: '0.8rem' }}>
                        {o.site ?? ''}
                      </div>
                    </>
                  ),
                },
                {
                  key: 'customer',
                  header: 'Client',
                  sortValue: (o) => o.customer ?? '',
                  render: (o) => o.customer ?? '',
                },
                {
                  key: 'technician',
                  header: 'Technicien',
                  sortValue: (o) => o.technician ?? '',
                  render: (o) => o.technician ?? '',
                },
                {
                  key: 'scheduledStart',
                  header: 'Planifié',
                  sortValue: (o) => (o.scheduledStart ? new Date(o.scheduledStart) : null),
                  render: (o) => formatWhen(o.scheduledStart),
                },
                {
                  key: 'status',
                  header: 'Statut',
                  sortValue: (o) => o.status,
                  render: (o) => <StatusBadge status={o.status} />,
                },
              ]}
            />
          </section>

          <section className="stats-panel">
            <div className="stats-panel-head">
              <h2>Stock bas</h2>
              <Link className="btn btn-ghost" href="/inventory">
                Stock
              </Link>
            </div>
            <DataTable
              rows={lowStock}
              rowKey={(p) => p.id}
              defaultSortKey="quantity"
              defaultSortDir="asc"
              pageSize={10}
              empty={<p className="muted">Aucun article sous seuil</p>}
              columns={[
                {
                  key: 'sku',
                  header: 'SKU',
                  sortValue: (p) => p.sku,
                  render: (p) => p.sku,
                },
                {
                  key: 'name',
                  header: 'Article',
                  sortValue: (p) => p.name,
                  render: (p) => p.name,
                },
                {
                  key: 'quantity',
                  header: 'Stock',
                  sortValue: (p) => p.quantity,
                  render: (p) => (
                    <span style={{ color: 'var(--danger)' }}>
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
                  key: 'unitCost',
                  header: 'Prix',
                  sortValue: (p) => p.unitCost ?? 0,
                  render: (p) => `${(p.unitCost ?? 0).toFixed(2)} €`,
                },
              ]}
            />
          </section>
        </div>
      )}
    </AppShell>
  );
}
