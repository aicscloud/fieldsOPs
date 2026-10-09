'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { Card, Skeleton, Spinner, StatusBadge } from '@/components/ui';
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
  scheduledStart?: string | null;
  scheduledEnd?: string | null;
  customer?: { name: string };
  site?: { city?: string | null } | null;
  assignedTo?: { firstName: string; lastName: string } | null;
};

type Doc = {
  kind: string;
  status: string;
  total: number;
  currency: string;
};

const DONE = new Set(['COMPLETED', 'CANCELLED', 'FAILED']);
const LIVE = new Set(['EN_ROUTE', 'IN_PROGRESS', 'PAUSED']);

function dayKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function money(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency || 'XAF',
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${Math.round(amount).toLocaleString('fr-FR')} ${currency}`;
  }
}

function clock(iso?: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setLoading(true);
    Promise.all([
      api<Stats>('/work-orders/stats'),
      api<WorkOrder[]>('/work-orders'),
      api<Doc[]>('/billing').catch(() => [] as Doc[]),
    ])
      .then(([s, list, billing]) => {
        setStats(s);
        setOrders(list);
        setDocs(billing);
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

  const week = useMemo(() => {
    const start = startOfDay(now);
    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      const key = dayKey(day);
      const count = orders.filter(
        (o) =>
          o.status !== 'CANCELLED' &&
          o.scheduledStart &&
          dayKey(new Date(o.scheduledStart)) === key,
      ).length;
      return { day, count, today: i === 0 };
    });
  }, [orders, now]);

  const queue = useMemo(() => {
    return orders
      .filter((o) => !DONE.has(o.status))
      .map((o) => {
        const end = o.scheduledEnd ? new Date(o.scheduledEnd) : null;
        const start = o.scheduledStart ? new Date(o.scheduledStart) : null;
        const late = !!end && end < now;
        const live = LIVE.has(o.status);
        const isToday = !!start && dayKey(start) === today;
        const unassigned = !o.assignedTo;
        return { ...o, late, live, isToday, unassigned, startMs: start?.getTime() ?? Number.POSITIVE_INFINITY };
      })
      .filter((o) => o.late || o.live || o.isToday || o.unassigned)
      .sort((a, b) => {
        if (a.live !== b.live) return a.live ? -1 : 1;
        if (a.late !== b.late) return a.late ? -1 : 1;
        if (a.isToday !== b.isToday) return a.isToday ? -1 : 1;
        return a.startMs - b.startMs;
      })
      .slice(0, 8);
  }, [orders, now, today]);

  const load = useMemo(() => {
    const end = startOfDay(now);
    end.setDate(end.getDate() + 7);
    const map = new Map<string, number>();
    for (const order of orders) {
      if (!order.assignedTo || !order.scheduledStart || order.status === 'CANCELLED') continue;
      const start = new Date(order.scheduledStart);
      if (start < startOfDay(now) || start >= end) continue;
      const name = `${order.assignedTo.firstName} ${order.assignedTo.lastName}`;
      map.set(name, (map.get(name) ?? 0) + 1);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [orders, now]);

  const billing = useMemo(() => {
    const openInvoices = docs.filter(
      (d) => d.kind === 'INVOICE' && d.status !== 'PAID' && d.status !== 'CANCELLED',
    );
    const openQuotes = docs.filter(
      (d) => d.kind === 'QUOTE' && d.status !== 'REJECTED' && d.status !== 'CANCELLED',
    );
    const currency = openInvoices[0]?.currency || docs[0]?.currency || 'XAF';
    const due = openInvoices.reduce((sum, d) => sum + d.total, 0);
    return { count: openInvoices.length, due, currency, quotes: openQuotes.length };
  }, [docs]);

  const dateLabel = now.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <AppShell title="Activité">
      {error ? <div className="error-box" style={{ marginBottom: 12 }}>{error}</div> : null}
      <p className="dash-date">{dateLabel}</p>
      {loading ? <Spinner /> : null}

      {loading ? (
        <div className="dash-metrics">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} height={84} />
          ))}
        </div>
      ) : (
        <div className="dash-metrics">
          <Link href="/planning" className="dash-metric-link">
            <Card className="dash-metric">
              <span>Aujourd’hui</span>
              <strong>{stats?.today ?? 0}</strong>
              <em>au planning</em>
            </Card>
          </Link>
          <Link href="/work-orders" className="dash-metric-link">
            <Card className="dash-metric">
              <span>À affecter</span>
              <strong>{stats?.unassigned ?? 0}</strong>
              <em>sans technicien</em>
            </Card>
          </Link>
          <Link href="/planning" className="dash-metric-link">
            <Card className={`dash-metric ${(stats?.overdue ?? 0) > 0 ? 'is-alert' : ''}`}>
              <span>En retard</span>
              <strong>{stats?.overdue ?? 0}</strong>
              <em>échéance dépassée</em>
            </Card>
          </Link>
          <Link href="/billing" className="dash-metric-link">
            <Card className="dash-metric">
              <span>À encaisser</span>
              <strong className="dash-money">{money(billing.due, billing.currency)}</strong>
              <em>
                {billing.count} facture{billing.count > 1 ? 's' : ''} ouverte{billing.count > 1 ? 's' : ''}
              </em>
            </Card>
          </Link>
        </div>
      )}

      <div className="dash-week" aria-label="Sept prochains jours">
        {(loading ? Array.from({ length: 7 }, () => null) : week).map((cell, i) =>
          cell ? (
            <div key={cell.day.toISOString()} className={`dash-day ${cell.today ? 'is-today' : ''}`}>
              <small>
                {cell.day.toLocaleDateString('fr-FR', { weekday: 'short' })}{' '}
                {cell.day.getDate()}
              </small>
              <b className={cell.count === 0 ? 'is-zero' : ''}>{cell.count}</b>
            </div>
          ) : (
            <Skeleton key={i} height={64} />
          ),
        )}
      </div>

      <div className="ops-board">
        <Card>
          <div className="dash-head">
            <h2>À traiter</h2>
            <Link href="/planning">Ouvrir le planning</Link>
          </div>
          {loading ? (
            <Skeleton height={280} />
          ) : queue.length ? (
            <div>
              {queue.map((order) => (
                <Link key={order.id} href="/work-orders" className={`ops-job ${order.late ? 'is-late' : ''}`}>
                  <time>{clock(order.scheduledStart)}</time>
                  <div style={{ minWidth: 0 }}>
                    <strong>{order.customer?.name ?? order.number}</strong>
                    <small>
                      {order.title}
                      {order.site?.city ? ` · ${order.site.city}` : ''}
                    </small>
                  </div>
                  <span className="ops-who">
                    {order.assignedTo
                      ? `${order.assignedTo.firstName} ${order.assignedTo.lastName}`
                      : 'Non affectée'}
                  </span>
                  <StatusBadge status={order.status} />
                </Link>
              ))}
            </div>
          ) : (
            <p className="muted" style={{ margin: '8px 0 0' }}>
              Aucune intervention à traiter.
            </p>
          )}
        </Card>

        <div className="ops-side">
          <Card>
            <div className="dash-head">
              <h2>Équipe, 7 jours</h2>
            </div>
            {loading ? (
              <Skeleton height={160} />
            ) : load.length ? (
              <div>
                {load.map(([name, count]) => (
                  <div key={name} className="ops-line">
                    <span style={{ color: 'var(--ink)' }}>{name}</span>
                    <b>{count}</b>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted" style={{ margin: '8px 0 0' }}>
                Personne n’est planifié sur la semaine.
              </p>
            )}
          </Card>

          <Card>
            <div className="dash-head">
              <h2>Facturation</h2>
              <Link href="/billing">Voir</Link>
            </div>
            {loading ? (
              <Skeleton height={120} />
            ) : (
              <div>
                <div className="ops-line">
                  <span>Factures ouvertes</span>
                  <b>{money(billing.due, billing.currency)}</b>
                </div>
                <div className="ops-line">
                  <span>Nombre</span>
                  <b>{billing.count}</b>
                </div>
                <div className="ops-line">
                  <span>Devis en cours</span>
                  <b>{billing.quotes}</b>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
