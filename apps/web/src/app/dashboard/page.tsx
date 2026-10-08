'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { Card, EmptyState, Skeleton, StatusBadge } from '@/components/ui';
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
};

type WorkOrder = {
  id: string;
  number: string;
  title: string;
  status: string;
  priority?: string | null;
  scheduledStart?: string | null;
  scheduledEnd?: string | null;
  customer?: { name: string };
  site?: { name: string; city?: string | null } | null;
  assignedTo?: { firstName: string; lastName: string } | null;
};

const DONE = new Set(['COMPLETED', 'CANCELLED', 'FAILED']);
const OPEN_STATUSES = ['DRAFT', 'SCHEDULED', 'ASSIGNED', 'EN_ROUTE', 'IN_PROGRESS', 'PAUSED'];
const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Brouillon',
  SCHEDULED: 'Planifiée',
  ASSIGNED: 'Affectée',
  EN_ROUTE: 'En route',
  IN_PROGRESS: 'En cours',
  PAUSED: 'En pause',
};
const STATUS_COLOR: Record<string, string> = {
  DRAFT: '#8a96a3',
  SCHEDULED: '#3b6fd4',
  ASSIGNED: '#5b4fcf',
  EN_ROUTE: '#0f9aa8',
  IN_PROGRESS: '#5b4fcf',
  PAUSED: '#c9891a',
};

function dayKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function formatWhen(iso?: string | null) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [counts, setCounts] = useState({ customers: 0, sites: 0, team: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setLoading(true);
    Promise.all([
      api<Stats>('/work-orders/stats'),
      api<WorkOrder[]>('/work-orders'),
      api<unknown[]>('/customers'),
      api<unknown[]>('/sites'),
      api<unknown[]>('/users'),
    ])
      .then(([s, list, customers, sites, users]) => {
        setStats(s);
        setOrders(list);
        setCounts({
          customers: customers.length,
          sites: sites.length,
          team: users.length,
        });
        setError(null);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const now = useMemo(() => new Date(), [orders]);
  const today = dayKey(now);

  const attention = useMemo(() => {
    return orders
      .filter((o) => !DONE.has(o.status))
      .map((o) => {
        const end = o.scheduledEnd ? new Date(o.scheduledEnd) : null;
        const start = o.scheduledStart ? new Date(o.scheduledStart) : null;
        return {
          ...o,
          late: !!end && end < now,
          today: !!start && dayKey(start) === today,
          startMs: start?.getTime() ?? Number.POSITIVE_INFINITY,
        };
      })
      .sort((a, b) => {
        if (a.late !== b.late) return a.late ? -1 : 1;
        if (a.today !== b.today) return a.today ? -1 : 1;
        return a.startMs - b.startMs;
      })
      .slice(0, 6);
  }, [orders, now, today]);

  const openByStatus = useMemo(() => {
    const map: Record<string, number> = {};
    for (const order of orders) {
      if (!OPEN_STATUSES.includes(order.status)) continue;
      map[order.status] = (map[order.status] ?? 0) + 1;
    }
    return OPEN_STATUSES.filter((status) => map[status]).map(
      (status) => [status, map[status]] as const,
    );
  }, [orders]);

  const openMax = Math.max(1, ...openByStatus.map(([, n]) => n));

  return (
    <AppShell title="Activité">
      {error ? <div className="error-box" style={{ marginBottom: 12 }}>{error}</div> : null}

      {loading ? (
        <div className="kpi-grid" style={{ marginBottom: 14 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} height={88} />
          ))}
        </div>
      ) : (
        <div className="kpi-grid" style={{ marginBottom: 14 }}>
          <Card className="kpi">
            <div className="kpi-label">Aujourd’hui</div>
            <div className="kpi-value">{stats?.today ?? 0}</div>
            <div className="kpi-trend" style={{ color: 'var(--muted)' }}>planifiées ce jour</div>
          </Card>
          <Card className="kpi">
            <div className="kpi-label">En cours</div>
            <div className="kpi-value">{stats?.inProgress ?? 0}</div>
            <div className="kpi-trend" style={{ color: 'var(--muted)' }}>sur le terrain</div>
          </Card>
          <Card className="kpi">
            <div className="kpi-label">En retard</div>
            <div className="kpi-value">{stats?.overdue ?? 0}</div>
            <div
              className={`kpi-trend ${(stats?.overdue ?? 0) > 0 ? 'down' : ''}`}
              style={(stats?.overdue ?? 0) > 0 ? undefined : { color: 'var(--muted)' }}
            >
              échéance dépassée
            </div>
          </Card>
          <Card className="kpi">
            <div className="kpi-label">Sans technicien</div>
            <div className="kpi-value">{stats?.unassigned ?? 0}</div>
            <div className="kpi-trend" style={{ color: 'var(--muted)' }}>encore ouvertes</div>
          </Card>
        </div>
      )}

      <div className="dash-layout">
        <Card>
          <div className="dash-head">
            <h2>À suivre</h2>
            <Link href="/planning">Planning</Link>
          </div>
          {loading ? (
            <Skeleton height={220} />
          ) : attention.length ? (
            <div className="dash-list">
              {attention.map((order) => (
                <Link key={order.id} href="/work-orders" className="dash-row">
                  <div style={{ minWidth: 0 }}>
                    <div className="dash-title">
                      {order.number} · {order.title}
                    </div>
                    <div className="dash-meta">
                      {order.customer?.name ?? 'Sans client'}
                      {order.assignedTo
                        ? ` · ${order.assignedTo.firstName} ${order.assignedTo.lastName}`
                        : ' · Non affectée'}
                      {order.site?.city ? ` · ${order.site.city}` : ''}
                      {order.scheduledStart ? ` · ${formatWhen(order.scheduledStart)}` : ''}
                    </div>
                  </div>
                  <div style={{ display: 'grid', justifyItems: 'end', gap: 4 }}>
                    <StatusBadge status={order.status} />
                    {order.late ? <span className="kpi-trend down">Retard</span> : null}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Rien en attente"
              description="Les interventions ouvertes apparaîtront ici."
            />
          )}
        </Card>

        <Card>
          <div className="dash-head">
            <h2>Encore ouvertes</h2>
            <Link href="/work-orders">Interventions</Link>
          </div>
          {loading ? (
            <Skeleton height={220} />
          ) : openByStatus.length ? (
            <>
              <div className="dash-statuses">
                {openByStatus.map(([status, count]) => (
                  <div key={status} className="dash-status">
                    <span>{STATUS_LABEL[status] ?? status}</span>
                    <div className="dash-bar">
                      <span
                        style={{
                          width: `${Math.max(8, (count / openMax) * 100)}%`,
                          background: STATUS_COLOR[status] ?? 'var(--primary)',
                        }}
                      />
                    </div>
                    <strong>{count}</strong>
                  </div>
                ))}
              </div>
              <p className="dash-note">
                {stats?.completed ?? 0} terminées
                {stats ? ` · ${stats.completionRate} %` : ''}
                {(stats?.cancelled ?? 0) > 0 ? ` · ${stats?.cancelled} annulées` : ''}
              </p>
            </>
          ) : (
            <EmptyState title="Aucune intervention ouverte" />
          )}
        </Card>
      </div>

      {!loading ? (
        <p className="dash-foot">
          {counts.customers} clients · {counts.sites} sites · {counts.team} personnes ·{' '}
          {stats?.total ?? 0} interventions
        </p>
      ) : null}
    </AppShell>
  );
}
