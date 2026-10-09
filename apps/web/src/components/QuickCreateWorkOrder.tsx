'use client';

import { FormEvent, ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { Check } from 'lucide-react';
import { DatePicker } from '@/components/DatePicker';
import { SearchSelect } from '@/components/SearchSelect';
import { Button } from '@/components/ui';
import { api } from '@/lib/api';
import {
  fetchAvailability,
  searchCustomers,
  searchSites,
  searchWorkers,
  searchWorkOrderTypes,
  type AvailabilitySlot,
  type WorkOrderTypeOption,
} from '@/lib/search';

type Crew = { id: string; name: string };
type StepId = 'type' | 'customer' | 'site' | 'crew' | 'transport' | 'slot';

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

  const [typeId, setTypeId] = useState('');
  const [typeLabel, setTypeLabel] = useState('');
  const [duration, setDuration] = useState(60);
  const [needsTransport, setNeedsTransport] = useState(false);
  const [customerId, setCustomerId] = useState('');
  const [customerLabel, setCustomerLabel] = useState('');
  const [siteId, setSiteId] = useState('');
  const [siteLabel, setSiteLabel] = useState('');
  const [groups, setGroups] = useState<Crew[]>([]);
  const [fieldGroupId, setFieldGroupId] = useState('');
  const [fieldGroupLabel, setFieldGroupLabel] = useState('');
  const [workerId, setWorkerId] = useState('');
  const [workerLabel, setWorkerLabel] = useState('');
  const [crewSkipped, setCrewSkipped] = useState(false);
  const [transportGroupId, setTransportGroupId] = useState('');
  const [transportGroupLabel, setTransportGroupLabel] = useState('');
  const [transporterId, setTransporterId] = useState('');
  const [transporterLabel, setTransporterLabel] = useState('');
  const [transportSkipped, setTransportSkipped] = useState(false);
  const [planDate, setPlanDate] = useState(() => dayKey(new Date()));
  const [planStart, setPlanStart] = useState('');
  const [planEnd, setPlanEnd] = useState('');
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [busyCount, setBusyCount] = useState(0);
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
    if (!workerId || !planDate) {
      setSlots([]);
      setBusyCount(0);
      return;
    }
    try {
      const res = await fetchAvailability({
        workerId,
        date: planDate,
        durationMinutes: duration,
      });
      setSlots(res.slots);
      setBusyCount(res.busy.length);
    } catch {
      setSlots([]);
      setBusyCount(0);
    }
  }, [workerId, planDate, duration]);

  useEffect(() => {
    void loadSlots();
  }, [loadSlots]);

  function go(id: StepId) {
    setOpenId(id);
    setPanel(null);
    setDraftError(null);
  }

  function applySlot(slot: AvailabilitySlot) {
    setPlanStart(toLocalInput(new Date(slot.start)));
    setPlanEnd(toLocalInput(new Date(slot.end)));
  }

  async function createCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get('name') || '').trim();
    const minutes = Number(form.get('defaultDuration') || 60);
    const transport = form.get('requiresTransport') === 'on';
    setDraftBusy(true);
    setDraftError(null);
    try {
      const created = await api<{ id: string; name: string }>('/work-order-types', {
        method: 'POST',
        body: JSON.stringify({
          name,
          defaultDuration: minutes,
          requiresTransport: transport,
        }),
      });
      setTypeId(created.id);
      setTypeLabel(created.name);
      setDuration(minutes > 0 ? minutes : 60);
      setNeedsTransport(transport);
      setPanel(null);
      go('customer');
    } catch (err) {
      setDraftError(err instanceof Error ? err.message : 'Création impossible');
    } finally {
      setDraftBusy(false);
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
      setSiteId('');
      setSiteLabel('');
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
      const created = await api<{ id: string; name: string }>('/sites', {
        method: 'POST',
        body: JSON.stringify({
          customerId,
          name: String(form.get('name') || '').trim() || 'Site principal',
          address: String(form.get('address') || '').trim(),
          city: String(form.get('city') || '').trim() || undefined,
        }),
      });
      setSiteId(created.id);
      setSiteLabel(created.name);
      setPanel(null);
      go('crew');
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
      if (kind === 'field') {
        setWorkerId(created.id);
        setWorkerLabel(label);
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
      if (!typeId) {
        go('type');
        throw new Error('Choisissez ou créez une catégorie.');
      }
      if (!customerId) {
        go('customer');
        throw new Error('Choisissez ou créez un client.');
      }
      if (!siteId) {
        go('site');
        throw new Error('Choisissez ou créez un site.');
      }
      const start = planStart ? new Date(planStart) : null;
      const end = planEnd ? new Date(planEnd) : null;
      if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        go('slot');
        throw new Error('Indiquez un créneau de début et de fin.');
      }
      if (end <= start) throw new Error('La fin doit être après le début.');
      if (workerId && transporterId && workerId === transporterId) {
        throw new Error('Le technicien et le transporteur doivent être deux personnes.');
      }

      const title = typeLabel
        ? `${typeLabel}${note ? `, ${note}` : ''}`
        : note || 'Intervention';

      await api('/work-orders', {
        method: 'POST',
        body: JSON.stringify({
          title,
          description: note || undefined,
          customerId,
          siteId,
          typeId,
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
      onCreated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Création impossible');
    } finally {
      setLoading(false);
    }
  }

  const steps = useMemo(() => {
    const list: { id: StepId; title: string; done: boolean; summary: string }[] = [
      { id: 'type', title: 'Catégorie', done: !!typeId, summary: typeLabel },
      { id: 'customer', title: 'Client', done: !!customerId, summary: customerLabel },
      { id: 'site', title: 'Site', done: !!siteId, summary: siteLabel },
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
    typeId,
    typeLabel,
    customerId,
    customerLabel,
    siteId,
    siteLabel,
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

  return (
    <div className="wo-create">
      <p className="wo-intro">
        Suivez les étapes. S’il manque une catégorie, un client, un site ou un technicien, créez-le ici sans quitter cette fenêtre.
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
                      <SearchSelect
                        label="Catégorie"
                        value={typeId}
                        selectedLabel={typeLabel}
                        placeholder="Rechercher une catégorie…"
                        loadOptions={searchWorkOrderTypes}
                        onChange={(id, opt) => {
                          const type = opt as WorkOrderTypeOption | null | undefined;
                          setTypeId(id);
                          setTypeLabel(type?.label ?? '');
                          setDuration(type?.defaultDuration && type.defaultDuration > 0 ? type.defaultDuration : 60);
                          const transport = Boolean(type?.requiresTransport);
                          setNeedsTransport(transport);
                          setTransportSkipped(false);
                          if (!transport) {
                            setTransportGroupId('');
                            setTransportGroupLabel('');
                            setTransporterId('');
                            setTransporterLabel('');
                          }
                          setPlanStart('');
                          setPlanEnd('');
                          if (id) go('customer');
                        }}
                        allowClear={false}
                      />
                      {panel === 'category' ? (
                        <InlineForm title="Nouvelle catégorie" busy={draftBusy} error={draftError} onSubmit={createCategory}>
                          <label className="field">
                            <span>Nom</span>
                            <input className="input" name="name" required placeholder="Dépannage, entretien…" />
                          </label>
                          <label className="field">
                            <span>Durée (min)</span>
                            <input className="input" name="defaultDuration" type="number" min={15} defaultValue={60} />
                          </label>
                          <label className="wo-check">
                            <input type="checkbox" name="requiresTransport" />
                            <span>Technicien et transporteur</span>
                          </label>
                        </InlineForm>
                      ) : (
                        <button type="button" className="wo-inline-link" onClick={() => setPanel('category')}>
                          Pas de catégorie ? Créez-la ici
                        </button>
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
                          setSiteId('');
                          setSiteLabel('');
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
                              if (id) go('crew');
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
                      {!workerId ? (
                        <button
                          type="button"
                          className="wo-inline-link"
                          onClick={() => {
                            setCrewSkipped(true);
                            go(needsTransport ? 'transport' : 'slot');
                          }}
                        >
                          Affecter plus tard
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
                      {workerId ? (
                        <div>
                          <div className="muted" style={{ marginBottom: 8, fontSize: '0.85rem' }}>
                            Créneaux libres{busyCount ? ` · ${busyCount} déjà pris` : ''}
                          </div>
                          {slots.length ? (
                            <div className="plan-slots">
                              {slots.slice(0, 8).map((slot) => {
                                const label = `${new Date(slot.start).toLocaleTimeString('fr-FR', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}–${new Date(slot.end).toLocaleTimeString('fr-FR', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}`;
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
                                    {label}
                                  </button>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>
                              Aucun créneau libre ce jour (7h–19h). Choisissez une autre date, ou saisissez l’heure.
                            </p>
                          )}
                        </div>
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
      <form onSubmit={onSubmit}>
        <Button type="submit" loading={loading}>
          Créer l’intervention
        </Button>
      </form>
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
