'use client';

import { FormEvent, ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import {
  Building2,
  CalendarDays,
  ClipboardList,
  Hash,
  MapPin,
  Package,
  StickyNote,
  Truck,
  User,
  Wrench,
  type LucideIcon,
  Check,
} from 'lucide-react';
import { DatePicker } from '@/components/DatePicker';
import { SearchSelect, type SearchOption } from '@/components/SearchSelect';
import { Button } from '@/components/ui';
import { api } from '@/lib/api';
import {
  fetchAvailability,
  searchCustomers,
  searchParts,
  searchSites,
  searchWorkers,
  searchWorkOrderTypes,
  type AvailabilityResult,
  type AvailabilitySlot,
  type WorkOrderTypeOption,
} from '@/lib/search';

const KINDS = [
  { id: 'INSTALLATION', label: 'Installation', text: 'Poser un équipement et l’identifier chez le client.' },
  { id: 'REPAIR', label: 'Réparation', text: 'Dépanner un équipement déjà identifié sur le site.' },
  { id: 'REPLACEMENT', label: 'Changement', text: 'Remplacer un équipement. Le déroulé est celui d’une réparation.' },
] as const;

const RECAP_ICONS: Record<string, { icon: LucideIcon; color: string }> = {
  Intervention: { icon: ClipboardList, color: 'var(--primary)' },
  Client: { icon: Building2, color: 'var(--info)' },
  Site: { icon: MapPin, color: 'var(--warning)' },
  Équipement: { icon: Wrench, color: 'var(--success)' },
  'Nouveau n°': { icon: Hash, color: 'var(--primary)' },
  Pièces: { icon: Package, color: 'var(--warning)' },
  Motif: { icon: StickyNote, color: 'var(--info)' },
  Constat: { icon: StickyNote, color: 'var(--info)' },
  Technicien: { icon: User, color: 'var(--primary)' },
  Transporteur: { icon: Truck, color: 'var(--status-enroute)' },
  Créneau: { icon: CalendarDays, color: 'var(--info)' },
  Note: { icon: StickyNote, color: 'var(--warning)' },
};

type Kind = (typeof KINDS)[number]['id'];

type Crew = { id: string; name: string };
type Spare = { partId: string; label: string; quantity: number };
type StepId = 'type' | 'customer' | 'site' | 'equipment' | 'crew' | 'transport' | 'slot';

function overlaps(start: string, end: string, busy: AvailabilityResult['busy']) {
  const a = new Date(start).getTime();
  const b = new Date(end).getTime();
  if (Number.isNaN(a) || Number.isNaN(b) || b <= a) return [];
  return busy.filter((item) => {
    const from = new Date(item.start).getTime();
    const to = new Date(item.end).getTime();
    return a < to && b > from;
  });
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function toLocalInput(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function dayKey(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function clockRange(start: string, end: string) {
  const a = new Date(start);
  const b = new Date(end);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return '';
  const fmt = (d: Date) =>
    d.toLocaleString('fr-FR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  return `${fmt(a)} – ${b.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
}

export function QuickCreateWorkOrder({
  onCreated,
}: {
  onCreated?: () => void;
}) {
  const [openId, setOpenId] = useState<StepId>('type');
  const [panel, setPanel] = useState<string | null>(null);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [draftBusy, setDraftBusy] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  const [kind, setKind] = useState<Kind | ''>('');
  const [typeId, setTypeId] = useState('');
  const [typeLabel, setTypeLabel] = useState('');
  const [duration, setDuration] = useState(60);
  const [needsTransport, setNeedsTransport] = useState(false);
  const [customerId, setCustomerId] = useState('');
  const [customerLabel, setCustomerLabel] = useState('');
  const [customerDetail, setCustomerDetail] = useState('');
  const [siteId, setSiteId] = useState('');
  const [siteLabel, setSiteLabel] = useState('');
  const [siteDetail, setSiteDetail] = useState('');
  const [partId, setPartId] = useState('');
  const [partLabel, setPartLabel] = useState('');
  const [partDetail, setPartDetail] = useState('');
  const [serial, setSerial] = useState('');
  const [unitId, setUnitId] = useState('');
  const [unitLabel, setUnitLabel] = useState('');
  const [unitDetail, setUnitDetail] = useState('');
  const [units, setUnits] = useState<SearchOption[]>([]);
  const [unitsLoaded, setUnitsLoaded] = useState(false);
  const [spares, setSpares] = useState<Spare[]>([]);
  const [sparePartId, setSparePartId] = useState('');
  const [sparePartLabel, setSparePartLabel] = useState('');
  const [spareQty, setSpareQty] = useState(1);
  const [equipSummary, setEquipSummary] = useState('');
  const [createdOrderId, setCreatedOrderId] = useState('');
  const [groups, setGroups] = useState<Crew[]>([]);
  const [fieldGroupId, setFieldGroupId] = useState('');
  const [fieldGroupLabel, setFieldGroupLabel] = useState('');
  const [workerId, setWorkerId] = useState('');
  const [workerLabel, setWorkerLabel] = useState('');
  const [workerDetail, setWorkerDetail] = useState('');
  const [crewSkipped, setCrewSkipped] = useState(false);
  const [transportGroupId, setTransportGroupId] = useState('');
  const [transportGroupLabel, setTransportGroupLabel] = useState('');
  const [transporterId, setTransporterId] = useState('');
  const [transporterLabel, setTransporterLabel] = useState('');
  const [transportSkipped, setTransportSkipped] = useState(false);
  const [planDate, setPlanDate] = useState(() => dayKey(new Date()));
  const [planStart, setPlanStart] = useState('');
  const [planEnd, setPlanEnd] = useState('');
  const [availability, setAvailability] = useState<AvailabilityResult | null>(null);
  const [transportAvailability, setTransportAvailability] = useState<AvailabilityResult | null>(null);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState(false);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reloadGroups = useCallback(async () => {
    const list = await api<Crew[]>('/groups');
    setGroups(list);
    return list;
  }, []);

  useEffect(() => {
    void reloadGroups().catch(() => undefined);
  }, [reloadGroups]);

  const groupOptions = groups.map((group) => ({ value: group.id, label: group.name }));

  const loadSlots = useCallback(async () => {
    if (!planDate || (!workerId && !transporterId)) {
      setAvailability(null);
      setTransportAvailability(null);
      setSlotsError(false);
      return;
    }
    setSlotsLoading(true);
    try {
      const [tech, transport] = await Promise.all([
        workerId
          ? fetchAvailability({ workerId, date: planDate, durationMinutes: duration })
          : Promise.resolve(null),
        transporterId
          ? fetchAvailability({ workerId: transporterId, date: planDate, durationMinutes: duration })
          : Promise.resolve(null),
      ]);
      setAvailability(tech);
      setTransportAvailability(transport);
      setSlotsError(false);
    } catch {
      setAvailability(null);
      setTransportAvailability(null);
      setSlotsError(true);
    } finally {
      setSlotsLoading(false);
    }
  }, [workerId, transporterId, planDate, duration]);

  useEffect(() => {
    void loadSlots();
  }, [loadSlots]);

  useEffect(() => {
    if (!siteId) {
      setUnits([]);
      setUnitsLoaded(false);
      return;
    }
    let cancelled = false;
    setUnitsLoaded(false);
    void api<{ id: string; serialNumber: string; part: { name: string; sku: string } }[]>(
      `/inventory/installed?siteId=${siteId}&status=INSTALLED`,
    )
      .then((rows) => {
        if (cancelled) return;
        setUnits(
          rows.map((row) => ({
            value: row.id,
            label: row.part.name,
            meta: `n° ${row.serialNumber} · ${row.part.sku}`,
            detail: [`N° ${row.serialNumber}`, `Réf. ${row.part.sku}`].join('\n'),
          })),
        );
        setUnitsLoaded(true);
      })
      .catch(() => {
        if (cancelled) return;
        setUnits([]);
        setUnitsLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [siteId]);

  function go(id: StepId) {
    setOpenId(id);
    setPanel(null);
    setDraftError(null);
  }

  function applySlot(slot: AvailabilitySlot) {
    setPlanStart(toLocalInput(new Date(slot.start)));
    setPlanEnd(toLocalInput(new Date(slot.end)));
  }

  function clearEquipment() {
    setPartId('');
    setPartLabel('');
    setPartDetail('');
    setSerial('');
    setUnitId('');
    setUnitLabel('');
    setUnitDetail('');
    setSpares([]);
    setEquipSummary('');
  }

  function chooseKind(next: Kind) {
    if (next !== kind) {
      setTypeId('');
      setTypeLabel('');
      clearEquipment();
    }
    setKind(next);
  }

  const equipmentReady =
    kind === 'INSTALLATION'
      ? !!partId && serial.trim().length > 0
      : kind === 'REPLACEMENT'
        ? !!unitId && !!partId && serial.trim().length > 0
        : kind === 'REPAIR'
          ? !!unitId
          : false;

  const equipmentSummary =
    kind === 'INSTALLATION'
      ? partLabel
        ? `${partLabel}${serial.trim() ? ` · n° ${serial.trim()}` : ''}`
        : ''
      : kind === 'REPLACEMENT'
        ? unitLabel
          ? `${unitLabel} → ${partLabel || 'nouvel appareil'}`
          : ''
        : unitLabel
          ? `${unitLabel}${unitDetail ? ` · ${unitDetail.split('\n')[0]}` : ''}`
          : '';

  async function createCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!kind) return;
    const form = new FormData(event.currentTarget);
    const name = String(form.get('name') || '').trim();
    const minutes = Number(form.get('defaultDuration') || 60);
    setDraftBusy(true);
    setDraftError(null);
    try {
      const created = await api<{ id: string; name: string; defaultDuration?: number | null }>('/work-order-types', {
        method: 'POST',
        body: JSON.stringify({
          name,
          description: String(form.get('description') || '').trim() || undefined,
          defaultDuration: minutes,
          kind,
        }),
      });
      setTypeId(created.id);
      setTypeLabel(created.name);
      setDuration(minutes > 0 ? minutes : 60);
      setPanel(null);
      go('customer');
    } catch (err) {
      setDraftError(err instanceof Error ? err.message : 'Création impossible');
    } finally {
      setDraftBusy(false);
    }
  }

  function toggleTransport(on: boolean) {
    setNeedsTransport(on);
    setTransportSkipped(false);
    if (!on) {
      setTransportGroupId('');
      setTransportGroupLabel('');
      setTransporterId('');
      setTransporterLabel('');
    }
  }

  async function createCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get('name') || '').trim();
    setDraftBusy(true);
    setDraftError(null);
    try {
      const created = await api<{ id: string; name: string }>('/customers', {
        method: 'POST',
        body: JSON.stringify({
          type: String(form.get('type') || 'COMPANY'),
          name,
          phone: String(form.get('phone') || '').trim() || undefined,
          email: String(form.get('email') || '').trim() || undefined,
        }),
      });
      setCustomerId(created.id);
      setCustomerLabel(created.name);
      setCustomerDetail(
        [String(form.get('phone') || '').trim(), String(form.get('email') || '').trim()].filter(Boolean).join('\n'),
      );
      setSiteId('');
      setSiteLabel('');
      setSiteDetail('');
      setPanel(null);
      go('site');
    } catch (err) {
      setDraftError(err instanceof Error ? err.message : 'Création impossible');
    } finally {
      setDraftBusy(false);
    }
  }

  async function createSite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!customerId) {
      setDraftError('Créez d’abord le client.');
      go('customer');
      setPanel('customer');
      return;
    }
    const form = new FormData(event.currentTarget);
    setDraftBusy(true);
    setDraftError(null);
    try {
      const address = String(form.get('address') || '').trim();
      const city = String(form.get('city') || '').trim();
      const created = await api<{ id: string; name: string }>('/sites', {
        method: 'POST',
        body: JSON.stringify({
          customerId,
          name: String(form.get('name') || '').trim() || 'Site principal',
          address,
          city: city || undefined,
        }),
      });
      setSiteId(created.id);
      setSiteLabel(created.name);
      setSiteDetail([address, city].filter(Boolean).join(', '));
      setUnitId('');
      setUnitLabel('');
      setUnitDetail('');
      setPanel(null);
      go('equipment');
    } catch (err) {
      setDraftError(err instanceof Error ? err.message : 'Création impossible');
    } finally {
      setDraftBusy(false);
    }
  }

  async function createGroup(event: FormEvent<HTMLFormElement>, kind: 'field' | 'transport') {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get('name') || '').trim();
    setDraftBusy(true);
    setDraftError(null);
    try {
      const created = await api<Crew>('/groups', {
        method: 'POST',
        body: JSON.stringify({ name }),
      });
      await reloadGroups();
      if (kind === 'field') {
        setFieldGroupId(created.id);
        setFieldGroupLabel(created.name);
        setWorkerId('');
        setWorkerLabel('');
        setWorkerDetail('');
        setPanel('worker');
      } else {
        setTransportGroupId(created.id);
        setTransportGroupLabel(created.name);
        setTransporterId('');
        setTransporterLabel('');
        setPanel('transporter');
      }
    } catch (err) {
      setDraftError(err instanceof Error ? err.message : 'Création impossible');
    } finally {
      setDraftBusy(false);
    }
  }

  async function createWorker(event: FormEvent<HTMLFormElement>, kind: 'field' | 'transport') {
    event.preventDefault();
    const groupId = kind === 'field' ? fieldGroupId : transportGroupId;
    if (!groupId) {
      setDraftError('Créez d’abord un groupe.');
      setPanel(kind === 'field' ? 'group' : 'transportGroup');
      return;
    }
    const form = new FormData(event.currentTarget);
    setDraftBusy(true);
    setDraftError(null);
    try {
      const created = await api<{
        id: string;
        firstName: string;
        lastName: string;
        temporaryPassword?: string;
      }>('/users', {
        method: 'POST',
        body: JSON.stringify({
          firstName: String(form.get('firstName') || '').trim(),
          lastName: String(form.get('lastName') || '').trim(),
          email: String(form.get('email') || '').trim(),
          phone: String(form.get('phone') || '').trim() || undefined,
          role: 'FIELD_WORKER',
          team: kind === 'transport' ? 'TRANSPORT' : 'FIELD',
          groupId,
        }),
      });
      const label = `${created.firstName} ${created.lastName}`;
      if (created.temporaryPassword) setTempPassword(created.temporaryPassword);
      const phone = String(form.get('phone') || '').trim();
      const groupName = kind === 'field' ? fieldGroupLabel : transportGroupLabel;
      if (kind === 'field') {
        setWorkerId(created.id);
        setWorkerLabel(label);
        setWorkerDetail([phone, groupName].filter(Boolean).join('\n'));
        setCrewSkipped(false);
        setPanel(null);
        go(needsTransport ? 'transport' : 'slot');
      } else {
        setTransporterId(created.id);
        setTransporterLabel(label);
        setPanel(null);
        go('slot');
      }
    } catch (err) {
      setDraftError(err instanceof Error ? err.message : 'Création impossible');
    } finally {
      setDraftBusy(false);
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (!kind || !typeId) {
        go('type');
        throw new Error('Choisissez le grand type, puis une catégorie.');
      }
      if (!customerId) {
        go('customer');
        throw new Error('Choisissez ou créez un client.');
      }
      if (!siteId) {
        go('site');
        throw new Error('Choisissez ou créez un site.');
      }
      if (!equipmentReady) {
        go('equipment');
        throw new Error(
          kind === 'INSTALLATION'
            ? 'Choisissez l’équipement à poser et son numéro de série.'
            : kind === 'REPLACEMENT'
              ? 'Choisissez l’appareil en place et le nouvel équipement.'
              : 'Choisissez l’équipement à dépanner.',
        );
      }
      const start = planStart ? new Date(planStart) : null;
      const end = planEnd ? new Date(planEnd) : null;
      if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        go('slot');
        throw new Error('Indiquez un créneau de début et de fin.');
      }
      if (end <= start) throw new Error('La fin doit être après le début.');
      const techConflicts = workerId && availability ? overlaps(planStart, planEnd, availability.busy) : [];
      const rideConflicts =
        transporterId && transportAvailability ? overlaps(planStart, planEnd, transportAvailability.busy) : [];
      if (techConflicts.length || rideConflicts.length) {
        go('slot');
        const hit = techConflicts[0] ?? rideConflicts[0];
        throw new Error(`Créneau indisponible : ${hit.number} est déjà planifiée à cette heure.`);
      }
      if (workerId && transporterId && workerId === transporterId) {
        throw new Error('Le technicien et le transporteur doivent être deux personnes.');
      }

      const title = note ? `${typeLabel}, ${note}` : typeLabel;

      let orderId = createdOrderId;
      if (!orderId) {
        const created = await api<{ id: string }>('/work-orders', {
          method: 'POST',
          body: JSON.stringify({
            title,
            description: note || undefined,
            customerId,
            siteId,
            typeId,
            kind,
            priority: 'NORMAL',
            scheduledStart: start.toISOString(),
            scheduledEnd: end.toISOString(),
            estimatedMinutes: duration,
            fieldWorkerId: workerId || undefined,
            fieldGroupId: workerId ? fieldGroupId : undefined,
            transporterId: needsTransport && transporterId ? transporterId : undefined,
            transportGroupId: needsTransport && transporterId ? transportGroupId : undefined,
          }),
        });
        orderId = created.id;
        setCreatedOrderId(orderId);
      }

      const summary = (equipSummary.trim() || typeLabel || 'Intervention sur équipement').slice(0, 400);
      if (kind === 'INSTALLATION') {
        await api(`/inventory/work-orders/${orderId}/install`, {
          method: 'POST',
          body: JSON.stringify({ partId, serialNumber: serial.trim() }),
        });
      } else {
        await api(`/inventory/work-orders/${orderId}/repair`, {
          method: 'POST',
          body: JSON.stringify({
            installedEquipmentId: unitId,
            summary: summary.length >= 3 ? summary : `${summary} sur site`,
            parts: spares.map((line) => ({ partId: line.partId, quantity: line.quantity })),
            ...(kind === 'REPLACEMENT'
              ? { replacement: { partId, serialNumber: serial.trim() } }
              : {}),
          }),
        });
      }
      onCreated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Création impossible');
    } finally {
      setLoading(false);
    }
  }

  const steps = useMemo(() => {
    const list: { id: StepId; title: string; done: boolean; summary: string }[] = [
      {
        id: 'type',
        title: 'Catégorie',
        done: !!typeId,
        summary: typeLabel
          ? `${KINDS.find((item) => item.id === kind)?.label ?? ''} · ${typeLabel}`
          : '',
      },
      { id: 'customer', title: 'Client', done: !!customerId, summary: customerLabel },
      { id: 'site', title: 'Site', done: !!siteId, summary: siteLabel },
      {
        id: 'equipment',
        title: 'Équipement',
        done: equipmentReady,
        summary: equipmentSummary,
      },
      {
        id: 'crew',
        title: 'Technicien',
        done: !!workerId || crewSkipped,
        summary: workerLabel || (crewSkipped ? 'Plus tard' : ''),
      },
    ];
    if (needsTransport) {
      list.push({
        id: 'transport',
        title: 'Transport',
        done: !!transporterId || transportSkipped,
        summary: transporterLabel || (transportSkipped ? 'Plus tard' : ''),
      });
    }
    list.push({
      id: 'slot',
      title: 'Créneau',
      done: !!planStart && !!planEnd,
      summary: planStart && planEnd ? clockRange(planStart, planEnd) : '',
    });
    return list;
  }, [
    kind,
    typeId,
    typeLabel,
    customerId,
    customerLabel,
    siteId,
    siteLabel,
    equipmentReady,
    equipmentSummary,
    needsTransport,
    workerId,
    workerLabel,
    crewSkipped,
    transportSkipped,
    transporterId,
    transporterLabel,
    planStart,
    planEnd,
  ]);

  const ready = steps.every((step) => step.done);
  const kindLabel = KINDS.find((item) => item.id === kind)?.label ?? '';
  const equipmentValue =
    kind === 'INSTALLATION'
      ? partLabel
      : kind === 'REPLACEMENT'
        ? unitLabel
          ? `${unitLabel} → ${partLabel || 'nouvel appareil'}`
          : ''
        : unitLabel;
  const equipmentDetail = [
    kind === 'REPAIR' || kind === 'REPLACEMENT' ? unitDetail : '',
    kind === 'INSTALLATION' || kind === 'REPLACEMENT' ? partDetail : '',
    (kind === 'INSTALLATION' || kind === 'REPLACEMENT') && serial.trim() ? `N° ${serial.trim()}` : '',
    equipSummary.trim() && kind !== 'INSTALLATION' ? equipSummary.trim() : '',
    spares.length ? spares.map((line) => `${line.label} × ${line.quantity}`).join(', ') : '',
  ]
    .filter(Boolean)
    .join('\n');
  const technicianDetail = workerId
    ? [workerDetail, fieldGroupLabel && !workerDetail.includes(fieldGroupLabel) ? fieldGroupLabel : '']
        .filter(Boolean)
        .join('\n')
    : '';

  const recap = [
    { label: 'Intervention', value: typeLabel ? `${kindLabel} · ${typeLabel}` : '', detail: '' },
    { label: 'Client', value: customerLabel, detail: customerDetail },
    { label: 'Site', value: siteLabel, detail: siteDetail },
    { label: 'Équipement', value: equipmentValue, detail: equipmentDetail },
    {
      label: 'Technicien',
      value: workerId ? workerLabel : crewSkipped ? 'Plus tard' : '',
      detail: technicianDetail,
    },
    ...(needsTransport
      ? [
          {
            label: 'Transporteur',
            value: transporterId ? transporterLabel : transportSkipped ? 'Plus tard' : '',
            detail: transporterId ? transportGroupLabel : '',
          },
        ]
      : []),
    {
      label: 'Créneau',
      value: planStart && planEnd ? `${clockRange(planStart, planEnd)} · ${duration} min` : '',
      detail: '',
    },
    ...(note.trim() ? [{ label: 'Note', value: note.trim(), detail: '' }] : []),
  ];
  const slotInvalid = !!planStart && !!planEnd && new Date(planEnd) <= new Date(planStart);
  const recapConflicts = [
    ...(workerId && availability ? overlaps(planStart, planEnd, availability.busy) : []),
    ...(transporterId && transportAvailability ? overlaps(planStart, planEnd, transportAvailability.busy) : []),
  ];

  return (
    <div className="wo-create">
      <div className="wo-create-main">
      <p className="wo-intro">
        Suivez les étapes. Le technicien et le transporteur se décident ici, pas dans la catégorie.
      </p>
      {tempPassword ? (
        <div className="error-box" style={{ borderColor: 'var(--success)' }}>
          Compte créé. Mot de passe temporaire : <strong>{tempPassword}</strong>
        </div>
      ) : null}

      <ol className="wo-timeline">
        {steps.map((step, index) => (
          <li
            key={step.id}
            className={`wo-step${openId === step.id ? ' is-open' : ''}${step.done ? ' is-done' : ''}`}
          >
            <div className="wo-rail" aria-hidden>
              <span className="wo-dot">{step.done ? <Check size={14} /> : index + 1}</span>
              {index < steps.length - 1 ? <span className="wo-line" /> : null}
            </div>
            <div className="wo-step-main">
              <button
                type="button"
                className="wo-step-head"
                onClick={() => (openId === step.id ? setOpenId(step.id) : go(step.id))}
                aria-expanded={openId === step.id}
              >
                <span>
                  <strong>{step.title}</strong>
                  {openId !== step.id && step.summary ? (
                    <span className="wo-step-summary">{step.summary}</span>
                  ) : null}
                </span>
                {openId !== step.id ? (
                  <span className="wo-step-edit">{step.done ? 'Modifier' : 'Compléter'}</span>
                ) : null}
              </button>

              {openId === step.id ? (
                <div className="wo-step-body">
                  {step.id === 'type' ? (
                    <>
                      <div className="row">
                        {KINDS.map((item) => (
                          <Button
                            key={item.id}
                            type="button"
                            variant={kind === item.id ? 'primary' : 'secondary'}
                            onClick={() => chooseKind(item.id)}
                          >
                            {item.label}
                          </Button>
                        ))}
                      </div>
                      {kind ? (
                        <>
                          <SearchSelect
                            key={kind}
                            label="Catégorie"
                            value={typeId}
                            selectedLabel={typeLabel}
                            placeholder="Rechercher une catégorie…"
                            loadOptions={(q) => searchWorkOrderTypes(q, kind)}
                            onChange={(id, opt) => {
                              const type = opt as WorkOrderTypeOption | null | undefined;
                              setTypeId(id);
                              setTypeLabel(type?.label ?? '');
                              setDuration(type?.defaultDuration && type.defaultDuration > 0 ? type.defaultDuration : 60);
                              if (id && type && !type.kind) {
                                void api(`/work-order-types/${id}`, {
                                  method: 'PATCH',
                                  body: JSON.stringify({ kind }),
                                }).catch(() => undefined);
                              }
                              if (id) go('customer');
                            }}
                            allowClear={false}
                          />
                          {panel === 'category' ? (
                            <InlineForm title="Nouvelle catégorie" busy={draftBusy} error={draftError} onSubmit={createCategory}>
                              <label className="field">
                                <span>Nom</span>
                                <input className="input" name="name" required placeholder="Pose d’un circuit, entretien…" />
                              </label>
                              <label className="field">
                                <span>Description</span>
                                <input className="input" name="description" />
                              </label>
                              <label className="field">
                                <span>Durée (min)</span>
                                <input className="input" name="defaultDuration" type="number" min={15} defaultValue={60} />
                              </label>
                            </InlineForm>
                          ) : (
                            <button type="button" className="wo-inline-link" onClick={() => setPanel('category')}>
                              Pas de catégorie dans {KINDS.find((item) => item.id === kind)?.label} ? Créez-la ici
                            </button>
                          )}
                        </>
                      ) : (
                        <p className="muted" style={{ margin: 0 }}>
                          Choisissez d’abord le grand type. Les catégories de ce type s’affichent ensuite.
                        </p>
                      )}
                    </>
                  ) : null}

                  {step.id === 'customer' ? (
                    <>
                      <SearchSelect
                        label="Client"
                        value={customerId}
                        selectedLabel={customerLabel}
                        placeholder="Rechercher un client…"
                        loadOptions={searchCustomers}
                        onChange={(id, opt) => {
                          setCustomerId(id);
                          setCustomerLabel(opt?.label ?? '');
                          setCustomerDetail(opt?.detail ?? '');
                          setSiteId('');
                          setSiteLabel('');
                          setSiteDetail('');
                          if (id) go('site');
                        }}
                        allowClear
                      />
                      {panel === 'customer' ? (
                        <InlineForm title="Nouveau client" busy={draftBusy} error={draftError} onSubmit={createCustomer}>
                          <label className="field">
                            <span>Type</span>
                            <select className="input" name="type" defaultValue="COMPANY">
                              <option value="COMPANY">Entreprise</option>
                              <option value="INDIVIDUAL">Particulier</option>
                            </select>
                          </label>
                          <label className="field">
                            <span>Nom</span>
                            <input className="input" name="name" required placeholder="ACME, Jean Dupont…" />
                          </label>
                          <label className="field">
                            <span>Téléphone</span>
                            <input className="input" name="phone" />
                          </label>
                          <label className="field">
                            <span>Email</span>
                            <input className="input" name="email" type="email" />
                          </label>
                        </InlineForm>
                      ) : (
                        <button type="button" className="wo-inline-link" onClick={() => setPanel('customer')}>
                          Pas de client ? Créez-le ici
                        </button>
                      )}
                    </>
                  ) : null}

                  {step.id === 'site' ? (
                    <>
                      {!customerId ? (
                        <button
                          type="button"
                          className="wo-inline-link"
                          onClick={() => {
                            go('customer');
                            setPanel('customer');
                          }}
                        >
                          Créez d’abord le client, à l’étape au-dessus
                        </button>
                      ) : (
                        <>
                          <SearchSelect
                            label="Site"
                            value={siteId}
                            selectedLabel={siteLabel}
                            placeholder="Rechercher un site…"
                            loadOptions={(q) => searchSites(q, customerId)}
                            onChange={(id, opt) => {
                              setSiteId(id);
                              setSiteLabel(opt?.label ?? '');
                              setSiteDetail(opt?.detail ?? '');
                              setUnitId('');
                              setUnitLabel('');
                              setUnitDetail('');
                              if (id) go('equipment');
                            }}
                            allowClear
                          />
                          {panel === 'site' ? (
                            <InlineForm title="Nouveau site" busy={draftBusy} error={draftError} onSubmit={createSite}>
                              <label className="field">
                                <span>Nom</span>
                                <input className="input" name="name" placeholder="Siège, agence…" />
                              </label>
                              <label className="field">
                                <span>Adresse</span>
                                <input className="input" name="address" required placeholder="Adresse complète" />
                              </label>
                              <label className="field">
                                <span>Ville</span>
                                <input className="input" name="city" />
                              </label>
                            </InlineForm>
                          ) : (
                            <button type="button" className="wo-inline-link" onClick={() => setPanel('site')}>
                              Pas de site ? Créez-le ici
                            </button>
                          )}
                        </>
                      )}
                    </>
                  ) : null}

                  {step.id === 'equipment' ? (
                    <>
                      {!siteId ? (
                        <p className="plan-alert">Choisissez d’abord un site.</p>
                      ) : kind === 'INSTALLATION' ? (
                        <>
                          <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>
                            L’appareil sort du stock et sera identifié chez le client.
                          </p>
                          <SearchSelect
                            label="Équipement en stock"
                            value={partId}
                            selectedLabel={partLabel}
                            placeholder="Rechercher un équipement…"
                            loadOptions={searchParts}
                            onChange={(id, opt) => {
                              setPartId(id);
                              setPartLabel(opt?.label ?? '');
                              setPartDetail(opt?.detail ?? '');
                            }}
                            allowClear={false}
                          />
                          <label className="field">
                            <span>Numéro de série</span>
                            <input
                              className="input"
                              value={serial}
                              onChange={(e) => setSerial(e.target.value)}
                              placeholder="N° gravé ou étiquette"
                              required
                            />
                          </label>
                        </>
                      ) : (
                        <>
                          <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>
                            {kind === 'REPLACEMENT'
                              ? 'Choisissez l’appareil en place, puis celui qui le remplace.'
                              : 'Choisissez l’appareil déjà identifié sur ce site.'}
                          </p>
                          {unitsLoaded && !units.length ? (
                            <p className="plan-alert">
                              Aucun équipement identifié sur ce site. Une installation doit d’abord le poser.
                            </p>
                          ) : (
                            <SearchSelect
                              label="Équipement du site"
                              value={unitId}
                              selectedLabel={unitLabel}
                              placeholder={units.length ? 'Choisir l’appareil…' : 'Chargement…'}
                              staticOptions={units}
                              loadOptions={async (query) => {
                                const needle = query.trim().toLowerCase();
                                return units.filter((unit) =>
                                  `${unit.label} ${unit.meta ?? ''}`.toLowerCase().includes(needle),
                                );
                              }}
                              onChange={(id, opt) => {
                                setUnitId(id);
                                setUnitLabel(opt?.label ?? '');
                                setUnitDetail(opt?.detail ?? '');
                              }}
                              disabled={!units.length}
                              allowClear={false}
                            />
                          )}
                          <label className="field">
                            <span>{kind === 'REPLACEMENT' ? 'Motif du changement' : 'Constat'}</span>
                            <input
                              className="input"
                              value={equipSummary}
                              onChange={(e) => setEquipSummary(e.target.value)}
                              placeholder="Fuite, panne carte, filtre…"
                            />
                          </label>
                          {kind === 'REPLACEMENT' ? (
                            <>
                              <SearchSelect
                                label="Nouvel équipement"
                                value={partId}
                                selectedLabel={partLabel}
                                placeholder="Rechercher dans le stock…"
                                loadOptions={searchParts}
                                onChange={(id, opt) => {
                                  setPartId(id);
                                  setPartLabel(opt?.label ?? '');
                                  setPartDetail(opt?.detail ?? '');
                                }}
                                allowClear={false}
                              />
                              <label className="field">
                                <span>Nouveau numéro de série</span>
                                <input
                                  className="input"
                                  value={serial}
                                  onChange={(e) => setSerial(e.target.value)}
                                  placeholder="N° du nouvel appareil"
                                  required
                                />
                              </label>
                            </>
                          ) : null}
                          <SearchSelect
                            label="Pièce utilisée (optionnel)"
                            value={sparePartId}
                            selectedLabel={sparePartLabel}
                            placeholder="Filtre, fluide, sonde…"
                            loadOptions={searchParts}
                            onChange={(id, opt) => {
                              setSparePartId(id);
                              setSparePartLabel(opt?.label ?? '');
                            }}
                            allowClear
                          />
                          {sparePartId ? (
                            <div className="row">
                              <label className="field" style={{ width: 120 }}>
                                <span>Quantité</span>
                                <input
                                  className="input"
                                  type="number"
                                  min={1}
                                  value={spareQty}
                                  onChange={(e) => setSpareQty(Math.max(1, Number(e.target.value) || 1))}
                                />
                              </label>
                              <Button
                                type="button"
                                variant="secondary"
                                onClick={() => {
                                  setSpares((prev) => {
                                    const existing = prev.find((line) => line.partId === sparePartId);
                                    if (existing) {
                                      return prev.map((line) =>
                                        line.partId === sparePartId
                                          ? { ...line, quantity: line.quantity + spareQty }
                                          : line,
                                      );
                                    }
                                    return [...prev, { partId: sparePartId, label: sparePartLabel, quantity: spareQty }];
                                  });
                                  setSparePartId('');
                                  setSparePartLabel('');
                                  setSpareQty(1);
                                }}
                              >
                                Ajouter la pièce
                              </Button>
                            </div>
                          ) : null}
                          {spares.length ? (
                            <ul className="wo-spare-list">
                              {spares.map((line) => (
                                <li key={line.partId}>
                                  <span>
                                    {line.label} · {line.quantity}
                                  </span>
                                  <button
                                    type="button"
                                    className="wo-inline-link"
                                    onClick={() => setSpares((prev) => prev.filter((item) => item.partId !== line.partId))}
                                  >
                                    Retirer
                                  </button>
                                </li>
                              ))}
                            </ul>
                          ) : null}
                        </>
                      )}
                      <Button
                        type="button"
                        disabled={!equipmentReady}
                        onClick={() => go('crew')}
                      >
                        Continuer
                      </Button>
                    </>
                  ) : null}

                  {step.id === 'crew' ? (
                    <>
                      <SearchSelect
                        label="Groupe"
                        value={fieldGroupId}
                        selectedLabel={fieldGroupLabel}
                        placeholder={groups.length ? 'Choisir un groupe…' : 'Aucun groupe pour le moment'}
                        staticOptions={groupOptions}
                        loadOptions={async () => groupOptions}
                        onChange={(id, opt) => {
                          setFieldGroupId(id);
                          setFieldGroupLabel(opt?.label ?? '');
                          setWorkerId('');
                          setWorkerLabel('');
                          setWorkerDetail('');
                        }}
                        allowClear
                      />
                      {panel === 'group' ? (
                        <InlineForm
                          title="Nouveau groupe"
                          busy={draftBusy}
                          error={draftError}
                          onSubmit={(event) => createGroup(event, 'field')}
                        >
                          <label className="field">
                            <span>Nom</span>
                            <input className="input" name="name" required placeholder="Équipe nord" />
                          </label>
                        </InlineForm>
                      ) : (
                        <button type="button" className="wo-inline-link" onClick={() => setPanel('group')}>
                          Pas de groupe ? Créez-le ici
                        </button>
                      )}
                      <SearchSelect
                        label="Technicien (optionnel)"
                        value={workerId}
                        selectedLabel={workerLabel}
                        placeholder={fieldGroupId ? 'Techniciens du groupe…' : 'Choisissez ou créez un groupe'}
                        disabled={!fieldGroupId}
                        loadOptions={(q) => (fieldGroupId ? searchWorkers(q, fieldGroupId) : Promise.resolve([]))}
                        onChange={(id, opt) => {
                          setWorkerId(id);
                          setWorkerLabel(opt?.label ?? '');
                          setWorkerDetail(opt?.detail ?? '');
                          setCrewSkipped(false);
                          setPlanStart('');
                          setPlanEnd('');
                          if (id) go(needsTransport ? 'transport' : 'slot');
                        }}
                        allowClear
                      />
                      {panel === 'worker' ? (
                        <InlineForm
                          title="Nouveau technicien"
                          busy={draftBusy}
                          error={draftError}
                          onSubmit={(event) => createWorker(event, 'field')}
                        >
                          <WorkerFields />
                        </InlineForm>
                      ) : (
                        <button
                          type="button"
                          className="wo-inline-link"
                          onClick={() => {
                            if (!fieldGroupId) setPanel('group');
                            else setPanel('worker');
                          }}
                        >
                          Pas de technicien ? Créez-le ici
                        </button>
                      )}
                      <label className="wo-check">
                        <input
                          type="checkbox"
                          checked={needsTransport}
                          onChange={(e) => toggleTransport(e.target.checked)}
                        />
                        <span>Avec un transporteur</span>
                      </label>
                      {!workerId ? (
                        <button
                          type="button"
                          className="wo-inline-link"
                          onClick={() => {
                            setCrewSkipped(true);
                            go(needsTransport ? 'transport' : 'slot');
                          }}
                        >
                          Affecter le technicien plus tard
                        </button>
                      ) : null}
                    </>
                  ) : null}

                  {step.id === 'transport' ? (
                    <>
                      <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>
                        Optionnel. Un transporteur peut livrer le matériel plus tard.
                      </p>
                      <SearchSelect
                        label="Groupe transport"
                        value={transportGroupId}
                        selectedLabel={transportGroupLabel}
                        placeholder={groups.length ? 'Choisir un groupe…' : 'Aucun groupe pour le moment'}
                        staticOptions={groupOptions}
                        loadOptions={async () => groupOptions}
                        onChange={(id, opt) => {
                          setTransportGroupId(id);
                          setTransportGroupLabel(opt?.label ?? '');
                          setTransporterId('');
                          setTransporterLabel('');
                        }}
                        allowClear
                      />
                      {panel === 'transportGroup' ? (
                        <InlineForm
                          title="Nouveau groupe"
                          busy={draftBusy}
                          error={draftError}
                          onSubmit={(event) => createGroup(event, 'transport')}
                        >
                          <label className="field">
                            <span>Nom</span>
                            <input className="input" name="name" required placeholder="Transport" />
                          </label>
                        </InlineForm>
                      ) : (
                        <button type="button" className="wo-inline-link" onClick={() => setPanel('transportGroup')}>
                          Pas de groupe ? Créez-le ici
                        </button>
                      )}
                      <SearchSelect
                        label="Transporteur"
                        value={transporterId}
                        selectedLabel={transporterLabel}
                        placeholder={transportGroupId ? 'Transporteurs du groupe…' : 'Choisissez ou créez un groupe'}
                        disabled={!transportGroupId}
                        loadOptions={(q) =>
                          transportGroupId ? searchWorkers(q, transportGroupId) : Promise.resolve([])
                        }
                        onChange={(id, opt) => {
                          setTransporterId(id);
                          setTransporterLabel(opt?.label ?? '');
                          if (id) {
                            setTransportSkipped(false);
                            go('slot');
                          }
                        }}
                        allowClear
                      />
                      {panel === 'transporter' ? (
                        <InlineForm
                          title="Nouveau transporteur"
                          busy={draftBusy}
                          error={draftError}
                          onSubmit={(event) => createWorker(event, 'transport')}
                        >
                          <WorkerFields />
                        </InlineForm>
                      ) : (
                        <button
                          type="button"
                          className="wo-inline-link"
                          onClick={() => {
                            if (!transportGroupId) setPanel('transportGroup');
                            else setPanel('transporter');
                          }}
                        >
                          Pas de transporteur ? Créez-le ici
                        </button>
                      )}
                      {!transporterId ? (
                        <button
                          type="button"
                          className="wo-inline-link"
                          onClick={() => {
                            setTransportSkipped(true);
                            setTransporterId('');
                            setTransporterLabel('');
                            go('slot');
                          }}
                        >
                          Ajouter le transport plus tard
                        </button>
                      ) : null}
                    </>
                  ) : null}

                  {step.id === 'slot' ? (
                    <>
                      <div className="plan-drawer-schedule">
                        <DatePicker
                          label="Jour"
                          mode="date"
                          value={planDate}
                          onChange={(next) => {
                            setPlanDate(next);
                            setPlanStart('');
                            setPlanEnd('');
                          }}
                          required
                          allowClear={false}
                        />
                        <label className="field">
                          <span>Durée (min)</span>
                          <input
                            className="input"
                            type="number"
                            min={15}
                            value={duration}
                            onChange={(e) => {
                              const next = Number(e.target.value) || 60;
                              setDuration(next);
                              if (planStart) {
                                const s = new Date(planStart);
                                if (!Number.isNaN(s.getTime())) {
                                  setPlanEnd(toLocalInput(new Date(s.getTime() + next * 60_000)));
                                }
                              }
                            }}
                          />
                        </label>
                      </div>
                      {!workerId ? (
                        <p className="plan-alert">
                          Choisissez un technicien pour afficher ses disponibilités.
                        </p>
                      ) : slotsError ? (
                        <p className="plan-alert">Les disponibilités n’ont pas pu être chargées.</p>
                      ) : slotsLoading || !availability ? (
                        <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>
                          Calcul des disponibilités…
                        </p>
                      ) : (
                        <AvailabilityBlock
                          title="Technicien"
                          result={availability}
                          planStart={planStart}
                          planEnd={planEnd}
                          onPick={applySlot}
                        />
                      )}
                      {transporterId && transportAvailability ? (
                        <AvailabilityBlock
                          title="Transporteur"
                          result={transportAvailability}
                          planStart={planStart}
                          planEnd={planEnd}
                          onPick={applySlot}
                        />
                      ) : null}
                      <div className="plan-drawer-schedule">
                        <DatePicker
                          label="Début"
                          mode="datetime"
                          value={planStart}
                          onChange={(next) => {
                            setPlanStart(next);
                            const s = new Date(next);
                            if (!Number.isNaN(s.getTime())) {
                              setPlanEnd(toLocalInput(new Date(s.getTime() + duration * 60_000)));
                              setPlanDate(dayKey(s));
                            }
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
                      {planStart && planEnd && new Date(planEnd) <= new Date(planStart) ? (
                        <p className="plan-alert">La fin doit être après le début.</p>
                      ) : null}
                      <label className="field">
                        <span>Note</span>
                        <input
                          className="input"
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                          placeholder="Ex. panne clim, accès par la cour…"
                        />
                      </label>
                    </>
                  ) : null}
                </div>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
      {error ? <div className="error-box">{error}</div> : null}
      <form className="wo-create-actions" onSubmit={onSubmit}>
        <Button type="submit" loading={loading} disabled={!ready || slotInvalid || recapConflicts.length > 0}>
          Créer l’intervention
        </Button>
      </form>
      </div>

      <aside className="wo-recap" aria-label="Récapitulatif">
        <h3>Récapitulatif</h3>
        <dl>
          {recap.map((row) => {
            const mark = RECAP_ICONS[row.label];
            const Icon = mark?.icon;
            return (
              <div key={row.label}>
                {Icon ? (
                  <span className="wo-recap-icon" style={{ color: mark.color }}>
                    <Icon size={13} strokeWidth={2.25} />
                  </span>
                ) : null}
                <div>
                  <dt>{row.label}</dt>
                  <dd className={row.value ? '' : 'is-empty'}>{row.value || '—'}</dd>
                  {row.detail ? <p className="wo-recap-extra">{row.detail}</p> : null}
                </div>
              </div>
            );
          })}
        </dl>
        {slotInvalid ? <p className="plan-alert">La fin doit être après le début.</p> : null}
        {recapConflicts.map((item) => (
          <p key={`${item.number}-${item.start}`} className="plan-alert">
            Créneau indisponible : chevauche {item.number} · {item.title}
          </p>
        ))}
      </aside>
    </div>
  );
}

function slotLabel(slot: AvailabilitySlot) {
  const fmt = (value: string) =>
    new Date(value).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  return `${fmt(slot.start)}–${fmt(slot.end)}`;
}

function AvailabilityBlock({
  title,
  result,
  planStart,
  planEnd,
  onPick,
}: {
  title: string;
  result: AvailabilityResult | null;
  planStart: string;
  planEnd: string;
  onPick: (slot: AvailabilitySlot) => void;
}) {
  const conflicts = result && planStart && planEnd ? overlaps(planStart, planEnd, result.busy) : [];
  return (
    <div>
      <div className="muted" style={{ marginBottom: 8, fontSize: '0.85rem' }}>
        {title}
        {result ? ` · ${result.slots.length} libre${result.slots.length > 1 ? 's' : ''}` : ''}
      </div>
      {result?.slots.length ? (
        <div className="plan-slots">
          {result.slots.slice(0, 8).map((slot) => {
            const active =
              planStart === toLocalInput(new Date(slot.start)) &&
              planEnd === toLocalInput(new Date(slot.end));
            return (
              <button
                key={`${title}-${slot.start}`}
                type="button"
                className={active ? 'is-active' : ''}
                onClick={() => onPick(slot)}
              >
                {slotLabel(slot)}
              </button>
            );
          })}
        </div>
      ) : (
        <p className="plan-alert">Aucun créneau libre ce jour. Choisissez une autre date.</p>
      )}
      {conflicts.map((item) => (
        <p key={`${item.number}-${item.start}`} className="plan-alert">
          Chevauche {item.number} · {slotLabel(item)} · {item.title}
        </p>
      ))}
      {result?.busy.length ? (
        <ul className="plan-busy-list">
          {result.busy.map((item) => (
            <li key={`${item.number}-${item.start}`}>
              Déjà pris · {item.number} · {slotLabel(item)} · {item.title}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function WorkerFields() {
  return (
    <>
      <div className="row">
        <label className="field" style={{ flex: 1 }}>
          <span>Prénom</span>
          <input className="input" name="firstName" required />
        </label>
        <label className="field" style={{ flex: 1 }}>
          <span>Nom</span>
          <input className="input" name="lastName" required />
        </label>
      </div>
      <label className="field">
        <span>Email</span>
        <input className="input" name="email" type="email" required />
      </label>
      <label className="field">
        <span>Téléphone</span>
        <input className="input" name="phone" />
      </label>
    </>
  );
}

function InlineForm({
  title,
  busy,
  error,
  onSubmit,
  children,
}: {
  title: string;
  busy: boolean;
  error: string | null;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  children: ReactNode;
}) {
  return (
    <form className="wo-inline" onSubmit={onSubmit}>
      <strong>{title}</strong>
      {children}
      {error ? <div className="error-box">{error}</div> : null}
      <Button type="submit" loading={busy}>
        Enregistrer ici
      </Button>
    </form>
  );
}
