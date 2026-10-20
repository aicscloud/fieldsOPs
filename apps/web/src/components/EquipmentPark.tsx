'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DataTable } from '@/components/DataTable';
import { Drawer, EmptyState, PageLoading, StatusBadge } from '@/components/ui';
import { api } from '@/lib/api';

export type ParkUnit = {
  id: string;
  serialNumber: string;
  status: 'INSTALLED' | 'REMOVED';
  installedAt: string;
  lastVisitAt?: string | null;
  nextDueAt?: string | null;
  part: { sku: string; name: string };
  customer: { id?: string; name: string };
  site: { id?: string; name: string; city?: string | null };
  contract?: { id: string; title: string; intervalMonths: number; nextDueAt: string } | null;
  _count?: { repairs: number };
};

type UnitDetail = ParkUnit & {
  visits?: {
    id: string;
    number: string;
    title: string;
    status: string;
    completedAt?: string | null;
    createdAt: string;
  }[];
  repairs?: {
    id: string;
    summary: string;
    createdAt: string;
    workOrder?: { number: string } | null;
    replacement?: { serialNumber: string; part: { name: string } } | null;
  }[];
  maintenanceContracts?: {
    id: string;
    title: string;
    intervalMonths: number;
    nextDueAt: string;
    type?: { name: string } | null;
  }[];
};

function day(iso?: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR');
}

function isLate(iso?: string | null) {
  if (!iso) return false;
  const due = new Date(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due < today;
}

export function EquipmentPark({
  customerId,
  siteId,
  compact,
}: {
  customerId?: string;
  siteId?: string;
  compact?: boolean;
}) {
  const [rows, setRows] = useState<ParkUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unitId, setUnitId] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams({ status: 'INSTALLED' });
    if (customerId) params.set('customerId', customerId);
    if (siteId) params.set('siteId', siteId);
    setLoading(true);
    api<ParkUnit[]>(`/inventory/installed?${params}`)
      .then((list) => {
        setRows(list);
        setError(null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Erreur'))
      .finally(() => setLoading(false));
  }, [customerId, siteId]);

  const contractHref = (unit?: ParkUnit) => {
    const sp = new URLSearchParams();
    if (customerId) sp.set('customerId', customerId);
    if (siteId) sp.set('siteId', siteId);
    if (unit?.customer.id) sp.set('customerId', unit.customer.id);
    if (unit?.site.id) sp.set('siteId', unit.site.id);
    if (unit) sp.set('unitId', unit.id);
    return `/contracts?${sp.toString()}`;
  };

  if (loading) return <PageLoading height={compact ? 160 : 240} rows={compact ? 3 : 5} />;
  if (error) return <div className="error-box">{error}</div>;

  return (
    <>
      {rows.length ? (
        <DataTable
          rows={rows}
          rowKey={(row) => row.id}
          pageSize={compact ? 8 : 10}
          onRowClick={(row) => setUnitId(row.id)}
          empty={<EmptyState title="Aucun équipement sur ce site" />}
          columns={[
            {
              key: 'part',
              header: 'Équipement',
              sortValue: (row) => row.part.name,
              render: (row) => (
                <>
                  <strong>{row.part.name}</strong>
                  <div className="muted">n° {row.serialNumber}</div>
                </>
              ),
            },
            {
              key: 'site',
              header: 'Site',
              sortValue: (row) => row.site.name,
              render: (row) => `${row.site.name}${row.site.city ? ` · ${row.site.city}` : ''}`,
            },
            {
              key: 'installedAt',
              header: 'Installé',
              sortValue: (row) => row.installedAt,
              render: (row) => day(row.installedAt),
            },
            {
              key: 'lastVisitAt',
              header: 'Dernière visite',
              sortValue: (row) => row.lastVisitAt ?? '',
              render: (row) => day(row.lastVisitAt),
            },
            {
              key: 'nextDueAt',
              header: 'Prochaine',
              sortValue: (row) => row.nextDueAt ?? '',
              render: (row) =>
                row.nextDueAt ? (
                  <span style={isLate(row.nextDueAt) ? { color: 'var(--danger)' } : undefined}>
                    {day(row.nextDueAt)}
                  </span>
                ) : (
                  <span className="muted">Sans contrat</span>
                ),
            },
          ]}
        />
      ) : (
        <EmptyState
          title="Aucun équipement installé"
          description="Les unités posées sur une intervention apparaissent ici, avec leur n° de série."
        />
      )}
      <p className="muted" style={{ marginTop: 12 }}>
        <Link href={contractHref()}>Nouveau contrat de visite</Link>
      </p>
      <UnitHistoryDrawer unitId={unitId} onClose={() => setUnitId(null)} />
    </>
  );
}

export function UnitHistoryDrawer({
  unitId,
  onClose,
}: {
  unitId: string | null;
  onClose: () => void;
}) {
  const [unit, setUnit] = useState<UnitDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!unitId) {
      setUnit(null);
      return;
    }
    setError(null);
    api<UnitDetail>(`/inventory/installed/${unitId}`)
      .then(setUnit)
      .catch((err) => setError(err instanceof Error ? err.message : 'Erreur'));
  }, [unitId]);

  return (
    <Drawer
      open={!!unitId}
      title={unit ? `${unit.part.name} · ${unit.serialNumber}` : 'Fiche équipement'}
      onClose={onClose}
    >
      {error ? <div className="error-box">{error}</div> : null}
      {!unit && !error ? <PageLoading height={160} rows={4} /> : null}
      {unit ? (
        <div className="form-stack">
          <p className="muted" style={{ margin: 0 }}>
            {unit.customer.name} · {unit.site.name}
            {unit.site.city ? ` · ${unit.site.city}` : ''}
            <br />
            Installé le {day(unit.installedAt)}
            {unit.lastVisitAt ? ` · dernière visite ${day(unit.lastVisitAt)}` : ''}
          </p>

          {unit.maintenanceContracts?.length ? (
            <div>
              <h3 style={{ margin: '0 0 8px', fontSize: '0.95rem' }}>Contrats</h3>
              {unit.maintenanceContracts.map((c) => (
                <div key={c.id} className="ops-line">
                  <span>
                    {c.title}
                    {c.type?.name ? ` · ${c.type.name}` : ''}
                  </span>
                  <b style={isLate(c.nextDueAt) ? { color: 'var(--danger)' } : undefined}>
                    {day(c.nextDueAt)}
                  </b>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted" style={{ margin: 0 }}>
              Pas de contrat de visite sur cette unité.
            </p>
          )}

          <div>
            <h3 style={{ margin: '0 0 8px', fontSize: '0.95rem' }}>Interventions</h3>
            {unit.visits?.length ? (
              unit.visits.map((visit) => (
                <div key={visit.id} className="ops-line">
                  <span>
                    {visit.number} · {visit.title}
                  </span>
                  <StatusBadge status={visit.status} />
                </div>
              ))
            ) : (
              <p className="muted" style={{ margin: 0 }}>
                Aucune intervention liée.
              </p>
            )}
          </div>

          {unit.repairs?.length ? (
            <div>
              <h3 style={{ margin: '0 0 8px', fontSize: '0.95rem' }}>Réparations</h3>
              {unit.repairs.map((repair) => (
                <div key={repair.id} style={{ marginBottom: 10 }}>
                  <strong>{repair.workOrder?.number ?? 'Réparation'}</strong>
                  <div className="muted">
                    {day(repair.createdAt)} · {repair.summary}
                    {repair.replacement
                      ? ` · remplacé par ${repair.replacement.part.name} n° ${repair.replacement.serialNumber}`
                      : ''}
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          <Link
            className="btn btn-secondary"
            href={`/contracts?unitId=${unit.id}&customerId=${unit.customer.id ?? ''}&siteId=${unit.site.id ?? ''}`}
          >
            Contrat sur cette unité
          </Link>
        </div>
      ) : null}
    </Drawer>
  );
}

export function ParkDue({ iso }: { iso?: string | null }) {
  if (!iso) return <span className="muted">—</span>;
  return (
    <span style={isLate(iso) ? { color: 'var(--danger)' } : undefined}>{day(iso)}</span>
  );
}
