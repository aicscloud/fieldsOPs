'use client';

import { useEffect, useMemo, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { DataTable } from '@/components/DataTable';
import { EmptyState, PageLoading } from '@/components/ui';
import { api } from '@/lib/api';

type Member = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  role: string;
  team?: string | null;
  status?: string;
  group?: { id: string; name: string } | null;
};

const ROLES: Record<string, string> = {
  OWNER: 'Propriétaire',
  MANAGER: 'Responsable',
  FIELD_WORKER: 'Technicien',
};

const TEAMS: Record<string, string> = {
  FIELD: 'Terrain',
  TRANSPORT: 'Transport',
};

const STATUSES: Record<string, string> = {
  ACTIVE: 'Actif',
  INVITED: 'Invité',
  SUSPENDED: 'Suspendu',
};

export default function AdminPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');

  useEffect(() => {
    api<Member[]>('/users')
      .then((rows) => {
        setMembers(rows);
        setError(null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Erreur'))
      .finally(() => setLoading(false));
  }, []);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return members;
    return members.filter((member) =>
      [member.firstName, member.lastName, member.email, member.phone, member.group?.name]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(needle),
    );
  }, [members, q]);

  return (
    <AppShell title="Administration">
      <p className="muted" style={{ marginTop: 0 }}>
        {members.length} compte{members.length > 1 ? 's' : ''}
      </p>
      <input
        className="input"
        placeholder="Nom, e-mail, téléphone…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        aria-label="Rechercher un utilisateur"
        style={{ maxWidth: 320, marginBottom: 14 }}
      />
      {error ? <div className="error-box">{error}</div> : null}
      {loading ? (
        <PageLoading height={48} rows={6} />
      ) : rows.length ? (
        <DataTable
          rows={rows}
          rowKey={(row) => row.id}
          pageSize={20}
          columns={[
            {
              key: 'name',
              header: 'Nom',
              sortable: true,
              sortValue: (row) => `${row.lastName} ${row.firstName}`,
              render: (row) => (
                <strong>
                  {row.firstName} {row.lastName}
                </strong>
              ),
            },
            {
              key: 'email',
              header: 'E-mail',
              sortable: true,
              sortValue: (row) => row.email,
              render: (row) => row.email,
            },
            {
              key: 'phone',
              header: 'Téléphone',
              render: (row) => row.phone || '—',
            },
            {
              key: 'role',
              header: 'Rôle',
              sortable: true,
              sortValue: (row) => row.role,
              render: (row) => ROLES[row.role] ?? row.role,
            },
            {
              key: 'team',
              header: 'Équipe',
              render: (row) => TEAMS[row.team || ''] ?? row.team ?? '—',
            },
            {
              key: 'group',
              header: 'Groupe',
              sortable: true,
              sortValue: (row) => row.group?.name ?? '',
              render: (row) => row.group?.name || '—',
            },
            {
              key: 'status',
              header: 'Statut',
              sortable: true,
              sortValue: (row) => row.status ?? '',
              render: (row) => STATUSES[row.status || ''] ?? row.status ?? '—',
            },
          ]}
        />
      ) : (
        <EmptyState title="Aucun utilisateur" />
      )}
    </AppShell>
  );
}
