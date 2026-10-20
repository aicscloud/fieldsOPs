'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  AlertTriangle,
  CalendarClock,
  ClipboardList,
  Plus,
  Repeat,
  WandSparkles,
} from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { DataTable } from '@/components/DataTable';
import { SearchSelect } from '@/components/SearchSelect';
import { Button, EmptyState, MetricCard, Modal, PageLoading, StatusBadge, Toast } from '@/components/ui';
import { api } from '@/lib/api';
import { searchCustomers, searchSites, searchWorkOrderTypes } from '@/lib/search';

type DueState = 'overdue' | 'due' | 'ok' | 'paused';

type Contract = {
  id: string;
  title: string;
  intervalMonths: number;
  nextDueAt: string;
  lastVisitAt?: string | null;
  active: boolean;
  notes?: string | null;
  kind: string;
  dueState: DueState;
  customer: { id: string; name: string };
  site: { id: string; name: string; city?: string | null };
  equipment?: { id: string; serialNumber: string; part: { name: string } } | null;
  type?: { id: string; name: string } | null;
  openVisit?: { id: string; number: string; status: string } | null;
};

type Summary = { overdue: number; due: number; openVisits: number; total: number };

type Installed = {
  id: string;
  serialNumber: string;
  part: { name: string };
};

const INTERVALS = [
  { value: '1', label: 'Tous les mois' },
  { value: '3', label: 'Tous les 3 mois' },
  { value: '6', label: 'Tous les 6 mois' },
  { value: '12', label: 'Tous les 12 mois' },
];

const KIND_OPTIONS = [
  { value: 'INSTALLATION', label: 'Installation' },
  { value: 'REPAIR', label: 'Réparation' },
  { value: 'REPLACEMENT', label: 'Changement' },
];

const STATE_LABEL: Record<DueState, string> = {
  overdue: 'En retard',
  due: 'Due',
  ok: 'À jour',
  paused: 'Inactif',
};

function day(iso?: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR');
}

function toInputDate(iso?: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dayN = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dayN}`;
}

export default function ContractsClient() {
  const params = useSearchParams();
  const [rows, setRows] = useState<Contract[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Contract | null>(null);
  const [q, setQ] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [kpi, setKpi] = useState('');
  const [busy, setBusy] = useState(false);

  const [customerId, setCustomerId] = useState(params.get('customerId') ?? '');
  const [customerLabel, setCustomerLabel] = useState('');
  const [siteId, setSiteId] = useState(params.get('siteId') ?? '');
  const [siteLabel, setSiteLabel] = useState('');
  const [unitId, setUnitId] = useState(params.get('unitId') ?? '');
  const [unitLabel, setUnitLabel] = useState('');
  const [typeId, setTypeId] = useState('');
  const [typeLabel, setTypeLabel] = useState('');
  const [kind, setKind] = useState('REPAIR');
  const [interval, setInterval] = useState('6');
  const [units, setUnits] = useState<Installed[]>([]);

  async function load() {
    setLoading(true);
    try {
      const [list, totals] = await Promise.all([
        api<Contract[]>('/contracts'),
        api<Summary>('/contracts/summary'),
      ]);
      setRows(list);
      setSummary(totals);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (params.get('customerId') || params.get('siteId') || params.get('unitId')) {
      setOpen(true);
    }
  }, [params]);

  useEffect(() => {
    if (!siteId) {
      setUnits([]);
      return;
    }
    api<Installed[]>(`/inventory/installed?siteId=${siteId}&status=INSTALLED`)
      .then(setUnits)
      .catch(() => setUnits([]));
  }, [siteId]);

  useEffect(() => {
    if (!unitId) {
      setUnitLabel('');
      return;
    }
    const found = units.find((u) => u.id === unitId);
    if (found) setUnitLabel(`${found.part.name} · n° ${found.serialNumber}`);
  }, [unitId, units]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((row) => {
      if (stateFilter && row.dueState !== stateFilter) return false;
      if (kpi === 'overdue' && row.dueState !== 'overdue') return false;
      if (kpi === 'due' && row.dueState !== 'due') return false;
      if (kpi === 'open' && !row.openVisit) return false;
      if (kpi === 'active' && !row.active) return false;
      if (!needle) return true;
      const hay = `${row.title} ${row.customer.name} ${row.site.name} ${row.equipment?.serialNumber ?? ''}`.toLowerCase();
      return hay.includes(needle);
    });
  }, [rows, q, stateFilter, kpi]);

  function toggleKpi(key: string) {
    const next = kpi === key ? '' : key;
    setKpi(next);
    if (next === 'overdue' || next === 'due') setStateFilter(next);
    else setStateFilter('');
  }

  function closeForm() {
    setOpen(false);
    setEditing(null);
  }

  function openCreate() {
    setEditing(null);
    if (!params.get('customerId')) {
      setCustomerId('');
      setCustomerLabel('');
      setSiteId('');
      setSiteLabel('');
      setUnitId('');
      setUnitLabel('');
      setTypeId('');
      setTypeLabel('');
      setKind('REPAIR');
      setInterval('6');
    }
    setOpen(true);
  }

  function openEdit(row: Contract) {
    setEditing(row);
    setCustomerId(row.customer.id);
    setCustomerLabel(row.customer.name);
    setSiteId(row.site.id);
    setSiteLabel(row.site.name);
    setUnitId(row.equipment?.id ?? '');
    setUnitLabel(
      row.equipment ? `${row.equipment.part.name} · n° ${row.equipment.serialNumber}` : '',
    );
    setTypeId(row.type?.id ?? '');
    setTypeLabel(row.type?.name ?? '');
    setKind(row.kind);
    setInterval(String(row.intervalMonths));
    setOpen(true);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!customerId || !siteId) {
      setError('Choisissez un client et un site');
      return;
    }
    const form = new FormData(event.currentTarget);
    const body = editing
      ? {
          title: form.get('title'),
          installedEquipmentId: unitId,
          typeId: typeId || undefined,
          kind,
          intervalMonths: Number(interval),
          nextDueAt: form.get('nextDueAt'),
          notes: form.get('notes') || undefined,
          active: form.get('active') === 'on',
        }
      : {
          title: form.get('title'),
          customerId,
          siteId,
          installedEquipmentId: unitId || undefined,
          typeId: typeId || undefined,
          kind,
          intervalMonths: Number(interval),
          nextDueAt: form.get('nextDueAt'),
          notes: form.get('notes') || undefined,
        };
    try {
      if (editing) {
        await api(`/contracts/${editing.id}`, { method: 'PATCH', body: JSON.stringify(body) });
      } else {
        await api('/contracts', { method: 'POST', body: JSON.stringify(body) });
      }
      closeForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enregistrement impossible');
    }
  }

  async function generate(id: string) {
    try {
      const result = await api<{ workOrder: { number: string } }>(`/contracts/${id}/generate`, {
        method: 'POST',
      });
      setToast(`Visite créée : ${result.workOrder.number}`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Génération impossible');
    }
  }

  async function generateDue() {
    setBusy(true);
    try {
      const result = await api<{ count: number }>('/contracts/generate-due', { method: 'POST' });
      setToast(
        result.count
          ? `${result.count} visite${result.count > 1 ? 's' : ''} créée${result.count > 1 ? 's' : ''}`
          : 'Aucune visite en retard à créer',
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Génération impossible');
    } finally {
      setBusy(false);
    }
  }

  const unitOptions = units.map((u) => ({
    value: u.id,
    label: `${u.part.name} · n° ${u.serialNumber}`,
  }));

  return (
    <AppShell
      title="Contrats"
      actions={
        <div className="row">
          <Button variant="secondary" disabled={busy} onClick={() => void generateDue()}>
            <WandSparkles size={16} />
            Générer les visites en retard
          </Button>
          <Button onClick={openCreate}>
            <Plus size={16} />
            Nouveau contrat
          </Button>
        </div>
      }
    >
      {error ? <div className="error-box" style={{ marginBottom: 12 }}>{error}</div> : null}
      <Toast message={toast} onClose={() => setToast(null)} />

      {summary ? (
        <div className="dash-metrics">
          <button
            type="button"
            className={`dash-metric-link ${kpi === 'overdue' ? 'is-active' : ''}`}
            onClick={() => toggleKpi('overdue')}
          >
            <MetricCard
              icon={AlertTriangle}
              label="En retard"
              value={summary.overdue}
              hint="visite à faire"
              className={summary.overdue ? 'is-alert' : ''}
            />
          </button>
          <button
            type="button"
            className={`dash-metric-link ${kpi === 'due' ? 'is-active' : ''}`}
            onClick={() => toggleKpi('due')}
          >
            <MetricCard
              icon={CalendarClock}
              label="Due sous 14 jours"
              value={summary.due}
              hint="à planifier"
              className={summary.due ? 'is-warn' : ''}
            />
          </button>
          <button
            type="button"
            className={`dash-metric-link ${kpi === 'open' ? 'is-active' : ''}`}
            onClick={() => toggleKpi('open')}
          >
            <MetricCard
              icon={ClipboardList}
              label="Visites ouvertes"
              value={summary.openVisits}
              hint="déjà créées"
            />
          </button>
          <button
            type="button"
            className={`dash-metric-link ${kpi === 'active' ? 'is-active' : ''}`}
            onClick={() => toggleKpi('active')}
          >
            <MetricCard
              icon={Repeat}
              label="Contrats actifs"
              value={summary.total}
              hint="en portefeuille"
            />
          </button>
        </div>
      ) : null}

      <Modal
        open={open}
        title={editing ? 'Modifier le contrat' : 'Nouveau contrat'}
        onClose={closeForm}
        size="lg"
      >
        <form className="form-stack" key={editing?.id ?? 'new'} onSubmit={onSubmit}>
          <label className="field">
            <span>Intitulé</span>
            <input
              className="input"
              name="title"
              required
              defaultValue={editing?.title ?? 'Visite de maintenance'}
            />
          </label>
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
              setUnitId('');
              setUnitLabel('');
            }}
            required
          />
          <SearchSelect
            label="Site"
            value={siteId}
            selectedLabel={siteLabel}
            placeholder="Rechercher un site…"
            loadOptions={(query) => searchSites(query, customerId || undefined)}
            onChange={(id, opt) => {
              setSiteId(id);
              setSiteLabel(opt?.label ?? '');
              setUnitId('');
              setUnitLabel('');
            }}
            required
          />
          <SearchSelect
            label="Équipement (optionnel)"
            value={unitId}
            selectedLabel={unitLabel}
            placeholder="Tout le site, ou une unité"
            staticOptions={unitOptions}
            loadOptions={async () => unitOptions}
            onChange={(id, opt) => {
              setUnitId(id);
              setUnitLabel(opt?.label ?? '');
            }}
            allowClear
          />
          <SearchSelect
            label="Catégorie"
            value={typeId}
            selectedLabel={typeLabel}
            placeholder="Contrôle périodique…"
            loadOptions={searchWorkOrderTypes}
            onChange={(id, opt) => {
              setTypeId(id);
              setTypeLabel(opt?.label ?? '');
            }}
            allowClear
          />
          <div className="row">
            <SearchSelect
              label="Type"
              value={kind}
              selectedLabel={KIND_OPTIONS.find((k) => k.value === kind)?.label}
              staticOptions={KIND_OPTIONS}
              loadOptions={async () => KIND_OPTIONS}
              onChange={setKind}
              allowClear={false}
            />
            <SearchSelect
              label="Rythme"
              value={interval}
              selectedLabel={INTERVALS.find((i) => i.value === interval)?.label}
              staticOptions={INTERVALS}
              loadOptions={async () => INTERVALS}
              onChange={setInterval}
              allowClear={false}
            />
          </div>
          <label className="field">
            <span>Prochaine visite</span>
            <input
              className="input"
              name="nextDueAt"
              type="date"
              required
              defaultValue={toInputDate(editing?.nextDueAt) || toInputDate(new Date().toISOString())}
            />
          </label>
          <label className="field">
            <span>Notes</span>
            <input className="input" name="notes" defaultValue={editing?.notes ?? ''} />
          </label>
          {editing ? (
            <label className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" name="active" defaultChecked={editing.active} />
              <span>Contrat actif</span>
            </label>
          ) : null}
          <Button type="submit">Enregistrer</Button>
        </form>
      </Modal>

      {loading ? (
        <PageLoading height={260} />
      ) : (
        <>
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
              value={stateFilter}
              selectedLabel={STATE_LABEL[stateFilter as DueState]}
              placeholder="État"
              staticOptions={[
                { value: 'overdue', label: 'En retard' },
                { value: 'due', label: 'Due' },
                { value: 'ok', label: 'À jour' },
                { value: 'paused', label: 'Inactif' },
              ]}
              loadOptions={async () => [
                { value: 'overdue', label: 'En retard' },
                { value: 'due', label: 'Due' },
                { value: 'ok', label: 'À jour' },
                { value: 'paused', label: 'Inactif' },
              ]}
              onChange={setStateFilter}
              allowClear
            />
          </div>
          <DataTable
            rows={filtered}
            rowKey={(row) => row.id}
            defaultSortKey="nextDueAt"
            onRowClick={openEdit}
            empty={
              <EmptyState
                title="Aucun contrat"
                description="Un contrat relie un site ou une machine à une visite régulière. Le bureau génère ensuite l’intervention."
              />
            }
            columns={[
              {
                key: 'title',
                header: 'Contrat',
                sortValue: (row) => row.title,
                render: (row) => (
                  <>
                    <strong>{row.title}</strong>
                    <div className="muted">
                      {row.equipment
                        ? `${row.equipment.part.name} · n° ${row.equipment.serialNumber}`
                        : 'Tout le site'}
                    </div>
                  </>
                ),
              },
              {
                key: 'customer',
                header: 'Client',
                sortValue: (row) => row.customer.name,
                render: (row) => (
                  <>
                    {row.customer.name}
                    <div className="muted">
                      {row.site.name}
                      {row.site.city ? ` · ${row.site.city}` : ''}
                    </div>
                  </>
                ),
              },
              {
                key: 'intervalMonths',
                header: 'Rythme',
                sortValue: (row) => row.intervalMonths,
                render: (row) =>
                  INTERVALS.find((i) => i.value === String(row.intervalMonths))?.label ??
                  `${row.intervalMonths} mois`,
              },
              {
                key: 'nextDueAt',
                header: 'Prochaine visite',
                sortValue: (row) => row.nextDueAt,
                render: (row) => (
                  <span style={row.dueState === 'overdue' ? { color: 'var(--danger)' } : undefined}>
                    {day(row.nextDueAt)}
                  </span>
                ),
              },
              {
                key: 'dueState',
                header: 'État',
                sortValue: (row) => row.dueState,
                render: (row) => <StatusBadge status={row.dueState} />,
              },
              {
                key: 'openVisit',
                header: 'Intervention',
                sortValue: (row) => row.openVisit?.number ?? '',
                render: (row) =>
                  row.openVisit ? (
                    <span>
                      {row.openVisit.number} <StatusBadge status={row.openVisit.status} />
                    </span>
                  ) : (
                    <span className="muted">—</span>
                  ),
              },
              {
                key: 'actions',
                header: '',
                sortable: false,
                render: (row) => (
                  <div className="row" onClick={(e) => e.stopPropagation()}>
                    {row.active && !row.openVisit ? (
                      <Button size="sm" onClick={() => void generate(row.id)}>
                        Créer la visite
                      </Button>
                    ) : null}
                    {row.openVisit ? (
                      <Link
                        className="btn btn-secondary btn-sm"
                        href={`/work-orders?open=${row.openVisit.id}`}
                      >
                        Voir
                      </Link>
                    ) : null}
                    <Button size="sm" variant="secondary" onClick={() => openEdit(row)}>
                      Modifier
                    </Button>
                  </div>
                ),
              },
            ]}
          />
        </>
      )}
    </AppShell>
  );
}
