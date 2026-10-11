'use client';

import { FormEvent, useEffect, useState } from 'react';
import { SearchSelect, type SearchOption } from '@/components/SearchSelect';
import { Button } from '@/components/ui';
import { api } from '@/lib/api';
import { searchParts } from '@/lib/search';

type InstalledOption = {
  id: string;
  serialNumber: string;
  part: { name: string; sku: string };
};

type Spare = { partId: string; label: string; quantity: number };

export function RepairEquipment({
  workOrderId,
  siteId,
  replacementOnly = false,
  onDone,
}: {
  workOrderId: string;
  siteId?: string;
  replacementOnly?: boolean;
  onDone?: () => void;
}) {
  const [units, setUnits] = useState<SearchOption[]>([]);
  const [unitId, setUnitId] = useState('');
  const [unitLabel, setUnitLabel] = useState('');
  const [summary, setSummary] = useState('');
  const [partId, setPartId] = useState('');
  const [partLabel, setPartLabel] = useState('');
  const [partQty, setPartQty] = useState(1);
  const [spares, setSpares] = useState<Spare[]>([]);
  const [replace, setReplace] = useState(replacementOnly);
  const [newPartId, setNewPartId] = useState('');
  const [newPartLabel, setNewPartLabel] = useState('');
  const [newSerial, setNewSerial] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!siteId) return;
    void api<InstalledOption[]>(`/inventory/installed?siteId=${siteId}&status=INSTALLED`)
      .then((rows) =>
        setUnits(
          rows.map((row) => ({
            value: row.id,
            label: `${row.part.name} · n° ${row.serialNumber}`,
            meta: row.part.sku,
          })),
        ),
      )
      .catch(() => setUnits([]));
  }, [siteId]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api(`/inventory/work-orders/${workOrderId}/repair`, {
        method: 'POST',
        body: JSON.stringify({
          installedEquipmentId: unitId,
          summary: summary.trim(),
          parts: spares.map((line) => ({ partId: line.partId, quantity: line.quantity })),
          ...(replace
            ? { replacement: { partId: newPartId, serialNumber: newSerial.trim() } }
            : {}),
        }),
      });
      setUnitId('');
      setUnitLabel('');
      setSummary('');
      setSpares([]);
      setReplace(false);
      setNewPartId('');
      setNewPartLabel('');
      setNewSerial('');
      onDone?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Réparation impossible');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="form-stack" onSubmit={onSubmit}>
      {error ? <div className="error-box">{error}</div> : null}
      <SearchSelect
        label="Équipement du site"
        value={unitId}
        selectedLabel={unitLabel}
        placeholder={units.length ? 'Choisir l’appareil…' : 'Aucun appareil identifié sur ce site'}
        staticOptions={units}
        loadOptions={async (query) => {
          const needle = query.trim().toLowerCase();
          return units.filter((unit) => `${unit.label} ${unit.meta ?? ''}`.toLowerCase().includes(needle));
        }}
        onChange={(id, opt) => {
          setUnitId(id);
          setUnitLabel(opt?.label ?? '');
        }}
        disabled={!units.length}
      />
      <label className="field">
        <span>Ce qui a été réparé</span>
        <textarea
          className="input"
          rows={2}
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="Fuite, carte électronique, filtre…"
          required
          minLength={3}
        />
      </label>
      <div className="field">
        <span>Pièces prises dans le stock</span>
        <SearchSelect
          value={partId}
          selectedLabel={partLabel}
          placeholder="Rechercher une pièce…"
          loadOptions={searchParts}
          onChange={(id, opt) => {
            setPartId(id);
            setPartLabel(opt?.label ?? '');
          }}
        />
        <div className="row" style={{ marginTop: 8 }}>
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
              setSpares((prev) => [...prev, { partId, label: partLabel, quantity: partQty }]);
              setPartId('');
              setPartLabel('');
              setPartQty(1);
            }}
          >
            Ajouter
          </Button>
        </div>
        {spares.length ? (
          <ul className="field-notes">
            {spares.map((line) => (
              <li key={`${line.partId}-${line.label}`}>
                {line.quantity} × {line.label}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      {replacementOnly ? (
        <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>
          Un changement retire l’ancien numéro et identifie le nouvel appareil sur le site.
        </p>
      ) : (
        <label className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" checked={replace} onChange={(e) => setReplace(e.target.checked)} />
          <span>Remplacer l’appareil</span>
        </label>
      )}
      {replace ? (
        <>
          <SearchSelect
            label="Nouvel appareil"
            value={newPartId}
            selectedLabel={newPartLabel}
            placeholder="Rechercher dans le stock…"
            loadOptions={searchParts}
            onChange={(id, opt) => {
              setNewPartId(id);
              setNewPartLabel(opt?.label ?? '');
            }}
          />
          <label className="field">
            <span>Nouveau numéro de série</span>
            <input className="input" value={newSerial} onChange={(e) => setNewSerial(e.target.value)} required />
          </label>
        </>
      ) : null}
      <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>
        Les pièces et l’appareil de remplacement quittent le stock et partent sur la facture, au prix de vente.
      </p>
      <Button type="submit" disabled={busy || !unitId || (replace && (!newPartId || !newSerial.trim()))}>
        Enregistrer la réparation
      </Button>
    </form>
  );
}
