'use client';

import Link from 'next/link';
import Image from 'next/image';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, getSession, saveSession, type AuthSession } from '@/lib/api';
import { Button, Input, PasswordInput } from '@/components/ui';

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (getSession()) {
      if (getSession()?.role === 'FIELD_WORKER') {
        router.replace('/field');
      } else {
        router.replace('/dashboard');
      }
    }
  }, [router]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    try {
      const data = await api<AuthSession>(
        '/auth/login',
        {
          method: 'POST',
          body: JSON.stringify({
            email: form.get('email'),
            password: form.get('password'),
          }),
        },
        false,
      );
      saveSession(data);
      router.push(data.role === 'FIELD_WORKER' ? '/field' : '/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connexion impossible');
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
          <h1>Connexion</h1>
          <p>Pilotez vos équipes terrain depuis un seul endroit.</p>
          <form className="form-stack" onSubmit={onSubmit}>
            <Input
              label="Email"
              name="email"
              type="email"
              required
              placeholder="vous@entreprise.com"
              autoComplete="email"
            />
            <PasswordInput
              label="Mot de passe"
              name="password"
              required
              minLength={8}
              autoComplete="current-password"
            />
            {error ? <div className="error-box">{error}</div> : null}
            <Button type="submit" loading={loading} className="btn-lg">
              Se connecter
            </Button>
          </form>
          <p className="muted" style={{ marginTop: 18 }}>
            Pas encore de compte ? <Link href="/register">Créer une organisation</Link>
          </p>
        </div>
      </section>
      <aside className="auth-panel" aria-hidden="true">
        <Image
          src="/auth/login.jpg"
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
