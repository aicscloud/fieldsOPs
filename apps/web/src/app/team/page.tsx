'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { SearchSelect } from '@/components/SearchSelect';
import { Button, EmptyState, Modal, PageLoading, StatusBadge } from '@/components/ui';
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

type Group = { id: string; name: string };

const ROLE_OPTIONS = [
  { value: 'FIELD_WORKER', label: 'Technicien' },
  { value: 'MANAGER', label: 'Responsable' },
  { value: 'OWNER', label: 'Propriétaire' },
];

const TEAM_OPTIONS = [
  { value: 'FIELD', label: 'Terrain' },
  { value: 'TRANSPORT', label: 'Transport' },
];

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Actif' },
  { value: 'INVITED', label: 'Invité' },
  { value: 'SUSPENDED', label: 'Suspendu' },
];

export default function TeamPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);
  const [role, setRole] = useState('FIELD_WORKER');
  const [team, setTeam] = useState('FIELD');
  const [status, setStatus] = useState('ACTIVE');
  const [groupId, setGroupId] = useState('');
  const [groupLabel, setGroupLabel] = useState('');
  const [q, setQ] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [teamFilter, setTeamFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [groupFilter, setGroupFilter] = useState('');

  const groupOptions = useMemo(
    () => groups.map((group) => ({ value: group.id, label: group.name })),
    [groups],
  );

  async function load() {
    setLoading(true);
    try {
      const [users, groupList] = await Promise.all([
        api<Member[]>('/users'),
        api<Group[]>('/groups'),
      ]);
      setMembers(users);
      setGroups(groupList);
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

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return members.filter((member) => {
      if (roleFilter && member.role !== roleFilter) return false;
      if (teamFilter && (member.team ?? 'FIELD') !== teamFilter) return false;
      if (statusFilter && member.status !== statusFilter) return false;
      if (groupFilter && member.group?.id !== groupFilter) return false;
      if (!needle) return true;
      const hay = `${member.firstName} ${member.lastName} ${member.email} ${member.phone ?? ''} ${member.group?.name ?? ''}`.toLowerCase();
      return hay.includes(needle);
    });
  }, [members, q, roleFilter, teamFilter, statusFilter, groupFilter]);

  function closeForm() {
    setShowForm(false);
    setEditing(null);
    setRole('FIELD_WORKER');
    setTeam('FIELD');
    setStatus('ACTIVE');
    setGroupId('');
    setGroupLabel('');
  }

  function openCreate() {
    setEditing(null);
    setRole('FIELD_WORKER');
    setTeam('FIELD');
    setStatus('ACTIVE');
    setGroupId('');
    setGroupLabel('');
    setShowForm(true);
  }

  function openEdit(member: Member) {
    setShowForm(false);
    setEditing(member);
    setRole(member.role);
    setTeam(member.team || 'FIELD');
    setStatus(member.status || 'ACTIVE');
    setGroupId(member.group?.id ?? '');
    setGroupLabel(member.group?.name ?? '');
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = {
      firstName: form.get('firstName'),
      lastName: form.get('lastName'),
      phone: form.get('phone') || undefined,
      role,
      team,
      groupId: editing ? groupId || null : groupId || undefined,
    };
    try {
      if (editing) {
        await api(`/users/${editing.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ ...payload, status }),
        });
      } else {
        const created = await api<Member & { temporaryPassword?: string }>('/users', {
          method: 'POST',
          body: JSON.stringify({
            ...payload,
            email: form.get('email'),
          }),
        });
        setTempPassword(created.temporaryPassword ?? null);
      }
      closeForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enregistrement impossible');
    }
  }

  const formOpen = showForm || !!editing;

  return (
    <AppShell
      title="Techniciens"
      actions={<Button onClick={openCreate}>Nouveau technicien</Button>}
    >
      {error ? <div className="error-box" style={{ marginBottom: 12 }}>{error}</div> : null}
      {tempPassword ? (
        <div className="error-box" style={{ marginBottom: 12, borderColor: 'var(--success)' }}>
          Mot de passe temporaire : <strong>{tempPassword}</strong>
        </div>
      ) : null}

      <Modal
        open={formOpen}
        title={editing ? 'Modifier le technicien' : 'Nouveau technicien'}
        onClose={closeForm}
      >
        <form className="form-stack" key={editing?.id ?? 'new'} onSubmit={onSubmit}>
          <div className="row">
            <label className="field" style={{ flex: 1 }}>
              <span>Prénom</span>
              <input className="input" name="firstName" required defaultValue={editing?.firstName} />
            </label>
            <label className="field" style={{ flex: 1 }}>
              <span>Nom</span>
              <input className="input" name="lastName" required defaultValue={editing?.lastName} />
            </label>
          </div>
          <label className="field">
            <span>Email</span>
            <input
              className="input"
              name="email"
              type="email"
              required={!editing}
              defaultValue={editing?.email}
              disabled={!!editing}
            />
          </label>
          <label className="field">
            <span>Téléphone</span>
            <input className="input" name="phone" defaultValue={editing?.phone ?? ''} />
          </label>
          <SearchSelect
            label="Rôle"
            value={role}
            selectedLabel={ROLE_OPTIONS.find((r) => r.value === role)?.label}
            staticOptions={ROLE_OPTIONS}
            loadOptions={async () => ROLE_OPTIONS}
            onChange={setRole}
            allowClear={false}
            required
          />
          <SearchSelect
            label="Équipe"
            value={team}
            selectedLabel={TEAM_OPTIONS.find((t) => t.value === team)?.label}
            staticOptions={TEAM_OPTIONS}
            loadOptions={async () => TEAM_OPTIONS}
            onChange={setTeam}
            allowClear={false}
          />
          {editing ? (
            <SearchSelect
              label="Statut"
              value={status}
              selectedLabel={STATUS_OPTIONS.find((s) => s.value === status)?.label}
              staticOptions={STATUS_OPTIONS}
              loadOptions={async () => STATUS_OPTIONS}
              onChange={setStatus}
              allowClear={false}
            />
          ) : null}
          <SearchSelect
            label="Groupe"
            value={groupId}
            selectedLabel={groupLabel}
            placeholder="Aucun groupe"
            staticOptions={groupOptions}
            loadOptions={async () => groupOptions}
            onChange={(id, option) => {
              setGroupId(id);
              setGroupLabel(option?.label ?? '');
            }}
            allowClear
          />
          <Button type="submit">{editing ? 'Enregistrer' : 'Créer le compte'}</Button>
        </form>
      </Modal>

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
          value={roleFilter}
          selectedLabel={ROLE_OPTIONS.find((o) => o.value === roleFilter)?.label}
          placeholder="Rôle"
          staticOptions={ROLE_OPTIONS}
          loadOptions={async () => ROLE_OPTIONS}
          onChange={setRoleFilter}
          allowClear
        />
        <SearchSelect
          compact
          value={teamFilter}
          selectedLabel={TEAM_OPTIONS.find((o) => o.value === teamFilter)?.label}
          placeholder="Équipe"
          staticOptions={TEAM_OPTIONS}
          loadOptions={async () => TEAM_OPTIONS}
          onChange={setTeamFilter}
          allowClear
        />
        <SearchSelect
          compact
          value={statusFilter}
          selectedLabel={STATUS_OPTIONS.find((o) => o.value === statusFilter)?.label}
          placeholder="Statut"
          staticOptions={STATUS_OPTIONS}
          loadOptions={async () => STATUS_OPTIONS}
          onChange={setStatusFilter}
          allowClear
        />
        <SearchSelect
          compact
          value={groupFilter}
          selectedLabel={groupOptions.find((o) => o.value === groupFilter)?.label}
          placeholder="Groupe"
          staticOptions={groupOptions}
          loadOptions={async () => groupOptions}
          onChange={setGroupFilter}
          allowClear
        />
      </div>

      <div style={{ marginTop: 14 }}>
        {loading ? (
          <PageLoading height={84} rows={4} />
        ) : filtered.length ? (
          <div className="people-grid">
            {filtered.map((member) => (
              <div key={member.id} className="person-card">
                <div style={{ flex: 1 }}>
                  <strong>{member.firstName} {member.lastName}</strong>
                  <div className="muted">{member.email}</div>
                  <div className="muted">
                    {member.role} · {member.team || 'FIELD'}
                    {member.group ? ` · ${member.group.name}` : ''}
                  </div>
                </div>
                <div className="row" style={{ alignItems: 'center' }}>
                  {member.status ? <StatusBadge status={member.status} /> : null}
                  <Button type="button" variant="secondary" size="sm" onClick={() => openEdit(member)}>
                    Modifier
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="Aucun technicien" />
        )}
      </div>
    </AppShell>
  );
}
