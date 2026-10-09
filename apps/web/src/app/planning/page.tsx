'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  AlertTriangle,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  Clock3,
  Inbox,
  Mail,
  MapPin,
  Package,
  Phone,
  Plus,
  StickyNote,
  Tag,
  UserRound,
  Users,
  Wrench,
} from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { QuickCreateWorkOrder } from '@/components/QuickCreateWorkOrder';
import { SearchSelect } from '@/components/SearchSelect';
import { Avatar, Button, Drawer, EmptyState, Modal, PageLoading, StatusBadge, Toast } from '@/components/ui';
import { api } from '@/lib/api';
import {
  PRIORITY_FILTER_OPTIONS,
  STATUS_FILTER_OPTIONS,
  TEAM_FILTER_OPTIONS,
  searchCustomers,
  searchGroups,
  searchSites,
  searchWorkers,
  searchWorkOrderTypes,
} from '@/lib/search';

type Worker = {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  group?: { id: string; name: string } | null;
};

type WorkOrder = {
  id: string;
  number: string;
  title: string;
  description?: string | null;
  status: string;
  priority?: string | null;
  estimatedMinutes?: number | null;
  scheduledStart?: string | null;
  scheduledEnd?: string | null;
  assignedToId?: string | null;
  team?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  customer?: {
    id?: string;
    name: string;
    type?: string;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    notes?: string | null;
  };
  site?: {
    id?: string;
    name: string;
    address: string;
    city?: string | null;
    contactName?: string | null;
    contactPhone?: string | null;
    accessInstructions?: string | null;
  };
  type?: { id: string; name: string; defaultDuration?: number | null } | null;
  assignedTo?: {
    id: string;
    firstName: string;
    lastName: string;
    phone?: string | null;
    email?: string | null;
  } | null;
  children?: {
    team?: string;
    assignedTo?: { firstName: string; lastName: string } | null;
  }[];
  notes?: { id: string; body: string; createdAt: string }[];
  checklist?: { id: string; label: string; done: boolean }[];
  photos?: { id: string; url: string; caption?: string | null }[];
  signature?: { signerName: string; signedAt?: string } | null;
  partsUsed?: {
    id: string;
    quantity: number;
    part: { sku: string; name: string; unit: string };
  }[];
};

type ViewMode = 'day' | 'week' | 'month';
type StatusFilter =
  | 'ALL'
  | 'LATE'
  | 'DRAFT'
  | 'SCHEDULED'
  | 'ASSIGNED'
  | 'EN_ROUTE'
  | 'IN_PROGRESS'
  | 'PAUSED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'FAILED';

const STATUS_FILTERS: { key: StatusFilter; label: string; tone: string }[] = [
  { key: 'ALL', label: 'Tout', tone: 'all' },
  { key: 'ASSIGNED', label: 'Affectée', tone: 'assigned' },
  { key: 'EN_ROUTE', label: 'En route', tone: 'en-route' },
  { key: 'IN_PROGRESS', label: 'En cours', tone: 'in-progress' },
  { key: 'LATE', label: 'Retard', tone: 'late' },
];

const HOURS = Array.from({ length: 12 }, (_, i) => i + 7);
const RANGE_START_MIN = HOURS[0] * 60;
const RANGE_END_MIN = (HOURS[HOURS.length - 1] + 1) * 60;
const RANGE_SPAN_MIN = RANGE_END_MIN - RANGE_START_MIN;
const DONE = new Set(['COMPLETED', 'CANCELLED', 'FAILED']);

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Clé jour locale sans ":" (évite de casser le parse des slot ids). */
function dayKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseDayKey(key: string) {
  const [y, m, d] = key.split('-').map(Number);
  if (!y || !m || !d) return null;
  const date = new Date(y, m - 1, d, 0, 0, 0, 0);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Position % dans la bande horaire (ex. 10h–11h = une colonne pleine). */
function blockGeometry(order: WorkOrder) {
  if (!order.scheduledStart) return null;
  const start = new Date(order.scheduledStart);
  const end = order.scheduledEnd
    ? new Date(order.scheduledEnd)
    : new Date(start.getTime() + 60 * 60_000);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;

  let startMin = start.getHours() * 60 + start.getMinutes();
  let endMin = end.getHours() * 60 + end.getMinutes();
  if (endMin <= startMin) endMin = startMin + 60;

  startMin = Math.max(RANGE_START_MIN, Math.min(startMin, RANGE_END_MIN - 15));
  endMin = Math.max(startMin + 15, Math.min(endMin, RANGE_END_MIN));

  const left = ((startMin - RANGE_START_MIN) / RANGE_SPAN_MIN) * 100;
  const width = ((endMin - startMin) / RANGE_SPAN_MIN) * 100;
  return { left: `${left}%`, width: `${width}%` };
}

function formatDayLabel(d: Date, long = false) {
  return d.toLocaleDateString('fr-FR', {
    weekday: long ? 'long' : 'short',
    day: 'numeric',
    month: long ? 'long' : 'short',
  });
}

function formatTime(iso?: string | null) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function isLate(order: WorkOrder, now = new Date()) {
  if (DONE.has(order.status) || !order.scheduledEnd) return false;
  return new Date(order.scheduledEnd) < now;
}

function toneClass(order: WorkOrder) {
  if (isLate(order)) return 'late';
  return order.status.toLowerCase().replaceAll('_', '-');
}

function matchesStatusFilter(order: WorkOrder, filter: StatusFilter, now: Date) {
  if (filter === 'ALL') return true;
  if (filter === 'LATE') return isLate(order, now);
  return order.status === filter;
}

function initials(first: string, last: string) {
  return `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase();
}

/** Conserve la durée existante (ou estimation) lors d’un déplacement. */
function durationMs(order: WorkOrder) {
  if (order.scheduledStart && order.scheduledEnd) {
    const ms =
      new Date(order.scheduledEnd).getTime() - new Date(order.scheduledStart).getTime();
    if (ms >= 15 * 60_000) return ms;
  }
  if (order.estimatedMinutes && order.estimatedMinutes > 0) {
    return order.estimatedMinutes * 60_000;
  }
  if (order.type?.defaultDuration && order.type.defaultDuration > 0) {
    return order.type.defaultDuration * 60_000;
  }
  return 60 * 60_000;
}

function formatDuration(ms: number) {
  const mins = Math.round(ms / 60_000);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h} h ${m}` : `${h} h`;
}

function transportLabel(order: { children?: { assignedTo?: { firstName: string; lastName: string } | null }[] }) {
  const person = order.children?.find((child) => child.assignedTo)?.assignedTo;
  return person ? ` · transport ${person.firstName} ${person.lastName}` : '';
}

function priorityLabel(p?: string | null) {
  if (p === 'URGENT') return 'Urgente';
  if (p === 'HIGH') return 'Haute';
  if (p === 'LOW') return 'Basse';
  return 'Normale';
}

function DraggableCard({
  order,
  compact,
  onOpen,
  style,
}: {
  order: WorkOrder;
  compact?: boolean;
  onOpen?: () => void;
  style?: React.CSSProperties;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: order.id,
    data: { order },
  });
  const late = isLate(order);
  const tone = toneClass(order);

  if (compact) {
    return (
      <button
        type="button"
        ref={setNodeRef}
        style={style}
        className={`plan-block tone-${tone} ${isDragging ? 'is-dragging' : ''} ${late ? 'is-late' : ''}`}
        onClick={onOpen}
        {...listeners}
        {...attributes}
      >
        <span className="plan-block-top">
          <span className="plan-block-code">{order.number}</span>
          {late ? <span className="plan-late-pill">Retard</span> : null}
        </span>
        <span className="plan-block-title">{order.customer?.name ?? order.title}</span>
        <span className="plan-block-meta">
          <Clock3 size={11} />
          {formatTime(order.scheduledStart)}
          {order.scheduledEnd ? `–${formatTime(order.scheduledEnd)}` : ''}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      ref={setNodeRef}
      className={`plan-queue-card tone-${tone} ${isDragging ? 'is-dragging' : ''} ${late ? 'is-late' : ''}`}
      onClick={onOpen}
      {...listeners}
      {...attributes}
    >
      <div className="plan-queue-head">
        <span className="plan-block-code">{order.number}</span>
        {late ? <span className="plan-late-pill">Retard</span> : null}
      </div>
      <div className="plan-queue-title">{order.customer?.name ?? order.title}</div>
      {order.site ? (
        <div className="plan-queue-meta">{order.site.name}</div>
      ) : null}
    </button>
  );
}

function DropSlot({
  id,
  isNowHour,
  children,
}: {
  id: string;
  isNowHour?: boolean;
  children?: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`plan-slot-wrap ${isOver ? 'is-over' : ''} ${isNowHour ? 'is-now-hour' : ''}`}
    >
      {children}
    </div>
  );
}

function UnplannedDrop({
  children,
  count,
}: {
  children: React.ReactNode;
  count: number;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: 'unplanned' });
  return (
    <aside ref={setNodeRef} className={`plan-queue ${isOver ? 'is-over' : ''}`}>
      <div className="plan-queue-header">
        <div>
          <div className="plan-kicker">File d’attente</div>
          <h2>À planifier</h2>
        </div>
        <span className="plan-count">{count}</span>
      </div>
      <p className="plan-queue-hint">Glisser vers un créneau · déposer ici pour retirer</p>
      <div className="plan-queue-list">{children}</div>
    </aside>
  );
}

export default function PlanningPage() {
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>('day');
  const [cursor, setCursor] = useState(() => startOfDay(new Date()));
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selected, setSelected] = useState<WorkOrder | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [q, setQ] = useState('');
  const [groupId, setGroupId] = useState('');
  const [groupLabel, setGroupLabel] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [companyLabel, setCompanyLabel] = useState('');
  const [siteId, setSiteId] = useState('');
  const [siteLabel, setSiteLabel] = useState('');
  const [workerId, setWorkerId] = useState('');
  const [workerLabel, setWorkerLabel] = useState('');
  const [typeId, setTypeId] = useState('');
  const [typeLabel, setTypeLabel] = useState('');
  const [priority, setPriority] = useState('');
  const [city, setCity] = useState('');
  const [team, setTeam] = useState('');
  const [now, setNow] = useState(() => new Date());

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [wo, users] = await Promise.all([
        api<WorkOrder[]>('/work-orders'),
        api<Worker[]>('/users'),
      ]);
      setOrders(wo);
      setWorkers(users.filter((u) => u.role === 'FIELD_WORKER'));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(t);
  }, []);

  const days = useMemo(() => {
    if (view === 'day') return [cursor];
    if (view === 'week') {
      const mondayOffset = (cursor.getDay() + 6) % 7;
      const monday = addDays(cursor, -mondayOffset);
      return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
    }
    return [];
  }, [view, cursor]);

  const cityOptions = useMemo(() => {
    const cities = new Set<string>();
    for (const order of orders) {
      if (order.site?.city) cities.add(order.site.city);
    }
    return [...cities]
      .sort((a, b) => a.localeCompare(b, 'fr'))
      .map((name) => ({ value: name, label: name }));
  }, [orders]);

  const visibleOrders = useMemo(() => {
    const inGroup = groupId
      ? new Set(workers.filter((w) => w.group?.id === groupId).map((w) => w.id))
      : null;
    const needle = q.trim().toLowerCase();
    return orders.filter((o) => {
      if (companyId && o.customer?.id !== companyId) return false;
      if (siteId && o.site?.id !== siteId) return false;
      if (inGroup && (!o.assignedToId || !inGroup.has(o.assignedToId))) return false;
      if (workerId && o.assignedToId !== workerId) return false;
      if (typeId && o.type?.id !== typeId) return false;
      if (priority && o.priority !== priority) return false;
      if (city && o.site?.city !== city) return false;
      if (team && o.team !== team) return false;
      if (needle) {
        const hay = `${o.number} ${o.title} ${o.customer?.name ?? ''} ${o.site?.name ?? ''} ${o.site?.city ?? ''}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [orders, workers, groupId, companyId, siteId, workerId, typeId, priority, city, team, q]);

  const unplanned = useMemo(
    () =>
      visibleOrders.filter(
        (o) => !o.assignedToId && !DONE.has(o.status),
      ),
    [visibleOrders],
  );

  function inVisiblePeriod(date: Date) {
    if (view === 'month') {
      return (
        date.getFullYear() === cursor.getFullYear() &&
        date.getMonth() === cursor.getMonth()
      );
    }
    return days.some((d) => sameDay(date, d));
  }

  /** Techniciens avec ≥1 intervention planifiée sur la période (jour / semaine / mois). */
  const busyWorkerIds = useMemo(() => {
    const ids = new Set<string>();
    for (const o of visibleOrders) {
      if (!o.assignedToId || !o.scheduledStart) continue;
      if (o.status === 'CANCELLED') continue;
      if (!matchesStatusFilter(o, statusFilter, now)) continue;
      if (inVisiblePeriod(new Date(o.scheduledStart))) ids.add(o.assignedToId);
    }
    return ids;
  }, [visibleOrders, days, view, cursor, statusFilter, now]);

  function selectStatusFilter(key: StatusFilter) {
    setStatusFilter(key);
  }

  const boardWorkers = useMemo(() => {
    const pool = workers.filter((w) => {
      if (groupId && w.group?.id !== groupId) return false;
      if (workerId && w.id !== workerId) return false;
      return true;
    });
    // Pendant un drag : les techniciens du filtre (pour affecter un créneau vide).
    if (activeId) return pool;
    return pool.filter((w) => busyWorkerIds.has(w.id));
  }, [workers, busyWorkerIds, activeId, groupId, workerId]);

  const lateOrders = useMemo(
    () => visibleOrders.filter((o) => isLate(o, now)),
    [visibleOrders, now],
  );

  const todayCount = useMemo(
    () =>
      visibleOrders.filter(
        (o) => o.scheduledStart && sameDay(new Date(o.scheduledStart), now),
      ).length,
    [visibleOrders, now],
  );

  const activeOrder = orders.find((o) => o.id === activeId) ?? null;

  async function openDetail(order: WorkOrder) {
    setSelected(order);
    setDetailLoading(true);
    try {
      const full = await api<WorkOrder>(`/work-orders/${order.id}`);
      setSelected(full);
    } catch {
      /* garde la version liste */
    } finally {
      setDetailLoading(false);
    }
  }

  async function assignToSlot(orderId: string, workerId: string, day: Date, hour: number) {
    if (Number.isNaN(day.getTime()) || !Number.isFinite(hour) || hour < 0 || hour > 23) {
      setToast('Créneau invalide');
      return;
    }
    const current = orders.find((o) => o.id === orderId);
    const span = current ? durationMs(current) : 60 * 60_000;
    const start = new Date(day);
    start.setHours(hour, 0, 0, 0);
    const end = new Date(start.getTime() + span);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      setToast('Créneau invalide');
      return;
    }

    const conflict = orders.find(
      (o) =>
        o.id !== orderId &&
        o.assignedToId === workerId &&
        o.scheduledStart &&
        o.scheduledEnd &&
        new Date(o.scheduledStart) < end &&
        new Date(o.scheduledEnd) > start &&
        !DONE.has(o.status),
    );
    if (conflict) {
      setToast(`Conflit avec ${conflict.number}`);
      return;
    }

    const worker = workers.find((w) => w.id === workerId);
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              assignedToId: workerId,
              scheduledStart: start.toISOString(),
              scheduledEnd: end.toISOString(),
              status: o.status === 'DRAFT' ? 'ASSIGNED' : o.status,
              assignedTo: worker
                ? { id: worker.id, firstName: worker.firstName, lastName: worker.lastName }
                : o.assignedTo,
            }
          : o,
      ),
    );
    if (selected?.id === orderId) {
      setSelected((prev) =>
        prev
          ? {
              ...prev,
              assignedToId: workerId,
              scheduledStart: start.toISOString(),
              scheduledEnd: end.toISOString(),
              assignedTo: worker
                ? { id: worker.id, firstName: worker.firstName, lastName: worker.lastName }
                : prev.assignedTo,
            }
          : prev,
      );
    }

    try {
      await api(`/work-orders/${orderId}/assign`, {
        method: 'POST',
        body: JSON.stringify({
          fieldWorkerId: workerId,
          scheduledStart: start.toISOString(),
          scheduledEnd: end.toISOString(),
        }),
      });
      setToast(
        `Déplacé · ${formatTime(start.toISOString())}–${formatTime(end.toISOString())} (${formatDuration(span)})`,
      );
      await load();
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Affectation impossible');
      await load();
    }
  }

  async function unassignOrder(orderId: string) {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              assignedToId: null,
              assignedTo: null,
              scheduledStart: null,
              scheduledEnd: null,
              status: o.status === 'ASSIGNED' || o.status === 'SCHEDULED' ? 'DRAFT' : o.status,
            }
          : o,
      ),
    );
    try {
      await api(`/work-orders/${orderId}/unassign`, { method: 'POST' });
      setToast('Remis en file d’attente');
      await load();
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Désaffectation impossible');
      await load();
    }
  }

  function onDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  async function onDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const overId = event.over?.id ? String(event.over.id) : null;
    if (!overId) return;
    if (overId === 'unplanned') {
      const order = orders.find((o) => o.id === event.active.id);
      if (order?.assignedToId) await unassignOrder(String(event.active.id));
      return;
    }
    if (!overId.startsWith('slot:')) return;
    const parts = overId.split(':');
    // slot:<workerId>:<YYYY-MM-DD>:<hour>
    const hourStr = parts.at(-1);
    const dateKey = parts.at(-2);
    const workerId = parts.slice(1, -2).join(':');
    const day = dateKey ? parseDayKey(dateKey) : null;
    if (!day || !workerId || hourStr == null) {
      setToast('Créneau invalide');
      return;
    }
    await assignToSlot(String(event.active.id), workerId, day, Number(hourStr));
  }

  const nowHour = now.getHours();
  const nowMinute = now.getMinutes();
  const showNowLine =
    view === 'day' &&
    sameDay(cursor, now) &&
    nowHour >= HOURS[0] &&
    nowHour <= HOURS[HOURS.length - 1];
  const nowLeftPct = showNowLine
    ? ((nowHour * 60 + nowMinute - RANGE_START_MIN) / RANGE_SPAN_MIN)
    : null;

  const monthCells = useMemo(() => {
    if (view !== 'month') return [];
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const start = addDays(first, -((first.getDay() + 6) % 7));
    return Array.from({ length: 42 }, (_, i) => addDays(start, i));
  }, [view, cursor]);

  const rangeLabel =
    view === 'month'
      ? cursor.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
      : view === 'week' && days[0] && days[6]
        ? `${formatDayLabel(days[0])} – ${formatDayLabel(days[6])}`
        : formatDayLabel(cursor, true);

  return (
    <AppShell
      title="Planning"
      actions={
        <Button type="button" onClick={() => setCreateOpen(true)}>
          <Plus size={16} />
          Créer une intervention
        </Button>
      }
    >
      <Toast message={toast} onClose={() => setToast(null)} />
      <Modal open={createOpen} title="Nouvelle intervention" onClose={() => setCreateOpen(false)} size="xl">
        {createOpen ? (
          <QuickCreateWorkOrder
            onCreated={() => {
              setCreateOpen(false);
              void load();
            }}
          />
        ) : null}
      </Modal>
      {error ? <div className="error-box" style={{ marginBottom: 12 }}>{error}</div> : null}

      <div className="plan-workspace">
        <div className="plan-toolbar">
          <div className="plan-toolbar-left">
            <Button variant="secondary" size="sm" onClick={() => setCursor(startOfDay(new Date()))}>
              Aujourd’hui
            </Button>
            <div className="plan-nav">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Précédent"
                onClick={() =>
                  setCursor((d) =>
                    addDays(d, view === 'month' ? -30 : view === 'week' ? -7 : -1),
                  )
                }
              >
                <ChevronLeft size={18} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Suivant"
                onClick={() =>
                  setCursor((d) =>
                    addDays(d, view === 'month' ? 30 : view === 'week' ? 7 : 1),
                  )
                }
              >
                <ChevronRight size={18} />
              </Button>
            </div>
            <div className="plan-range">
              <CalendarDays size={16} />
              <span>{rangeLabel}</span>
            </div>
          </div>
          <div className="plan-status-filters" role="toolbar" aria-label="Filtrer par statut">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                className={`plan-status-filter tone-${f.tone} ${statusFilter === f.key ? 'active' : ''}`}
                aria-pressed={statusFilter === f.key}
                onClick={() => selectStatusFilter(f.key)}
              >
                <i className={`swatch tone-${f.tone}`} />
                {f.label}
              </button>
            ))}
          </div>
          <div className="plan-view-toggle" role="tablist">
            {(['day', 'week', 'month'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                role="tab"
                aria-selected={view === mode}
                className={`plan-view-btn ${view === mode ? 'active' : ''}`}
                onClick={() => setView(mode)}
              >
                {mode === 'day' ? 'Jour' : mode === 'week' ? 'Semaine' : 'Mois'}
              </button>
            ))}
          </div>
        </div>

        <div className="plan-extra-filters">
          <input
            className="input"
            placeholder="Recherche"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Recherche"
          />
          <SearchSelect
            compact
            value={statusFilter === 'ALL' ? '' : statusFilter}
            selectedLabel={
              statusFilter === 'LATE'
                ? 'Retard'
                : STATUS_FILTER_OPTIONS.find((s) => s.value === statusFilter)?.label
            }
            placeholder="Statut"
            staticOptions={[{ value: 'LATE', label: 'Retard' }, ...STATUS_FILTER_OPTIONS]}
            loadOptions={async () => STATUS_FILTER_OPTIONS}
            onChange={(id) => setStatusFilter((id || 'ALL') as StatusFilter)}
            allowClear
          />
          <SearchSelect
            compact
            value={groupId}
            selectedLabel={groupLabel}
            placeholder="Groupe"
            loadOptions={searchGroups}
            onChange={(id, opt) => {
              setGroupId(id);
              setGroupLabel(opt?.label ?? '');
              setWorkerId('');
              setWorkerLabel('');
            }}
            allowClear
          />
          <SearchSelect
            compact
            value={workerId}
            selectedLabel={workerLabel}
            placeholder="Technicien"
            loadOptions={(query) => searchWorkers(query, groupId || undefined)}
            onChange={(id, opt) => {
              setWorkerId(id);
              setWorkerLabel(opt?.label ?? '');
            }}
            allowClear
          />
          <SearchSelect
            compact
            value={team}
            selectedLabel={TEAM_FILTER_OPTIONS.find((o) => o.value === team)?.label}
            placeholder="Équipe"
            staticOptions={TEAM_FILTER_OPTIONS}
            loadOptions={async () => TEAM_FILTER_OPTIONS}
            onChange={(id) => setTeam(id)}
            allowClear
          />
          <SearchSelect
            compact
            value={companyId}
            selectedLabel={companyLabel}
            placeholder="Entreprise"
            loadOptions={searchCustomers}
            onChange={(id, opt) => {
              setCompanyId(id);
              setCompanyLabel(opt?.label ?? '');
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
            loadOptions={(query) => searchSites(query, companyId || undefined)}
            onChange={(id, opt) => {
              setSiteId(id);
              setSiteLabel(opt?.label ?? '');
            }}
            allowClear
          />
          <SearchSelect
            compact
            value={city}
            selectedLabel={city}
            placeholder="Ville"
            staticOptions={cityOptions}
            loadOptions={async () => cityOptions}
            onChange={(id) => setCity(id)}
            allowClear
          />
          <SearchSelect
            compact
            value={typeId}
            selectedLabel={typeLabel}
            placeholder="Catégorie"
            loadOptions={searchWorkOrderTypes}
            onChange={(id, opt) => {
              setTypeId(id);
              setTypeLabel(opt?.label ?? '');
            }}
            allowClear
          />
          <SearchSelect
            compact
            value={priority}
            selectedLabel={PRIORITY_FILTER_OPTIONS.find((o) => o.value === priority)?.label}
            placeholder="Priorité"
            staticOptions={PRIORITY_FILTER_OPTIONS}
            loadOptions={async () => PRIORITY_FILTER_OPTIONS}
            onChange={(id) => setPriority(id)}
            allowClear
          />
        </div>

        <div className="plan-stats">
          <div className="plan-stat">
            <span className="plan-stat-icon" aria-hidden>
              <Inbox size={16} />
            </span>
            <div className="plan-stat-body">
              <strong>{unplanned.length}</strong>
              <span>À planifier</span>
            </div>
          </div>
          <div className={`plan-stat ${lateOrders.length ? 'is-alert' : ''}`}>
            <span className="plan-stat-icon" aria-hidden>
              <AlertTriangle size={16} />
            </span>
            <div className="plan-stat-body">
              <strong>{lateOrders.length}</strong>
              <span>En retard</span>
            </div>
          </div>
          <div className="plan-stat">
            <span className="plan-stat-icon" aria-hidden>
              <Clock3 size={16} />
            </span>
            <div className="plan-stat-body">
              <strong>{todayCount}</strong>
              <span>Aujourd’hui</span>
            </div>
          </div>
          <div className="plan-stat">
            <span className="plan-stat-icon" aria-hidden>
              <Users size={16} />
            </span>
            <div className="plan-stat-body">
              <strong>{boardWorkers.length}</strong>
              <span>Techniciens</span>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="plan-layout">
            <PageLoading height={520} />
            <PageLoading height={520} />
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={pointerWithin}
            onDragStart={onDragStart}
            onDragEnd={(e) => void onDragEnd(e)}
          >
            <div className="plan-layout">
              <UnplannedDrop count={unplanned.length}>
                {unplanned.length ? (
                  unplanned.map((order) => (
                    <DraggableCard
                      key={order.id}
                      order={order}
                      onOpen={() => void openDetail(order)}
                    />
                  ))
                ) : (
                  <EmptyState title="File vide" description="Rien en attente d’affectation." />
                )}
              </UnplannedDrop>

              {view === 'month' ? (
                <div className="plan-month">
                  <div className="plan-month-head">
                    {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((d) => (
                      <div key={d}>{d}</div>
                    ))}
                  </div>
                  <div className="plan-month-grid">
                    {monthCells.map((day) => {
                      const dayOrders = visibleOrders.filter(
                        (o) =>
                          o.scheduledStart &&
                          sameDay(new Date(o.scheduledStart), day) &&
                          matchesStatusFilter(o, statusFilter, now),
                      );
                      const lateCount = dayOrders.filter((o) => isLate(o, now)).length;
                      const isToday = sameDay(day, now);
                      return (
                        <div
                          key={day.toISOString()}
                          className={`plan-month-day ${day.getMonth() !== cursor.getMonth() ? 'is-muted' : ''} ${isToday ? 'is-today' : ''}`}
                        >
                          <div className="plan-month-day-top">
                            <span>{day.getDate()}</span>
                            {lateCount ? <span className="plan-late-dot">{lateCount}</span> : null}
                          </div>
                          <div className="plan-month-events">
                            {dayOrders.slice(0, 3).map((o) => (
                              <button
                                key={o.id}
                                type="button"
                                className={`plan-month-chip tone-${toneClass(o)}`}
                                onClick={() => void openDetail(o)}
                              >
                                {o.number}
                              </button>
                            ))}
                            {dayOrders.length > 3 ? (
                              <div className="muted" style={{ fontSize: '0.72rem' }}>
                                +{dayOrders.length - 3}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="plan-board">
                  {days.map((day) => (
                    <section key={day.toISOString()} className="plan-day-section">
                      <div
                        className="plan-grid"
                        style={{ ['--slots' as string]: String(HOURS.length) }}
                      >
                        <div className="plan-grid-head">
                          <div className={`plan-tech-cell plan-tech-head ${sameDay(day, now) ? 'is-today' : ''}`}>
                            {view === 'week' ? formatDayLabel(day) : 'Technicien'}
                          </div>
                          <div className="plan-head-times">
                            {HOURS.map((h) => (
                              <div
                                key={h}
                                className={`plan-time-head ${showNowLine && h === nowHour ? 'is-now' : ''}`}
                              >
                                {String(h).padStart(2, '0')}h
                              </div>
                            ))}
                          </div>
                        </div>

                        {boardWorkers.length ? (
                          boardWorkers.map((worker) => {
                            const dayBlocks = visibleOrders.filter(
                              (o) =>
                                o.assignedToId === worker.id &&
                                o.scheduledStart &&
                                sameDay(new Date(o.scheduledStart), day) &&
                                o.status !== 'CANCELLED' &&
                                matchesStatusFilter(o, statusFilter, now),
                            );
                            // Hors drag : uniquement les lignes avec interventions ce jour-là
                            if (!activeId && dayBlocks.length === 0) return null;
                            const load = dayBlocks.length;
                            const workerLate = dayBlocks.some((o) => isLate(o, now));
                            return (
                              <div
                                key={`${day.toISOString()}-${worker.id}`}
                                className="plan-grid-row"
                              >
                                <div className={`plan-tech-cell ${workerLate ? 'has-late' : ''}`}>
                                  <div className="plan-tech-avatar">
                                    {initials(worker.firstName, worker.lastName)}
                                  </div>
                                  <div className="plan-tech-meta">
                                    <div className="plan-tech-name">
                                      {worker.firstName} {worker.lastName}
                                    </div>
                                    <div className="plan-tech-load">
                                      {load} mission{load > 1 ? 's' : ''}
                                    </div>
                                  </div>
                                </div>
                                <div className="plan-row-track">
                                  <div className="plan-row-slots">
                                    {HOURS.map((hour) => {
                                      const slotId = `slot:${worker.id}:${dayKey(day)}:${hour}`;
                                      return (
                                        <DropSlot
                                          key={slotId}
                                          id={slotId}
                                          isNowHour={
                                            showNowLine && sameDay(day, now) && hour === nowHour
                                          }
                                        />
                                      );
                                    })}
                                  </div>
                                  <div className="plan-row-events">
                                    {dayBlocks.map((block) => {
                                      const geo = blockGeometry(block);
                                      if (!geo) return null;
                                      return (
                                        <DraggableCard
                                          key={block.id}
                                          order={block}
                                          compact
                                          style={geo}
                                          onOpen={() => void openDetail(block)}
                                        />
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="plan-empty-board">
                            <EmptyState
                              title="Aucune intervention planifiée"
                              description="Créez une intervention, ou affectez-en une depuis la file."
                              action={
                                <Button type="button" onClick={() => setCreateOpen(true)}>
                                  Créer une intervention
                                </Button>
                              }
                            />
                          </div>
                        )}

                        {nowLeftPct != null ? (
                          <div
                            className="plan-now-line"
                            style={{
                              left: `calc(168px + (100% - 168px) * ${nowLeftPct})`,
                            }}
                          >
                            <span>
                              {now.toLocaleTimeString('fr-FR', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        ) : null}
                      </div>
                    </section>
                  ))}

                </div>
              )}
            </div>

            <DragOverlay dropAnimation={{ duration: 180, easing: 'ease' }}>
              {activeOrder ? (
                <div
                  className={`plan-drag-ghost tone-${toneClass(activeOrder)}`}
                  style={{
                    width: Math.min(
                      420,
                      Math.max(90, (durationMs(activeOrder) / 60_000 / 60) * 90),
                    ),
                  }}
                >
                  <strong>{activeOrder.number}</strong>
                  <span>{activeOrder.customer?.name ?? activeOrder.title}</span>
                  <small>
                    {formatDuration(durationMs(activeOrder))}
                    {activeOrder.scheduledStart
                      ? ` · ${formatTime(activeOrder.scheduledStart)}–${formatTime(activeOrder.scheduledEnd)}`
                      : ''}
                  </small>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>

      <Drawer
        open={!!selected}
        title={selected ? selected.number : ''}
        onClose={() => setSelected(null)}
      >
        {selected ? (
          <div className="plan-drawer">
            {isLate(selected, now) ? (
              <div className="plan-late-banner">
                <AlertTriangle size={16} />
                Intervention en retard
              </div>
            ) : null}

            <section className="plan-drawer-hero">
              <div className="plan-drawer-hero-top">
                <StatusBadge status={selected.status} />
                <span className={`plan-priority p-${(selected.priority ?? 'NORMAL').toLowerCase()}`}>
                  {priorityLabel(selected.priority)}
                </span>
              </div>
              <h3>{selected.title}</h3>
              {selected.description ? <p>{selected.description}</p> : null}
              <div className="plan-drawer-chips">
                {selected.type ? (
                  <span>
                    <Tag size={13} />
                    {selected.type.name}
                  </span>
                ) : null}
                <span>
                  <Clock3 size={13} />
                  {formatDuration(durationMs(selected))}
                </span>
              </div>
            </section>

            {detailLoading ? <PageLoading height={80} /> : null}

            <section className="plan-drawer-card">
              <div className="plan-drawer-card-title">
                <Building2 size={16} />
                Client
              </div>
              <div className="plan-drawer-client">
                <Avatar name={selected.customer?.name ?? '?'} />
                <div>
                  <strong>{selected.customer?.name ?? ''}</strong>
                  <div className="muted">
                    {selected.customer?.type === 'INDIVIDUAL' ? 'Particulier' : 'Entreprise'}
                  </div>
                </div>
              </div>
              <div className="plan-drawer-grid">
                {selected.customer?.phone ? (
                  <a className="plan-drawer-link" href={`tel:${selected.customer.phone}`}>
                    <Phone size={14} />
                    {selected.customer.phone}
                  </a>
                ) : null}
                {selected.customer?.email ? (
                  <a className="plan-drawer-link" href={`mailto:${selected.customer.email}`}>
                    <Mail size={14} />
                    {selected.customer.email}
                  </a>
                ) : null}
                {selected.customer?.address ? (
                  <div className="plan-drawer-line">
                    <MapPin size={14} />
                    {selected.customer.address}
                  </div>
                ) : null}
              </div>
              {selected.customer?.notes ? (
                <div className="plan-drawer-note">
                  <StickyNote size={14} />
                  {selected.customer.notes}
                </div>
              ) : null}
            </section>

            <section className="plan-drawer-card">
              <div className="plan-drawer-card-title">
                <MapPin size={16} />
                Site d’intervention
              </div>
              <strong>{selected.site?.name ?? ''}</strong>
              <div className="plan-drawer-line">
                {selected.site
                  ? `${selected.site.address}${selected.site.city ? `, ${selected.site.city}` : ''}`
                  : ''}
              </div>
              {(selected.site?.contactName || selected.site?.contactPhone) && (
                <div className="plan-drawer-grid">
                  {selected.site?.contactName ? (
                    <div className="plan-drawer-line">
                      <UserRound size={14} />
                      {selected.site.contactName}
                    </div>
                  ) : null}
                  {selected.site?.contactPhone ? (
                    <a className="plan-drawer-link" href={`tel:${selected.site.contactPhone}`}>
                      <Phone size={14} />
                      {selected.site.contactPhone}
                    </a>
                  ) : null}
                </div>
              )}
              {selected.site?.accessInstructions ? (
                <div className="plan-drawer-note">
                  Accès : {selected.site.accessInstructions}
                </div>
              ) : null}
            </section>

            <section className="plan-drawer-card">
              <div className="plan-drawer-card-title">
                <CalendarDays size={16} />
                Planning
              </div>
              <div className="plan-drawer-schedule">
                <div>
                  <div className="muted">Début</div>
                  <div>
                    {selected.scheduledStart
                      ? new Date(selected.scheduledStart).toLocaleString('fr-FR')
                      : 'Non planifiée'}
                  </div>
                </div>
                <div>
                  <div className="muted">Fin</div>
                  <div>
                    {selected.scheduledEnd
                      ? new Date(selected.scheduledEnd).toLocaleString('fr-FR')
                      : ''}
                  </div>
                </div>
              </div>
              <div className="plan-drawer-client" style={{ marginTop: 12 }}>
                {selected.assignedTo ? (
                  <>
                    <Avatar
                      name={`${selected.assignedTo.firstName} ${selected.assignedTo.lastName}`}
                    />
                    <div>
                      <strong>
                        {selected.assignedTo.firstName} {selected.assignedTo.lastName}
                      </strong>
                      <div className="muted">
                        Technicien
                        {transportLabel(selected)}
                      </div>
                      {selected.assignedTo.phone ? (
                        <a className="plan-drawer-link" href={`tel:${selected.assignedTo.phone}`}>
                          <Phone size={14} />
                          {selected.assignedTo.phone}
                        </a>
                      ) : null}
                    </div>
                  </>
                ) : (
                  <div className="muted">Aucun technicien assigné</div>
                )}
              </div>
            </section>

            <section className="plan-drawer-card">
              <div className="plan-drawer-card-title">
                <Wrench size={16} />
                Outils & pièces
              </div>
              {selected.partsUsed?.length ? (
                <ul className="plan-drawer-parts">
                  {selected.partsUsed.map((usage) => (
                    <li key={usage.id}>
                      <Package size={14} />
                      <div>
                        <strong>{usage.part.name}</strong>
                        <div className="muted">
                          {usage.part.sku} · {usage.quantity} {usage.part.unit}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted" style={{ margin: 0 }}>
                  Aucune pièce consommée pour le moment.
                </p>
              )}
            </section>

            {selected.checklist?.length ? (
              <section className="plan-drawer-card">
                <div className="plan-drawer-card-title">
                  <CheckCircle2 size={16} />
                  Checklist
                  <span className="plan-drawer-count">
                    {selected.checklist.filter((c) => c.done).length}/{selected.checklist.length}
                  </span>
                </div>
                <ul className="plan-drawer-check">
                  {selected.checklist.map((item) => (
                    <li key={item.id} className={item.done ? 'done' : ''}>
                      {item.done ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                      {item.label}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {selected.notes?.length ? (
              <section className="plan-drawer-card">
                <div className="plan-drawer-card-title">
                  <StickyNote size={16} />
                  Notes terrain
                </div>
                <div className="plan-drawer-notes">
                  {selected.notes.map((n) => (
                    <article key={n.id}>
                      <div className="muted" style={{ fontSize: '0.75rem' }}>
                        {new Date(n.createdAt).toLocaleString('fr-FR')}
                      </div>
                      <p>{n.body}</p>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}

            {selected.signature ? (
              <section className="plan-drawer-card success-box">
                Signé par {selected.signature.signerName}
                {selected.signature.signedAt
                  ? ` · ${new Date(selected.signature.signedAt).toLocaleString('fr-FR')}`
                  : ''}
              </section>
            ) : null}
          </div>
        ) : null}
      </Drawer>
    </AppShell>
  );
}
