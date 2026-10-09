'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Mail,
  MapPin,
  Navigation,
  Pause,
  PenLine,
  Phone,
  Play,
  StickyNote,
  Truck,
  UserRound,
} from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { Pagination, usePager } from '@/components/Pagination';
import { SearchSelect } from '@/components/SearchSelect';
import { Button, EmptyState, PageLoading, StatusBadge, Toast } from '@/components/ui';
import { api, getSession } from '@/lib/api';
import { searchParts } from '@/lib/search';

type WorkOrder = {
  id: string;
  number: string;
  title: string;
  status: string;
  scheduledStart?: string | null;
  scheduledEnd?: string | null;
  site?: {
    name: string;
    address: string;
    city?: string | null;
    contactName?: string | null;
    contactPhone?: string | null;
  };
  customer?: { name: string; phone?: string | null };
  assignedTo?: {
    firstName: string;
    lastName: string;
    email?: string | null;
    phone?: string | null;
  } | null;
  signature?: { signerName: string; signedAt?: string } | null;
  notes?: {
    id: string;
    body: string;
    kind?: string;
    createdAt: string;
    author?: { firstName: string; lastName: string } | null;
    parts?: { quantity: number; part: { name: string; sku: string; unit: string } }[];
    linkedWorkOrder?: { number: string; title: string; status: string } | null;
  }[];
};

async function getLocation() {
  if (!navigator.geolocation) return {};
  const position = await new Promise<GeolocationPosition | null>((resolve) =>
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(pos),
      () => resolve(null),
      { timeout: 4000 },
    ),
  );
  return {
    latitude: position?.coords.latitude,
    longitude: position?.coords.longitude,
  };
}

const ACTIVE = new Set([
  'SCHEDULED',
  'ASSIGNED',
  'EN_ROUTE',
  'IN_PROGRESS',
  'PAUSED',
  'COMPLETED',
]);

function formatTime(iso?: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function mapsUrl(site?: WorkOrder['site']) {
  if (!site) return null;
  const q = encodeURIComponent(
    `${site.address}${site.city ? `, ${site.city}` : ''}`,
  );
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

export default function FieldPage() {
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<WorkOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [noteKind, setNoteKind] = useState<'NOTE' | 'EQUIPMENT_REQUEST'>('NOTE');
  const [partId, setPartId] = useState('');
  const [partLabel, setPartLabel] = useState('');
  const [partQty, setPartQty] = useState(1);
  const [noteParts, setNoteParts] = useState<{ partId: string; label: string; quantity: number }[]>([]);
  const [pauseReason, setPauseReason] = useState('');
  const [pauseOpen, setPauseOpen] = useState(false);
  const [signerName, setSignerName] = useState('');
  const [showDetail, setShowDetail] = useState(false);

  const pager = usePager(orders, 8);

  const primaryAction = useMemo(() => {
    if (!detail) return null;
    if (detail.status === 'ASSIGNED' || detail.status === 'SCHEDULED') {
      return { path: 'en-route', label: 'En route', icon: Truck };
    }
    if (detail.status === 'EN_ROUTE') {
      return { path: 'start', label: 'Démarrer', icon: Play };
    }
    if (detail.status === 'IN_PROGRESS') {
      return { path: 'complete', label: 'Terminer', icon: CheckCircle2 };
    }
    if (detail.status === 'PAUSED') {
      return { path: 'start', label: 'Reprendre', icon: Play };
    }
    return null;
  }, [detail]);

  async function loadList() {
    setLoading(true);
    try {
      const role = getSession()?.role ?? 'OWNER';
      const list = await api<WorkOrder[]>(
        role === 'FIELD_WORKER' ? '/work-orders?mine=true' : '/work-orders',
      );
      const visible =
        role === 'FIELD_WORKER' ? list : list.filter((o) => ACTIVE.has(o.status));
      setOrders(visible);
      setSelectedId((prev) => {
        if (prev && visible.some((o) => o.id === prev)) return prev;
        return visible[0]?.id ?? null;
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  }

  async function loadDetail(id: string) {
    const wo = await api<WorkOrder>(`/work-orders/${id}`);
    setDetail(wo);
  }

  useEffect(() => {
    void loadList();
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    loadDetail(selectedId).catch((err: Error) => setError(err.message));
  }, [selectedId]);

  async function action(path: string, noteText?: string) {
    if (!selectedId) return;
    setBusy(true);
    setError(null);
    try {
      await api(`/work-orders/${selectedId}/${path}`, {
        method: 'POST',
        body: JSON.stringify({
          ...(await getLocation()),
          note: noteText,
        }),
      });
      await Promise.all([loadList(), loadDetail(selectedId)]);
      setPauseOpen(false);
      setPauseReason('');
      setToast('Statut mis à jour');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action impossible');
    } finally {
      setBusy(false);
    }
  }

  async function confirmPause(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pauseReason.trim()) {
      setError('Indiquez la raison de la pause');
      return;
    }
    await action('pause', pauseReason.trim());
  }

  async function addNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedId || !note.trim()) return;
    setBusy(true);
    try {
      await api(`/work-orders/${selectedId}/notes`, {
        method: 'POST',
        body: JSON.stringify({
          body: note.trim(),
          kind: noteKind,
          parts:
            noteKind === 'EQUIPMENT_REQUEST'
              ? noteParts.map((p) => ({ partId: p.partId, quantity: p.quantity }))
              : undefined,
        }),
      });
      setNote('');
      setNoteParts([]);
      setNoteKind('NOTE');
      await loadDetail(selectedId);
      setToast(
        noteKind === 'EQUIPMENT_REQUEST'
          ? 'Demande envoyée à l’équipe transport'
          : 'Note enregistrée',
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Note impossible');
    } finally {
      setBusy(false);
    }
  }

  async function sign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedId || !signerName.trim()) return;
    setBusy(true);
    try {
      await api(`/work-orders/${selectedId}/signature`, {
        method: 'POST',
        body: JSON.stringify({
          signerName: signerName.trim(),
          imageUrl: 'data:image/png;base64,signed',
          ...(await getLocation()),
        }),
      });
      setSignerName('');
      await loadDetail(selectedId);
      setToast('Signature enregistrée');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signature impossible');
    } finally {
      setBusy(false);
    }
  }

  const mapLink = mapsUrl(detail?.site);

  return (
    <AppShell title="Terrain">
      <div className="field-root">
      <Toast message={toast} onClose={() => setToast(null)} />
      {error ? <div className="error-box" style={{ marginBottom: 12, flexShrink: 0 }}>{error}</div> : null}

      {loading ? (
        <PageLoading height={360} />
      ) : (
        <div className={`field-shell ${showDetail ? 'is-detail' : ''}`}>
          <aside className="field-rail">
            <div className="field-rail-head">
              <h2>Missions</h2>
              <span className="field-count">{orders.length}</span>
            </div>

            {pager.slice.length ? (
              <>
                <div className="field-mission-list">
                  {pager.slice.map((order) => {
                    const active = selectedId === order.id;
                    const start = formatTime(order.scheduledStart);
                    return (
                      <button
                        key={order.id}
                        type="button"
                        className={`field-mission ${active ? 'is-active' : ''}`}
                        onClick={() => {
                          setSelectedId(order.id);
                          setPauseOpen(false);
                          setShowDetail(true);
                        }}
                      >
                        <div className="field-mission-top">
                          <span className="field-mission-code">{order.number}</span>
                          <StatusBadge status={order.status} />
                        </div>
                        <div className="field-mission-title">{order.title}</div>
                        <div className="field-mission-meta">
                          <span>{order.customer?.name ?? ''}</span>
                          {start ? (
                            <span>
                              <Clock3 size={12} />
                              {start}
                            </span>
                          ) : null}
                        </div>
                      </button>
                    );
                  })}
                </div>
                <Pagination
                  page={pager.page}
                  pageCount={pager.pageCount}
                  total={pager.total}
                  onChange={pager.setPage}
                />
              </>
            ) : (
              <EmptyState title="Aucune mission" description="Rien à traiter pour le moment." />
            )}
          </aside>

          <section className="field-workspace">
            {detail ? (
              <>
                <header className="field-hero">
                  <button
                    type="button"
                    className="field-back"
                    onClick={() => {
                      setShowDetail(false);
                      setPauseOpen(false);
                    }}
                  >
                    <ArrowLeft size={16} />
                    Missions
                  </button>
                  <div className="field-hero-main">
                    <div className="field-hero-kicker">
                      <StatusBadge status={detail.status} />
                      <span className="field-mission-code">{detail.number}</span>
                    </div>
                    <h2>{detail.title}</h2>
                    <p>
                      {detail.customer?.name ?? 'Client'}
                      {detail.site ? ` · ${detail.site.name}` : ''}
                    </p>
                  </div>

                  <div className="field-actions">
                    {primaryAction ? (
                      <Button
                        disabled={busy}
                        onClick={() => void action(primaryAction.path)}
                      >
                        <primaryAction.icon size={16} />
                        {primaryAction.label}
                      </Button>
                    ) : null}
                    {detail.status === 'IN_PROGRESS' ? (
                      <Button
                        variant="secondary"
                        disabled={busy}
                        onClick={() => setPauseOpen(true)}
                      >
                        <Pause size={16} />
                        Pause
                      </Button>
                    ) : null}
                    {detail.status === 'ASSIGNED' || detail.status === 'SCHEDULED' ? (
                      <Button
                        variant="secondary"
                        disabled={busy}
                        onClick={() => void action('start')}
                      >
                        <Play size={16} />
                        Démarrer
                      </Button>
                    ) : null}
                    {!primaryAction && detail.status === 'COMPLETED' ? (
                      <span className="muted">Mission terminée</span>
                    ) : null}
                  </div>
                </header>
                {pauseOpen ? (
                  <form className="field-pause" onSubmit={confirmPause}>
                    <label className="field">
                      <span>Raison de la pause</span>
                      <input
                        className="input"
                        value={pauseReason}
                        onChange={(e) => setPauseReason(e.target.value)}
                        placeholder="Pièce manquante, client absent…"
                        required
                        autoFocus
                      />
                    </label>
                    <div className="row">
                      <Button type="submit" disabled={busy || !pauseReason.trim()}>
                        Confirmer la pause
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          setPauseOpen(false);
                          setPauseReason('');
                        }}
                      >
                        Annuler
                      </Button>
                    </div>
                  </form>
                ) : null}

                <div className="field-body">
                  <article className="field-panel field-notes-card">
                    <div className="field-panel-title">
                      <StickyNote size={16} />
                      Notes terrain
                    </div>
                    <form className="form-stack" onSubmit={addNote}>
                      <SearchSelect
                        label="Type"
                        value={noteKind}
                        selectedLabel={
                          noteKind === 'EQUIPMENT_REQUEST' ? 'Demande d’équipements' : 'Observation'
                        }
                        staticOptions={[
                          { value: 'NOTE', label: 'Observation' },
                          { value: 'EQUIPMENT_REQUEST', label: 'Demande d’équipements' },
                        ]}
                        loadOptions={async () => [
                          { value: 'NOTE', label: 'Observation' },
                          { value: 'EQUIPMENT_REQUEST', label: 'Demande d’équipements' },
                        ]}
                        onChange={(value) =>
                          setNoteKind(value === 'EQUIPMENT_REQUEST' ? 'EQUIPMENT_REQUEST' : 'NOTE')
                        }
                        allowClear={false}
                      />
                      <textarea
                        className="input field-textarea"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder={
                          noteKind === 'EQUIPMENT_REQUEST'
                            ? 'Précisez le besoin sur le terrain…'
                            : 'Observation, accès, client…'
                        }
                        rows={3}
                        required
                      />
                      {noteKind === 'EQUIPMENT_REQUEST' ? (
                        <div className="field-equip">
                          <SearchSelect
                            label="Équipement"
                            value={partId}
                            selectedLabel={partLabel}
                            placeholder="Rechercher un équipement…"
                            loadOptions={searchParts}
                            onChange={(id, opt) => {
                              setPartId(id);
                              setPartLabel(opt?.label ?? '');
                            }}
                          />
                          <div className="row">
                            <input
                              className="input"
                              type="number"
                              min={1}
                              step="any"
                              value={partQty}
                              onChange={(e) => setPartQty(Number(e.target.value) || 1)}
                              style={{ width: 90 }}
                            />
                            <Button
                              type="button"
                              variant="secondary"
                              disabled={!partId}
                              onClick={() => {
                                setNoteParts((prev) => [
                                  ...prev,
                                  { partId, label: partLabel, quantity: partQty },
                                ]);
                                setPartId('');
                                setPartLabel('');
                                setPartQty(1);
                              }}
                            >
                              Ajouter
                            </Button>
                          </div>
                          {noteParts.length ? (
                            <ul className="field-notes">
                              {noteParts.map((p) => (
                                <li key={`${p.partId}-${p.label}`}>
                                  {p.quantity} × {p.label}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="muted" style={{ margin: 0 }}>
                              Ajoutez les équipements à livrer. Une intervention sera créée pour l’équipe transport.
                            </p>
                          )}
                        </div>
                      ) : null}
                      <Button
                        type="submit"
                        variant="secondary"
                        disabled={
                          busy ||
                          !note.trim() ||
                          (noteKind === 'EQUIPMENT_REQUEST' && noteParts.length === 0)
                        }
                      >
                        {noteKind === 'EQUIPMENT_REQUEST' ? 'Envoyer la demande' : 'Enregistrer la note'}
                      </Button>
                    </form>
                    {detail.notes?.length ? (
                      <ul className="field-notes">
                        {detail.notes.map((n) => (
                          <li key={n.id}>
                            <div className="muted">
                              {n.author
                                ? `${n.author.firstName} ${n.author.lastName}`
                                : 'Auteur inconnu'}
                              {' · '}
                              {n.kind === 'EQUIPMENT_REQUEST' ? 'Demande d’équipements' : 'Observation'}
                              {' · '}
                              {new Date(n.createdAt).toLocaleString('fr-FR', {
                                day: '2-digit',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                            <p>{n.body}</p>
                            {n.parts?.length ? (
                              <p className="muted">
                                {n.parts.map((p) => `${p.quantity} ${p.part.unit} ${p.part.name}`).join(', ')}
                              </p>
                            ) : null}
                            {n.linkedWorkOrder ? (
                              <p className="muted">Intervention liée : {n.linkedWorkOrder.number}</p>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="muted" style={{ margin: 0 }}>
                        Aucune note pour l’instant.
                      </p>
                    )}
                  </article>

                  <div className="field-side">
                    <article className="field-panel">
                      <div className="field-panel-title">
                        <MapPin size={16} />
                        Lieu d’intervention
                      </div>
                      <strong>{detail.site?.name ?? ''}</strong>
                      <p className="muted">
                        {detail.site
                          ? `${detail.site.address}${detail.site.city ? `, ${detail.site.city}` : ''}`
                          : 'Adresse non renseignée'}
                      </p>
                      {(detail.scheduledStart || detail.scheduledEnd) && (
                        <div className="field-time-row">
                          <Clock3 size={14} />
                          <span>
                            {formatTime(detail.scheduledStart) ?? ''}
                            {' → '}
                            {formatTime(detail.scheduledEnd) ?? ''}
                          </span>
                        </div>
                      )}
                      {(detail.site?.contactName || detail.site?.contactPhone) && (
                        <p className="muted" style={{ margin: 0 }}>
                          Contact : {detail.site.contactName ?? ''}
                          {detail.site.contactPhone ? ` · ${detail.site.contactPhone}` : ''}
                        </p>
                      )}
                      <div className="field-inline-actions">
                        {mapLink ? (
                          <a className="btn btn-secondary" href={mapLink} target="_blank" rel="noreferrer">
                            <Navigation size={15} />
                            Itinéraire
                          </a>
                        ) : null}
                        {detail.customer?.phone || detail.site?.contactPhone ? (
                          <a
                            className="btn btn-ghost"
                            href={`tel:${detail.site?.contactPhone || detail.customer?.phone}`}
                          >
                            Appeler
                          </a>
                        ) : null}
                      </div>
                    </article>

                    <article className="field-panel">
                      <div className="field-panel-title">
                        <UserRound size={16} />
                        Technicien
                      </div>
                      {detail.assignedTo ? (
                        <>
                          <strong>
                            {detail.assignedTo.firstName} {detail.assignedTo.lastName}
                          </strong>
                          {detail.assignedTo.phone ? (
                            <a className="field-tech-line" href={`tel:${detail.assignedTo.phone}`}>
                              <Phone size={14} />
                              {detail.assignedTo.phone}
                            </a>
                          ) : null}
                          {detail.assignedTo.email ? (
                            <a className="field-tech-line" href={`mailto:${detail.assignedTo.email}`}>
                              <Mail size={14} />
                              {detail.assignedTo.email}
                            </a>
                          ) : null}
                        </>
                      ) : (
                        <p className="muted" style={{ margin: 0 }}>
                          Aucun technicien assigné.
                        </p>
                      )}
                    </article>

                    <article className="field-panel">
                      <div className="field-panel-title">
                        <PenLine size={16} />
                        Signature client
                      </div>
                      {detail.signature ? (
                        <div className="field-signed">
                          Signé par <strong>{detail.signature.signerName}</strong>
                          {detail.signature.signedAt
                            ? ` · ${new Date(detail.signature.signedAt).toLocaleString('fr-FR')}`
                            : ''}
                        </div>
                      ) : (
                        <form className="form-stack" onSubmit={sign}>
                          <input
                            className="input"
                            value={signerName}
                            onChange={(e) => setSignerName(e.target.value)}
                            placeholder="Nom du signataire"
                            required
                          />
                          <Button type="submit" variant="secondary" disabled={busy || !signerName.trim()}>
                            Faire signer
                          </Button>
                        </form>
                      )}
                    </article>
                  </div>
                </div>
              </>
            ) : (
              <div className="field-empty">
                <EmptyState
                  title="Sélectionnez une mission"
                  description="Choisissez une intervention à gauche pour démarrer."
                />
              </div>
            )}
          </section>
        </div>
      )}
      </div>
    </AppShell>
  );
}
