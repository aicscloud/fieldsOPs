'use client';

import Link from 'next/link';
import Image from 'next/image';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, saveSession, type AuthSession } from '@/lib/api';
import { Button, Input, PasswordInput, Select } from '@/components/ui';

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    try {
      const data = await api<AuthSession>(
        '/auth/register',
        {
          method: 'POST',
          body: JSON.stringify({
            firstName: form.get('firstName'),
            lastName: form.get('lastName'),
            email: form.get('email'),
            password: form.get('password'),
            organizationName: form.get('organizationName'),
            country: form.get('country'),
          }),
        },
        false,
      );
      saveSession(data);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Inscription impossible');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-layout">
      <section className="auth-form-side">
        <div className="auth-card">
          <div className="brand">
            <div className="brand-mark">FO</div>
            <div>
              Field<span>Ops</span>
            </div>
          </div>
          <h1>Créer votre organisation</h1>
          <p>Multi-tenant, prêt pour vos équipes mobiles.</p>
          <form className="form-stack" onSubmit={onSubmit}>
            <div className="row" style={{ alignItems: 'stretch' }}>
              <div style={{ flex: 1 }}>
                <Input label="Prénom" name="firstName" required />
              </div>
              <div style={{ flex: 1 }}>
                <Input label="Nom" name="lastName" required />
              </div>
            </div>
            <Input label="Email" name="email" type="email" required />
            <PasswordInput label="Mot de passe" name="password" required minLength={8} />
            <Input label="Entreprise" name="organizationName" required />
            <Select label="Pays" name="country" defaultValue="CM">
              <option value="CM">Cameroun</option>
              <option value="FR">France</option>
              <option value="CI">Côte d&apos;Ivoire</option>
              <option value="SN">Sénégal</option>
              <option value="BE">Belgique</option>
            </Select>
            {error ? <div className="error-box">{error}</div> : null}
            <Button type="submit" loading={loading} className="btn-lg">
              Créer mon compte
            </Button>
          </form>
          <p className="muted" style={{ marginTop: 18 }}>
            Déjà inscrit ? <Link href="/login">Se connecter</Link>
          </p>
        </div>
      </section>
      <aside className="auth-panel" aria-hidden="true">
        <Image
          src="/auth/register.jpg"
          alt=""
          fill
          priority
          className="auth-panel-image"
          sizes="50vw"
        />
        <div className="auth-panel-overlay" />
      </aside>
    </main>
  );
}
