'use client';

import { FormEvent, useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { SearchSelect } from '@/components/SearchSelect';
import { Button, EmptyState, Modal, PageLoading } from '@/components/ui';
import { api } from '@/lib/api';

type Person = {
  id: string;
  firstName: string;
  lastName: string;
};

type Group = {
  id: string;
  name: string;
  members: Person[];
};

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [renaming, setRenaming] = useState<Group | null>(null);
  const [addingTo, setAddingTo] = useState<Group | null>(null);
  const [memberId, setMemberId] = useState('');
  const [memberLabel, setMemberLabel] = useState('');

  async function load() {
    setLoading(true);
    try {
      setGroups(await api<Group[]>('/groups'));
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

  async function createGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await api('/groups', {
        method: 'POST',
        body: JSON.stringify({ name: form.get('name') }),
      });
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Création impossible');
    }
  }

  async function renameGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!renaming) return;
    const form = new FormData(event.currentTarget);
    try {
      await api(`/groups/${renaming.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: form.get('name') }),
      });
      setRenaming(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Modification impossible');
    }
  }

  async function removeGroup(group: Group) {
    if (!window.confirm(`Supprimer le groupe ${group.name} ?`)) return;
    try {
      await api(`/groups/${group.id}`, { method: 'DELETE' });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Suppression impossible');
    }
  }

  async function addMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!addingTo || !memberId) return;
    try {
      await api(`/groups/${addingTo.id}/members`, {
        method: 'POST',
        body: JSON.stringify({ userId: memberId }),
      });
      setAddingTo(null);
      setMemberId('');
      setMemberLabel('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ajout impossible');
    }
  }

  async function removeMember(group: Group, person: Person) {
    try {
      await api(`/groups/${group.id}/members/${person.id}`, { method: 'DELETE' });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Retrait impossible');
    }
  }

  return (
    <AppShell
      title="Groupes"
      actions={<Button onClick={() => setShowForm(true)}>Nouveau groupe</Button>}
    >
      {error ? <div className="error-box" style={{ marginBottom: 12 }}>{error}</div> : null}

      <Modal open={showForm} title="Nouveau groupe" onClose={() => setShowForm(false)}>
        <form className="form-stack" onSubmit={createGroup}>
          <label className="field">
            <span>Nom</span>
            <input className="input" name="name" required maxLength={80} placeholder="Équipe nord" />
          </label>
          <Button type="submit">Créer</Button>
        </form>
      </Modal>

      <Modal
        open={!!addingTo}
        title={addingTo ? `Ajouter à ${addingTo.name}` : ''}
        onClose={() => setAddingTo(null)}
      >
        <form className="form-stack" onSubmit={addMember}>
          <SearchSelect
            label="Technicien"
            value={memberId}
            selectedLabel={memberLabel}
            placeholder="Rechercher…"
            loadOptions={async (query) => {
              const people = await api<Person[]>(
                `/users?q=${encodeURIComponent(query)}&take=10`,
              );
              const taken = new Set(addingTo?.members.map((member) => member.id));
              return people
                .filter((person) => !taken.has(person.id))
                .map((person) => ({
                  value: person.id,
                  label: `${person.firstName} ${person.lastName}`,
                }));
            }}
            onChange={(id, option) => {
              setMemberId(id);
              setMemberLabel(option?.label ?? '');
            }}
            required
          />
          <Button type="submit" disabled={!memberId}>Ajouter</Button>
        </form>
      </Modal>

      <Modal
        open={!!renaming}
        title="Renommer le groupe"
        onClose={() => setRenaming(null)}
      >
        <form className="form-stack" key={renaming?.id ?? 'rename'} onSubmit={renameGroup}>
          <label className="field">
            <span>Nom</span>
            <input className="input" name="name" required maxLength={80} defaultValue={renaming?.name} />
          </label>
          <Button type="submit">Enregistrer</Button>
        </form>
      </Modal>

      <div style={{ marginTop: 14 }}>
        {loading ? (
          <PageLoading height={120} rows={3} />
        ) : groups.length ? (
          <div className="people-grid">
            {groups.map((group) => (
              <article key={group.id} className="card group-card">
                <div className="group-card-head">
                  <strong>{group.name}</strong>
                  <span className="muted">{group.members.length}</span>
                </div>
                {group.members.length ? (
                  <div className="group-members">
                    {group.members.map((member) => (
                      <span key={member.id} className="group-member">
                        {member.firstName} {member.lastName}
                        <button
                          type="button"
                          aria-label={`Retirer ${member.firstName} ${member.lastName}`}
                          onClick={() => void removeMember(group, member)}
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="muted">Aucun membre</div>
                )}
                <div className="group-card-actions">
                  <Button type="button" variant="secondary" size="sm" onClick={() => setRenaming(group)}>
                    Modifier
                  </Button>
                  <Button type="button" variant="secondary" size="sm" onClick={() => setAddingTo(group)}>
                    Ajouter
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => void removeGroup(group)}>
                    Supprimer
                  </Button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            title="Aucun groupe"
            description="Créez un groupe pour organiser les techniciens."
          />
        )}
      </div>
    </AppShell>
  );
}
