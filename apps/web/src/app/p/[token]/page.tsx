'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { StatusBadge } from '@/components/ui';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3010/api';

type PortalView = {
  organization: { name: string; phone?: string | null; email?: string | null };
  workOrder: {
    number: string;
    title: string;
    status: string;
    description?: string | null;
    customer?: { name: string };
    site?: { name: string; address: string; city?: string | null };
    type?: { name: string } | null;
    notes?: { body: string }[];
    photos?: { url: string; caption?: string | null }[];
    signature?: { signerName: string } | null;
    checklist?: { label: string; done: boolean }[];
  };
};

export default function PublicPortalPage() {
  const params = useParams<{ token: string }>();
  const [data, setData] = useState<PortalView | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/portal/public/${params.token}`)
      .then(async (res) => {
        if (!res.ok) throw new Error('Lien invalide ou expiré');
        return res.json();
      })
      .then(setData)
      .catch((err: Error) => setError(err.message));
  }, [params.token]);

  if (error) {
    return (
      <main className="auth-page">
        <div className="error-box">{error}</div>
      </main>
    );
  }

  if (!data) {
    return <main className="auth-page">Chargement du portail…</main>;
  }

  const wo = data.workOrder;

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: 24 }}>
      <div className="brand" style={{ marginBottom: 18 }}>
        <div className="brand-mark">FO</div>
        <div>
          {data.organization.name}
          <div className="muted" style={{ fontSize: '0.85rem' }}>
            Portail client FieldOps
          </div>
        </div>
      </div>

      <section className="card card-pad">
        <h1 style={{ marginTop: 0 }}>
          {wo.number} · {wo.title}
        </h1>
        <StatusBadge status={wo.status} />
        <div style={{ marginTop: 14, display: 'grid', gap: 10 }}>
          <div>
            <div className="muted">Client</div>
            <div>{wo.customer?.name}</div>
          </div>
          <div>
            <div className="muted">Lieu</div>
            <div>
              {[wo.site?.name, wo.site?.address, wo.site?.city].filter(Boolean).join(', ')}
            </div>
          </div>
          {wo.type ? (
            <div>
              <div className="muted">Catégorie</div>
              <div>{wo.type.name}</div>
            </div>
          ) : null}
          {wo.description ? (
            <div>
              <div className="muted">Description</div>
              <div>{wo.description}</div>
            </div>
          ) : null}
        </div>
      </section>

      {wo.checklist?.length ? (
        <section className="card card-pad" style={{ marginTop: 14 }}>
          <h2 className="card-title">Checklist</h2>
          {wo.checklist.map((item, i) => (
            <div key={i}>
              {item.done ? '✓' : '○'} {item.label}
            </div>
          ))}
        </section>
      ) : null}

      {wo.notes?.length ? (
        <section className="card card-pad" style={{ marginTop: 14 }}>
          <h2 className="card-title">Notes</h2>
          {wo.notes.map((n, i) => (
            <p key={i}>{n.body}</p>
          ))}
        </section>
      ) : null}

      {wo.signature ? (
        <section className="card card-pad success-box" style={{ marginTop: 14 }}>
          Signé par {wo.signature.signerName}
        </section>
      ) : null}

      <p className="muted" style={{ marginTop: 24, fontSize: '0.85rem' }}>
        Contact : {data.organization.email || data.organization.phone || ''}
      </p>
    </main>
  );
}
