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
  type AvailabilitySlot,
} from '@/lib/search';

type Type = { id: string; name: string; defaultDuration?: number | null };

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
  const [types, setTypes] = useState<Type[]>([]);
  const [typeId, setTypeId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [customerLabel, setCustomerLabel] = useState('');
  const [siteId, setSiteId] = useState('');
  const [siteLabel, setSiteLabel] = useState('');
  const [newCustomer, setNewCustomer] = useState('');
  const [newSiteName, setNewSiteName] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [workerId, setWorkerId] = useState('');
  const [workerLabel, setWorkerLabel] = useState('');
  const [planDate, setPlanDate] = useState(() => dayKey(new Date()));
  const [planStart, setPlanStart] = useState('');
  const [planEnd, setPlanEnd] = useState('');
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [busyCount, setBusyCount] = useState(0);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void api<Type[]>('/work-order-types?take=10')
      .then((t) => {
        setTypes(t);
        if (t[0]) setTypeId(t[0].id);
      })
      .catch(() => undefined);
  }, []);

  const selectedType = types.find((t) => t.id === typeId);
  const duration = selectedType?.defaultDuration ?? 60;

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

      const title = selectedType?.name
        ? `${selectedType.name}${note ? `, ${note}` : ''}`
        : note || 'Intervention';

      const workOrder = await api<{ id: string; number: string }>('/work-orders', {
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
        }),
      });

      if (workerId) {
        await api(`/work-orders/${workOrder.id}/assign`, {
          method: 'POST',
          body: JSON.stringify({
            fieldWorkerId: workerId,
            scheduledStart: start.toISOString(),
            scheduledEnd: end.toISOString(),
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

  return (
    <form className="form-stack" onSubmit={onSubmit}>
      <div>
        <div className="muted" style={{ marginBottom: 8, fontSize: '0.9rem' }}>
          Catégorie
        </div>
        <div className="chips">
          {types.map((type) => (
            <button
              key={type.id}
              type="button"
              className={`chip ${typeId === type.id ? 'active' : ''}`}
              onClick={() => setTypeId(type.id)}
            >
              {type.name}
            </button>
          ))}
        </div>
      </div>

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
        label="Technicien (optionnel)"
        value={workerId}
        selectedLabel={workerLabel}
        placeholder="Affecter plus tard…"
        loadOptions={searchWorkers}
        onChange={(id, opt) => {
          setWorkerId(id);
          setWorkerLabel(opt?.label ?? '');
        }}
        allowClear
      />

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
