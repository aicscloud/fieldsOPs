'use client';

import { FormEvent, useState } from 'react';
import { SearchSelect } from '@/components/SearchSelect';
import { Button } from '@/components/ui';
import { api } from '@/lib/api';
import { searchParts, searchSites } from '@/lib/search';

export function InstallEquipment({
  workOrderId,
  onDone,
}: {
  workOrderId?: string;
  onDone?: () => void;
}) {
  const [partId, setPartId] = useState('');
  const [partLabel, setPartLabel] = useState('');
  const [siteId, setSiteId] = useState('');
  const [siteLabel, setSiteLabel] = useState('');
  const [serial, setSerial] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const path = workOrderId
        ? `/inventory/work-orders/${workOrderId}/install`
        : '/inventory/install';
      await api(path, {
        method: 'POST',
        body: JSON.stringify({
          partId,
          serialNumber: serial.trim(),
          notes: notes.trim() || undefined,
          ...(workOrderId ? {} : { siteId }),
        }),
      });
      setPartId('');
      setPartLabel('');
      setSiteId('');
      setSiteLabel('');
      setSerial('');
      setNotes('');
      onDone?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Installation impossible');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="form-stack" onSubmit={onSubmit}>
      {error ? <div className="error-box">{error}</div> : null}
      <SearchSelect
        label="Équipement en stock"
        value={partId}
        selectedLabel={partLabel}
        placeholder="Rechercher…"
        loadOptions={searchParts}
        onChange={(id, opt) => {
          setPartId(id);
          setPartLabel(opt?.label ?? '');
        }}
      />
      {workOrderId ? null : (
        <SearchSelect
          label="Site du client"
          value={siteId}
          selectedLabel={siteLabel}
          placeholder="Rechercher un site…"
          loadOptions={searchSites}
          onChange={(id, opt) => {
            setSiteId(id);
            setSiteLabel(opt?.label ?? '');
          }}
        />
      )}
      <label className="field">
        <span>Numéro de série</span>
        <input
          className="input"
          value={serial}
          onChange={(e) => setSerial(e.target.value)}
          placeholder="Ex. SN-2026-0142"
          required
        />
      </label>
      <label className="field">
        <span>Note</span>
        <input
          className="input"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Emplacement, local, étage…"
        />
      </label>
      <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>
        Une unité quitte le stock et reste identifiée chez ce client
        {workOrderId ? '. Elle sera reprise sur la facture de l’intervention, au prix de vente.' : '.'}
      </p>
      <Button type="submit" disabled={busy || !partId || (!workOrderId && !siteId)}>
        Installer
      </Button>
    </form>
  );
}
