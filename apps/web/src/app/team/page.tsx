'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { SearchSelect } from '@/components/SearchSelect';
import { Avatar, Button, EmptyState, Modal, Skeleton, StatusBadge } from '@/components/ui';
import { api } from '@/lib/api';

const ROLE_OPTIONS = [
  { value: 'FIELD_WORKER', label: 'Technicien' },
  { value: 'MANAGER', label: 'Dispatcher' },
  { value: 'OWNER', label: 'Responsable' },
];

const TEAM_OPTIONS = [
  { value: 'FIELD', label: 'Terrain' },
  { value: 'TRANSPORT', label: 'Transport' },
];

type GroupRef = { id: string; name: string };

type Member = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  team?: string;
  group?: GroupRef | null;
  status: string;
  temporaryPassword?: string;
};

function roleLabel(role: string) {
  return ROLE_OPTIONS.find((option) => option.value === role)?.label ?? role;
}

export default function TeamPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [groups, setGroups] = useState<GroupRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [role, setRole] = useState('FIELD_WORKER');
  const [team, setTeam] = useState('FIELD');
  const [groupId, setGroupId] = useState('');
  const [groupLabel, setGroupLabel] = useState('');

  async function load() {
    setLoading(true);
    try {
      const [people, teamGroups] = await Promise.all([
        api<Member[]>('/users'),
        api<GroupRef[]>('/groups'),
      ]);
      setMembers(people);
      setGroups(teamGroups);
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

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const created = await api<Member>('/users', {
        method: 'POST',
        body: JSON.stringify({
          firstName: form.get('firstName'),
          lastName: form.get('lastName'),
          email: form.get('email'),
          phone: form.get('phone') || undefined,
          role,
          team,
          groupId: groupId || undefined,
          password: form.get('password') || undefined,
        }),
      });
      setTempPassword(created.temporaryPassword ?? null);
      setShowForm(false);
      setGroupId('');
      setGroupLabel('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Création impossible');
    }
  }

  return (
    <AppShell
      title="Techniciens"
      actions={
        <Button onClick={() => setShowForm(true)}>Ajouter</Button>
      }
    >
      {error ? <div className="error-box" style={{ marginBottom: 12 }}>{error}</div> : null}
      {tempPassword ? (
        <div className="success-box" style={{ marginBottom: 12 }}>
          Mot de passe temporaire : {tempPassword}
        </div>
      ) : null}

      <Modal
        open={showForm}
        title="Nouveau technicien"
        onClose={() => setShowForm(false)}
      >
        <form className="form-stack" onSubmit={onSubmit}>
          <div className="row">
            <label className="field" style={{ flex: 1 }}>
              <span>Prénom</span>
              <input className="input" name="firstName" required />
            </label>
            <label className="field" style={{ flex: 1 }}>
              <span>Nom</span>
              <input className="input" name="lastName" required />
            </label>
          </div>
          <label className="field">
            <span>Email</span>
            <input className="input" name="email" type="email" required />
          </label>
          <SearchSelect
            label="Rôle"
            value={role}
            selectedLabel={ROLE_OPTIONS.find((item) => item.value === role)?.label}
            staticOptions={ROLE_OPTIONS}
            loadOptions={async () => ROLE_OPTIONS}
            onChange={setRole}
            allowClear={false}
            required
          />
          <SearchSelect
            label="Activité"
            value={team}
            selectedLabel={TEAM_OPTIONS.find((item) => item.value === team)?.label}
            staticOptions={TEAM_OPTIONS}
            loadOptions={async () => TEAM_OPTIONS}
            onChange={setTeam}
            allowClear={false}
            required
          />
          <SearchSelect
            label="Groupe"
            value={groupId}
            selectedLabel={groupLabel}
            placeholder="Aucun groupe"
            staticOptions={groups.map((group) => ({ value: group.id, label: group.name }))}
            loadOptions={async () =>
              groups.map((group) => ({ value: group.id, label: group.name }))
            }
            onChange={(id, option) => {
              setGroupId(id);
              setGroupLabel(option?.label ?? '');
            }}
          />
          <label className="field">
            <span>Mot de passe (optionnel)</span>
            <input className="input" name="password" type="password" minLength={8} />
          </label>
          <Button type="submit">Créer</Button>
        </form>
      </Modal>

      <div style={{ marginTop: 14 }}>
        {loading ? (
          <div className="people-grid">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} height={84} />
            ))}
          </div>
        ) : members.length ? (
          <div className="people-grid">
            {members.map((member) => (
              <article key={member.id} className="card person-card">
                <Avatar name={`${member.firstName} ${member.lastName}`} />
                <div className="person-card-body">
                  <strong>
                    {member.firstName} {member.lastName}
                  </strong>
                  <div className="muted">
                    {roleLabel(member.role)}
                    {member.team === 'TRANSPORT' ? ' · Transport' : ''}
                    {member.group ? ` · ${member.group.name}` : ''}
                  </div>
                </div>
                <StatusBadge status={member.status} />
              </article>
            ))}
          </div>
        ) : (
          <EmptyState title="Aucun technicien" />
        )}
      </div>
    </AppShell>
  );
}
