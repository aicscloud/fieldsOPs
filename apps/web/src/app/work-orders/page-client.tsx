'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Building2,
  CalendarDays,
  CheckCircle2,
  Circle,
  Clock3,
  Mail,
  MapPin,
  Package,
  Phone,
  Plus,
  StickyNote,
  Tag,
  UserRound,
  Wrench,
} from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { DataTable } from '@/components/DataTable';
import { DatePicker } from '@/components/DatePicker';
import { QuickCreateWorkOrder } from '@/components/QuickCreateWorkOrder';
import { SearchSelect } from '@/components/SearchSelect';
import {
  Avatar,
  Button,
  Drawer,
  EmptyState,
  Modal,
  PageLoading,
  StatusBadge,
  Toast,
} from '@/components/ui';
import { api } from '@/lib/api';
import {
  PRIORITY_FILTER_OPTIONS,
  STATUS_FILTER_OPTIONS,
  TEAM_FILTER_OPTIONS,
  fetchAvailability,
  searchCustomers,
  searchGroups,
  searchSites,
  searchWorkers,
  searchWorkOrderTypes,
  type AvailabilityResult,
  type AvailabilitySlot,
} from '@/lib/search';

type WorkOrder = {
  id: string;
  number: string;
  title: string;
  status: string;
  priority?: string | null;
  description?: string | null;
  estimatedMinutes?: number | null;
  scheduledStart?: string | null;
  scheduledEnd?: string | null;
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
  assignedToId?: string | null;
  team?: string | null;
  parentId?: string | null;
  children?: {
    id: string;
    team?: string;
    assignedTo?: { id: string; firstName: string; lastName: string } | null;
  }[];
  partsUsed?: {
    id: string;
    quantity: number;
    part: { sku: string; name: string; unit: string };
  }[];
  notes?: {
    id: string;
    body: string;
    createdAt: string;
    author?: { firstName: string; lastName: string } | null;
  }[];
  checklist?: { id: string; label: string; done: boolean }[];
  signature?: { signerName: string; signedAt?: string } | null;
};

const DONE = new Set(['COMPLETED', 'CANCELLED', 'FAILED']);

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function toLocalInput(value?: string | Date | null) {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function dayKeyFromLocal(local: string) {
  return local.slice(0, 10);
}

function fromLocalInput(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function defaultStartLocal() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  return toLocalInput(d);
}

function durationMinutes(order?: WorkOrder | null) {
  if (order?.estimatedMinutes && order.estimatedMinutes > 0) return order.estimatedMinutes;
  if (order?.type?.defaultDuration && order.type.defaultDuration > 0) {
    return order.type.defaultDuration;
  }
  if (order?.scheduledStart && order.scheduledEnd) {
    const mins = Math.round(
      (new Date(order.scheduledEnd).getTime() - new Date(order.scheduledStart).getTime()) /
        60_000,
    );
    if (mins >= 15) return mins;
  }
  return 60;
}

function defaultEndLocal(startLocal: string, order?: WorkOrder | null) {
  const start = fromLocalInput(startLocal) ?? new Date();
  return toLocalInput(new Date(start.getTime() + durationMinutes(order) * 60_000));
}

function priorityLabel(p?: string | null) {
  if (p === 'URGENT') return 'Urgente';
  if (p === 'HIGH') return 'Haute';
  if (p === 'LOW') return 'Basse';
  return 'Normale';
}

function formatWhen(iso?: string | null) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDurationLabel(order: WorkOrder) {
  const mins = durationMinutes(order);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h} h ${m}` : `${h} h`;
}

function canSchedule(order: WorkOrder) {
  return !DONE.has(order.status);
}

function carrierOf(order: WorkOrder) {
  const person = order.children?.find((child) => child.assignedTo)?.assignedTo;
  return person ? `${person.firstName} ${person.lastName}` : '';
}

function formatSlot(slot: AvailabilitySlot) {
  return `${new Date(slot.start).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  })}–${new Date(slot.end).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

export default function WorkOrdersClient() {
  const params = useSearchParams();
  const router = useRouter();
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [q, setQ] = useState(params.get('q') ?? '');
  const [status, setStatus] = useState('');
  const [workerId, setWorkerId] = useState('');
  const [workerFilterLabel, setWorkerFilterLabel] = useState('');
  const [groupId, setGroupId] = useState('');
  const [groupLabel, setGroupLabel] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [companyLabel, setCompanyLabel] = useState('');
  const [siteId, setSiteId] = useState('');
  const [siteLabel, setSiteLabel] = useState('');
  const [typeId, setTypeId] = useState('');
  const [typeLabel, setTypeLabel] = useState('');
  const [priority, setPriority] = useState('');
  const [city, setCity] = useState('');
  const [team, setTeam] = useState('');
  const [groupByUser, setGroupByUser] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<WorkOrder | null>(null);
  const [planWorkerId, setPlanWorkerId] = useState('');
  const [planWorkerLabel, setPlanWorkerLabel] = useState('');
  const [planStart, setPlanStart] = useState('');
  const [planEnd, setPlanEnd] = useState('');
  const [availability, setAvailability] = useState<AvailabilityResult | null>(null);
  const [availLoading, setAvailLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const wo = await api<WorkOrder[]>('/work-orders');
      setOrders(wo);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void api<{ id: string; group?: { id: string } | null }[]>('/users')
      .then((users) => {
        const map: Record<string, string> = {};
        for (const user of users) {
          if (user.group?.id) map[user.id] = user.group.id;
        }
        setGroupByUser(map);
      })
      .catch(() => setGroupByUser({}));
  }, []);

  useEffect(() => {
    if (params.get('new') === '1') setCreateOpen(true);
  }, [params]);

  function closeCreate() {
    setCreateOpen(false);
    if (params.get('new') === '1') {
      const url = new URL(window.location.href);
      url.searchParams.delete('new');
      router.replace(`${url.pathname}${url.search}`);
    }
  }

  const cityOptions = useMemo(() => {
    const cities = new Set<string>();
    for (const order of orders) {
      if (order.site?.city) cities.add(order.site.city);
    }
    return [...cities]
      .sort((a, b) => a.localeCompare(b, 'fr'))
      .map((name) => ({ value: name, label: name }));
  }, [orders]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return orders.filter((o) => {
      if (o.parentId) return false;
      if (status && o.status !== status) return false;
      if (workerId && o.assignedToId !== workerId) return false;
      if (groupId && groupByUser[o.assignedToId ?? ''] !== groupId) return false;
      if (companyId && o.customer?.id !== companyId) return false;
      if (siteId && o.site?.id !== siteId) return false;
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
  }, [orders, status, workerId, groupId, companyId, siteId, typeId, priority, city, team, groupByUser, q]);

  function syncPlanForm(order: WorkOrder) {
    const start = order.scheduledStart
      ? toLocalInput(order.scheduledStart)
      : defaultStartLocal();
    const end = order.scheduledEnd
      ? toLocalInput(order.scheduledEnd)
      : defaultEndLocal(start, order);
    const wid = order.assignedToId ?? order.assignedTo?.id ?? '';
    setPlanWorkerId(wid);
    setPlanWorkerLabel(
      order.assignedTo
        ? `${order.assignedTo.firstName} ${order.assignedTo.lastName}`
        : '',
    );
    setPlanStart(start);
    setPlanEnd(end);
  }

  const refreshAvailability = useCallback(async () => {
    if (!planWorkerId || !planStart) {
      setAvailability(null);
      return;
    }
    const date = dayKeyFromLocal(planStart);
    if (!date) return;
    setAvailLoading(true);
    try {
      const res = await fetchAvailability({
        workerId: planWorkerId,
        date,
        durationMinutes: durationMinutes(selected),
        excludeWorkOrderId: selected?.id,
      });
      setAvailability(res);
    } catch {
      setAvailability(null);
    } finally {
      setAvailLoading(false);
    }
  }, [planWorkerId, planStart, selected]);

  useEffect(() => {
    void refreshAvailability();
  }, [refreshAvailability]);

  async function openDetail(order: WorkOrder) {
    setSelected(order);
    syncPlanForm(order);
    setDetailLoading(true);
    try {
      const full = await api<WorkOrder>(`/work-orders/${order.id}`);
      setSelected(full);
      syncPlanForm(full);
    } catch {
      /* garde la version liste */
    } finally {
      setDetailLoading(false);
    }
  }

  function applySlot(slot: AvailabilitySlot) {
    setPlanStart(toLocalInput(new Date(slot.start)));
    setPlanEnd(toLocalInput(new Date(slot.end)));
  }

  async function schedule(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selected) return;
    const start = fromLocalInput(planStart);
    const end = fromLocalInput(planEnd);
    if (!planWorkerId || !start || !end) {
      setToast('Technicien et créneau requis');
      return;
    }
    if (end <= start) {
      setToast('La fin doit être après le début');
      return;
    }
    setSaving(true);
    try {
      const updated = await api<WorkOrder>(`/work-orders/${selected.id}/assign`, {
        method: 'POST',
        body: JSON.stringify({
          fieldWorkerId: planWorkerId,
          scheduledStart: start.toISOString(),
          scheduledEnd: end.toISOString(),
        }),
      });
      setSelected(updated);
      syncPlanForm(updated);
      setOrders((prev) => prev.map((o) => (o.id === updated.id ? { ...o, ...updated } : o)));
      setToast('Planifiée, visible dans Planning');
      void refreshAvailability();
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Planification impossible');
      void refreshAvailability();
    } finally {
      setSaving(false);
    }
  }

  async function unassign() {
    if (!selected) return;
    setSaving(true);
    try {
      const updated = await api<WorkOrder>(`/work-orders/${selected.id}/unassign`, {
        method: 'POST',
      });
      setSelected(updated);
      syncPlanForm(updated);
      setOrders((prev) => prev.map((o) => (o.id === updated.id ? { ...o, ...updated } : o)));
      setToast('Retirée du planning');
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Impossible de retirer');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell
      title="Interventions"
      actions={
        <Button type="button" onClick={() => setCreateOpen(true)}>
          <Plus size={16} />
          Créer une intervention
        </Button>
      }
    >
      <Toast message={toast} onClose={() => setToast(null)} />
      {error ? <div className="error-box" style={{ marginBottom: 12 }}>{error}</div> : null}

      <Modal open={createOpen} title="Nouvelle intervention" onClose={closeCreate} size="xl">
        {createOpen ? (
          <QuickCreateWorkOrder
            onCreated={() => {
              closeCreate();
              void load();
            }}
          />
        ) : null}
      </Modal>

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
          value={status}
          selectedLabel={STATUS_FILTER_OPTIONS.find((s) => s.value === status)?.label}
          placeholder="Statut"
          staticOptions={STATUS_FILTER_OPTIONS}
          loadOptions={async () => STATUS_FILTER_OPTIONS}
          onChange={(v) => setStatus(v)}
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
            setWorkerFilterLabel('');
          }}
          allowClear
        />
        <SearchSelect
          compact
          value={workerId}
          selectedLabel={workerFilterLabel}
          placeholder="Technicien"
          loadOptions={(query) => searchWorkers(query, groupId || undefined)}
          onChange={(id, opt) => {
            setWorkerId(id);
            setWorkerFilterLabel(opt?.label ?? '');
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

      {loading ? (
        <PageLoading height={320} />
      ) : (
        <DataTable
          rows={filtered}
          rowKey={(o) => o.id}
          onRowClick={(order) => void openDetail(order)}
          defaultSortKey="number"
          defaultSortDir="desc"
          empty={
            <EmptyState
              title="Aucune intervention"
              description="Créez une intervention. Le client, le site et le technicien s’ajoutent dans la même fenêtre."
              action={
                <Button type="button" onClick={() => setCreateOpen(true)}>
                  Créer une intervention
                </Button>
              }
            />
          }
          columns={[
            {
              key: 'number',
              header: 'N°',
              sortValue: (o) => o.number,
              render: (o) => o.number,
            },
            {
              key: 'title',
              header: 'Intervention',
              sortValue: (o) => o.title,
              render: (o) => (
                <>
                  <div>{o.title}</div>
                  <div className="muted" style={{ fontSize: '0.85rem' }}>
                    {o.customer?.name} · {priorityLabel(o.priority)}
                  </div>
                </>
              ),
            },
            {
              key: 'site',
              header: 'Lieu',
              sortValue: (o) => o.site?.name ?? '',
              render: (o) =>
                o.site ? `${o.site.name}, ${o.site.address}` : '',
            },
            {
              key: 'scheduledStart',
              header: 'Planning',
              sortValue: (o) =>
                o.scheduledStart ? new Date(o.scheduledStart) : null,
              render: (o) =>
                o.scheduledStart ? (
                  <span>{formatWhen(o.scheduledStart)}</span>
                ) : (
                  <span className="muted">À planifier</span>
                ),
            },
            {
              key: 'status',
              header: 'Statut',
              sortValue: (o) => o.status,
              render: (o) => <StatusBadge status={o.status} />,
            },
            {
              key: 'technician',
              header: 'Technicien',
              sortValue: (o) =>
                o.assignedTo
                  ? `${o.assignedTo.firstName} ${o.assignedTo.lastName}`
                  : '',
              render: (o) => {
                const tech = o.assignedTo
                  ? `${o.assignedTo.firstName} ${o.assignedTo.lastName}`
                  : '';
                const carrier = o.children?.find((child) => child.assignedTo)?.assignedTo;
                if (!tech) return carrier ? `${carrier.firstName} ${carrier.lastName}` : '';
                if (!carrier) return tech;
                return (
                  <span>
                    {tech}
                    <span className="muted">
                      {' '}
                      · {carrier.firstName} {carrier.lastName}
                    </span>
                  </span>
                );
              },
            },
          ]}
        />
      )}

      <Drawer
        open={!!selected}
        title={selected ? selected.number : ''}
        onClose={() => setSelected(null)}
      >
        {selected ? (
          <div className="plan-drawer">
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
                  {formatDurationLabel(selected)}
                </span>
              </div>
            </section>

            {detailLoading ? <PageLoading height={80} /> : null}

            {canSchedule(selected) ? (
              <section className="plan-drawer-card">
                <div className="plan-drawer-card-title">
                  <CalendarDays size={16} />
                  {selected.assignedToId && selected.scheduledStart
                    ? 'Modifier la planification'
                    : 'Planifier'}
                </div>
                <p className="muted" style={{ margin: '0 0 10px', fontSize: '0.85rem' }}>
                  Créneaux calculés selon les interventions déjà affectées (7h–19h). Visible dans{' '}
                  <Link href="/planning">Planning</Link>.
                </p>
                <form className="form-stack" onSubmit={(e) => void schedule(e)}>
                  <SearchSelect
                    label="Technicien"
                    value={planWorkerId}
                    selectedLabel={planWorkerLabel}
                    placeholder="Rechercher un technicien…"
                    loadOptions={searchWorkers}
                    required
                    onChange={(id, opt) => {
                      setPlanWorkerId(id);
                      setPlanWorkerLabel(opt?.label ?? '');
                    }}
                  />

                  {planWorkerId ? (
                    <div>
                      <div className="muted" style={{ marginBottom: 8, fontSize: '0.85rem' }}>
                        {availLoading
                          ? 'Calcul des disponibilités…'
                          : availability
                            ? `Créneaux libres · ${availability.busy.length} déjà pris`
                            : 'Disponibilités'}
                      </div>
                      {availability?.slots?.length ? (
                        <div className="plan-slots">
                          {availability.slots.slice(0, 10).map((slot) => {
                            const active =
                              planStart === toLocalInput(new Date(slot.start)) &&
                              planEnd === toLocalInput(new Date(slot.end));
                            return (
                              <button
                                key={slot.start}
                                type="button"
                                className={active ? 'is-active' : ''}
                                onClick={() => applySlot(slot)}
                              >
                                {formatSlot(slot)}
                              </button>
                            );
                          })}
                        </div>
                      ) : !availLoading ? (
                        <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>
                          Aucun créneau libre ce jour.
                        </p>
                      ) : null}
                      {availability?.busy?.length ? (
                        <ul className="plan-busy-list" style={{ marginTop: 10 }}>
                          {availability.busy.map((b) => (
                            <li key={`${b.number}-${b.start}`}>
                              {b.number} · {formatSlot(b)} · {b.title}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="plan-drawer-schedule">
                    <DatePicker
                      label="Début"
                      mode="datetime"
                      value={planStart}
                      onChange={(next) => {
                        setPlanStart(next);
                        setPlanEnd(defaultEndLocal(next, selected));
                      }}
                      required
                      allowClear={false}
                    />
                    <DatePicker
                      label="Fin"
                      mode="datetime"
                      value={planEnd}
                      onChange={setPlanEnd}
                      required
                      allowClear={false}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <Button type="submit" disabled={saving}>
                      {selected.assignedToId && selected.scheduledStart
                        ? 'Mettre à jour'
                        : 'Planifier'}
                    </Button>
                    {selected.assignedToId || selected.scheduledStart ? (
                      <Button
                        type="button"
                        variant="ghost"
                        disabled={saving}
                        onClick={() => void unassign()}
                      >
                        Retirer du planning
                      </Button>
                    ) : null}
                  </div>
                </form>
              </section>
            ) : null}

            <div className="plan-drawer-grid-2">
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
                  Site
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
            </div>

            <section className="plan-drawer-card">
              <div className="plan-drawer-card-title">
                <CalendarDays size={16} />
                Créneau actuel
              </div>
              <div className="plan-drawer-schedule">
                <div>
                  <div className="muted">Début</div>
                  <div>{formatWhen(selected.scheduledStart)}</div>
                </div>
                <div>
                  <div className="muted">Fin</div>
                  <div>{formatWhen(selected.scheduledEnd)}</div>
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
                        {carrierOf(selected) ? ` · transport ${carrierOf(selected)}` : ''}
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

            <div className="plan-drawer-grid-2">
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
                    Aucune pièce consommée.
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
              ) : (
                <section className="plan-drawer-card">
                  <div className="plan-drawer-card-title">
                    <StickyNote size={16} />
                    Notes terrain
                  </div>
                  {selected.notes?.length ? (
                    <div className="plan-drawer-notes">
                      {selected.notes.map((n) => (
                        <article key={n.id}>
                          <div className="muted" style={{ fontSize: '0.75rem' }}>
                            {n.author
                              ? `${n.author.firstName} ${n.author.lastName} · `
                              : ''}
                            {new Date(n.createdAt).toLocaleString('fr-FR')}
                          </div>
                          <p>{n.body}</p>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <p className="muted" style={{ margin: 0 }}>Aucune note.</p>
                  )}
                </section>
              )}
            </div>

            {selected.checklist?.length && selected.notes?.length ? (
              <section className="plan-drawer-card">
                <div className="plan-drawer-card-title">
                  <StickyNote size={16} />
                  Notes terrain
                </div>
                <div className="plan-drawer-notes">
                  {selected.notes.map((n) => (
                    <article key={n.id}>
                      <div className="muted" style={{ fontSize: '0.75rem' }}>
                        {n.author
                          ? `${n.author.firstName} ${n.author.lastName} · `
                          : ''}
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
