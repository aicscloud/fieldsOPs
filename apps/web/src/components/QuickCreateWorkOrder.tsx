'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { DatePicker } from '@/components/DatePicker';
import { SearchSelect } from '@/components/SearchSelect';
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

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function toLocalInput(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function dayKey(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function QuickCreateWorkOrder({
  onCreated,
}: {
  onCreated?: () => void;
}) {
  const [typeId, setTypeId] = useState('');
  const [typeLabel, setTypeLabel] = useState('');
  const [duration, setDuration] = useState(60);
  const [needsTransport, setNeedsTransport] = useState(false);
  const [customerId, setCustomerId] = useState('');
  const [customerLabel, setCustomerLabel] = useState('');
  const [siteId, setSiteId] = useState('');
  const [siteLabel, setSiteLabel] = useState('');
  const [newCustomer, setNewCustomer] = useState('');
  const [newSiteName, setNewSiteName] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [groups, setGroups] = useState<Crew[]>([]);
  const [fieldGroupId, setFieldGroupId] = useState('');
  const [fieldGroupLabel, setFieldGroupLabel] = useState('');
  const [workerId, setWorkerId] = useState('');
  const [workerLabel, setWorkerLabel] = useState('');
  const [transportGroupId, setTransportGroupId] = useState('');
  const [transportGroupLabel, setTransportGroupLabel] = useState('');
  const [transporterId, setTransporterId] = useState('');
  const [transporterLabel, setTransporterLabel] = useState('');
  const [planDate, setPlanDate] = useState(() => dayKey(new Date()));
  const [planStart, setPlanStart] = useState('');
  const [planEnd, setPlanEnd] = useState('');
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [busyCount, setBusyCount] = useState(0);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void api<Crew[]>('/groups')
      .then(setGroups)
      .catch(() => undefined);
  }, []);

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
      if (!planStart && res.slots[0]) {
        setPlanStart(toLocalInput(new Date(res.slots[0].start)));
        setPlanEnd(toLocalInput(new Date(res.slots[0].end)));
      }
    } catch {
      setSlots([]);
      setBusyCount(0);
    }
  }, [workerId, planDate, duration, planStart]);

  useEffect(() => {
    void loadSlots();
  }, [loadSlots]);

  function applySlot(slot: AvailabilitySlot) {
    setPlanStart(toLocalInput(new Date(slot.start)));
    setPlanEnd(toLocalInput(new Date(slot.end)));
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let finalCustomerId = customerId;
      let finalSiteId = siteId;

      if (!finalCustomerId) {
        if (!newCustomer.trim()) {
          throw new Error('Choisissez un client ou saisissez un nouveau nom.');
        }
        const createdCustomer = await api<{ id: string }>('/customers', {
          method: 'POST',
          body: JSON.stringify({
            type: 'COMPANY',
            name: newCustomer.trim(),
          }),
        });
        finalCustomerId = createdCustomer.id;
      }

      if (!finalSiteId) {
        if (!newAddress.trim()) {
          throw new Error('Choisissez un site ou saisissez une adresse.');
        }
        const createdSite = await api<{ id: string }>('/sites', {
          method: 'POST',
          body: JSON.stringify({
            customerId: finalCustomerId,
            name: newSiteName.trim() || 'Site principal',
            address: newAddress.trim(),
          }),
        });
        finalSiteId = createdSite.id;
      }

      const start = planStart ? new Date(planStart) : null;
      const end = planEnd ? new Date(planEnd) : null;
      if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        throw new Error('Indiquez un créneau de début et de fin.');
      }
      if (end <= start) throw new Error('La fin doit être après le début.');
      if (needsTransport && (!workerId || !transporterId)) {
        throw new Error('Choisissez un technicien et un transporteur.');
      }
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
          customerId: finalCustomerId,
          siteId: finalSiteId,
          typeId: typeId || undefined,
          priority: 'NORMAL',
          scheduledStart: start.toISOString(),
          scheduledEnd: end.toISOString(),
          estimatedMinutes: duration,
          fieldWorkerId: workerId || undefined,
          fieldGroupId: workerId ? fieldGroupId : undefined,
          transporterId: needsTransport ? transporterId : undefined,
          transportGroupId: needsTransport ? transportGroupId : undefined,
        }),
      });

      onCreated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Création impossible');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="form-stack" onSubmit={onSubmit}>
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
          if (!transport) {
            setTransportGroupId('');
            setTransportGroupLabel('');
            setTransporterId('');
            setTransporterLabel('');
          }
          setPlanStart('');
          setPlanEnd('');
        }}
        allowClear={false}
        required
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
          setSiteId('');
          setSiteLabel('');
        }}
        allowClear
      />
      {!customerId ? (
        <label className="field">
          <span>Ou nouveau client</span>
          <input
            className="input"
            value={newCustomer}
            onChange={(e) => setNewCustomer(e.target.value)}
            placeholder="Ex. ACME…"
          />
        </label>
      ) : null}

      <SearchSelect
        label="Site"
        value={siteId}
        selectedLabel={siteLabel}
        placeholder={customerId ? 'Rechercher un site…' : 'Choisissez d’abord un client'}
        disabled={!customerId}
        loadOptions={(q) => searchSites(q, customerId)}
        onChange={(id, opt) => {
          setSiteId(id);
          setSiteLabel(opt?.label ?? '');
        }}
        allowClear
      />
      {customerId && !siteId ? (
        <div className="row" style={{ alignItems: 'stretch' }}>
          <label className="field" style={{ flex: 1 }}>
            <span>Nom du site</span>
            <input
              className="input"
              value={newSiteName}
              onChange={(e) => setNewSiteName(e.target.value)}
              placeholder="Siège…"
            />
          </label>
          <label className="field" style={{ flex: 2 }}>
            <span>Adresse</span>
            <input
              className="input"
              value={newAddress}
              onChange={(e) => setNewAddress(e.target.value)}
              placeholder="Adresse complète"
              required={!siteId}
            />
          </label>
        </div>
      ) : null}

      <SearchSelect
        label="Groupe technicien"
        value={fieldGroupId}
        selectedLabel={fieldGroupLabel}
        placeholder="Choisir un groupe…"
        staticOptions={groupOptions}
        loadOptions={async () => groupOptions}
        onChange={(id, opt) => {
          setFieldGroupId(id);
          setFieldGroupLabel(opt?.label ?? '');
          setWorkerId('');
          setWorkerLabel('');
          setPlanStart('');
          setPlanEnd('');
        }}
        allowClear={!needsTransport}
        required={needsTransport}
      />
      <SearchSelect
        label={needsTransport ? 'Technicien' : 'Technicien (optionnel)'}
        value={workerId}
        selectedLabel={workerLabel}
        placeholder={fieldGroupId ? 'Techniciens du groupe…' : 'Choisissez d’abord un groupe'}
        disabled={!fieldGroupId}
        loadOptions={(q) => (fieldGroupId ? searchWorkers(q, fieldGroupId) : Promise.resolve([]))}
        onChange={(id, opt) => {
          setWorkerId(id);
          setWorkerLabel(opt?.label ?? '');
          setPlanStart('');
          setPlanEnd('');
        }}
        allowClear={!needsTransport}
        required={needsTransport}
      />

      {needsTransport ? (
        <>
          <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>
            Le transporteur livre les équipements. Le technicien intervient sur place.
          </p>
          <SearchSelect
            label="Groupe transport"
            value={transportGroupId}
            selectedLabel={transportGroupLabel}
            placeholder="Choisir un groupe…"
            staticOptions={groupOptions}
            loadOptions={async () => groupOptions}
            onChange={(id, opt) => {
              setTransportGroupId(id);
              setTransportGroupLabel(opt?.label ?? '');
              setTransporterId('');
              setTransporterLabel('');
            }}
            allowClear={false}
            required
          />
          <SearchSelect
            label="Transporteur"
            value={transporterId}
            selectedLabel={transporterLabel}
            placeholder={
              transportGroupId ? 'Transporteurs du groupe…' : 'Choisissez d’abord un groupe'
            }
            disabled={!transportGroupId}
            loadOptions={(q) =>
              transportGroupId ? searchWorkers(q, transportGroupId) : Promise.resolve([])
            }
            onChange={(id, opt) => {
              setTransporterId(id);
              setTransporterLabel(opt?.label ?? '');
            }}
            allowClear={false}
            required
          />
        </>
      ) : null}

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
          <span>Durée estimée</span>
          <input className="input" value={`${duration} min`} readOnly />
        </label>
      </div>

      {workerId ? (
        <div>
          <div className="muted" style={{ marginBottom: 8, fontSize: '0.85rem' }}>
            Créneaux libres {busyCount ? `· ${busyCount} déjà pris` : ''}
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
              Aucun créneau libre ce jour (7h–19h). Choisissez une autre date.
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
        <span>Note courte</span>
        <input
          className="input"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Ex. panne clim…"
        />
      </label>

      {error ? <div className="error-box">{error}</div> : null}

      <button className="btn" disabled={loading || !typeId}>
        {loading ? 'Création…' : "Créer l'intervention"}
      </button>
    </form>
  );
}
