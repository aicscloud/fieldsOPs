import { api } from '@/lib/api';
import type { SearchOption } from '@/components/SearchSelect';

const TAKE = 10;

function qs(params: Record<string, string | undefined>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v != null && v !== '') sp.set(k, v);
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export async function searchCustomers(q: string): Promise<SearchOption[]> {
  const rows = await api<{ id: string; name: string }[]>(
    `/customers${qs({ q, take: String(TAKE) })}`,
  );
  return rows.map((c) => ({ value: c.id, label: c.name }));
}

export async function searchSites(
  q: string,
  customerId?: string,
): Promise<SearchOption[]> {
  const rows = await api<
    { id: string; name: string; address: string; city?: string | null }[]
  >(`/sites${qs({ q, take: String(TAKE), customerId })}`);
  return rows.map((s) => ({
    value: s.id,
    label: s.name,
    meta: `${s.address}${s.city ? `, ${s.city}` : ''}`,
  }));
}

export async function searchWorkers(q: string): Promise<SearchOption[]> {
  const rows = await api<
    { id: string; firstName: string; lastName: string; role: string }[]
  >(`/users${qs({ q, take: String(TAKE), role: 'FIELD_WORKER' })}`);
  return rows.map((w) => ({
    value: w.id,
    label: `${w.firstName} ${w.lastName}`,
  }));
}

export async function searchWorkOrders(q: string): Promise<SearchOption[]> {
  const rows = await api<{ id: string; number: string; title: string }[]>(
    `/work-orders${qs({ q, take: String(TAKE) })}`,
  );
  return rows.map((o) => ({
    value: o.id,
    label: o.number,
    meta: o.title,
  }));
}

export async function searchParts(q: string): Promise<SearchOption[]> {
  const rows = await api<
    {
      id: string;
      name: string;
      sku: string;
      quantity: number;
      unit: string;
      unitCost?: number | null;
    }[]
  >(`/inventory/parts${qs({ q, take: String(TAKE) })}`);
  return rows.map((p) => ({
    value: p.id,
    label: p.name,
    meta: `${p.sku} · ${(p.unitCost ?? 0).toFixed(2)} € · stock ${p.quantity} ${p.unit}`,
  }));
}

export async function searchWorkOrderTypes(q: string): Promise<SearchOption[]> {
  const rows = await api<{ id: string; name: string }[]>(
    `/work-order-types${qs({ q, take: String(TAKE) })}`,
  );
  return rows.map((t) => ({ value: t.id, label: t.name }));
}

export type AvailabilitySlot = {
  start: string;
  end: string;
};

export type AvailabilityResult = {
  day: string;
  durationMinutes: number;
  busy: { start: string; end: string; number: string; title: string }[];
  slots: AvailabilitySlot[];
};

export async function fetchAvailability(params: {
  workerId: string;
  date: string;
  durationMinutes?: number;
  excludeWorkOrderId?: string;
}) {
  return api<AvailabilityResult>(
    `/work-orders/availability${qs({
      workerId: params.workerId,
      date: params.date,
      durationMinutes: String(params.durationMinutes ?? 60),
      excludeId: params.excludeWorkOrderId,
    })}`,
  );
}
