'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { StatusChart } from '@/components/StatusChart';
import { Card, EmptyState, Skeleton, StatusBadge } from '@/components/ui';
import { api } from '@/lib/api';

type Stats = {
  total: number;
  completed: number;
  inProgress: number;
  overdue: number;
  today: number;
};

type WorkOrder = {
  id: string;
  number: string;
  title: string;
  status: string;
  scheduledStart?: string | null;
  customer?: { name: string };
  assignedTo?: { firstName: string; lastName: string } | null;
};

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

  const todayKey = new Date().toISOString().slice(0, 10);
  const todayOrders = useMemo(
    () =>
      orders.filter(
        (o) =>
          o.scheduledStart?.slice(0, 10) === todayKey &&
          !['COMPLETED', 'CANCELLED'].includes(o.status),
      ),
    [orders, todayKey],
  );

  const byStatus = useMemo(() => {
    const map: Record<string, number> = {};
    for (const o of orders) map[o.status] = (map[o.status] ?? 0) + 1;
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [orders]);

  return (
    <AppShell
      title="Activité"
    >
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
            <div className="kpi-trend up">
              <ArrowUpRight size={14} /> planifiées
            </div>
          </Card>
          <Card className="kpi">
            <div className="kpi-label">En cours</div>
            <div className="kpi-value">{stats?.inProgress ?? 0}</div>
            <div className="kpi-trend up">
              <ArrowUpRight size={14} /> terrain
            </div>
          </Card>
          <Card className="kpi">
            <div className="kpi-label">En retard</div>
            <div className="kpi-value">{stats?.overdue ?? 0}</div>
            <div className={`kpi-trend ${(stats?.overdue ?? 0) > 0 ? 'down' : 'up'}`}>
              {(stats?.overdue ?? 0) > 0 ? (
                <ArrowDownRight size={14} />
              ) : (
                <ArrowUpRight size={14} />
              )}
              à surveiller
            </div>
          </Card>
          <Card className="kpi">
            <div className="kpi-label">Terminées</div>
            <div className="kpi-value">{stats?.completed ?? 0}</div>
            <div className="kpi-trend up">
              <ArrowUpRight size={14} /> total {stats?.total ?? 0}
            </div>
          </Card>
        </div>
      )}

      <div className="kpi-grid" style={{ marginBottom: 14 }}>
        <Card className="kpi">
          <div className="kpi-label">Clients</div>
          <div className="kpi-value">{counts.customers}</div>
        </Card>
        <Card className="kpi">
          <div className="kpi-label">Sites</div>
          <div className="kpi-value">{counts.sites}</div>
        </Card>
        <Card className="kpi">
          <div className="kpi-label">Équipe</div>
          <div className="kpi-value">{counts.team}</div>
        </Card>
        <Card className="kpi">
          <div className="kpi-label">Interventions</div>
          <div className="kpi-value">{stats?.total ?? 0}</div>
        </Card>
      </div>

      <div className="grid-2">
        <Card title="Interventions par statut">
          {loading ? <Skeleton height={220} /> : <StatusChart data={byStatus} />}
        </Card>

        <Card title="À traiter aujourd’hui">
          {todayOrders.length ? (
            <div style={{ display: 'grid', gap: 10 }}>
              {todayOrders.slice(0, 8).map((order) => (
                <div
                  key={order.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 10,
                    paddingBottom: 10,
                    borderBottom: '1px solid var(--line)',
                  }}
                >
                  <div>
                    <div>
                      {order.number} · {order.title}
                    </div>
                    <div className="muted" style={{ fontSize: '0.85rem' }}>
                      {order.customer?.name}
                      {order.assignedTo
                        ? ` · ${order.assignedTo.firstName} ${order.assignedTo.lastName}`
                        : ' · Non affectée'}
                    </div>
                  </div>
                  <StatusBadge status={order.status} />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Rien à traiter"
              description="Créez une intervention depuis la page Interventions."
            />
          )}
        </Card>
      </div>
    </AppShell>
  );
}
