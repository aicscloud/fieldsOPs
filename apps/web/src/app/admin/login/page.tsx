'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Brand } from '@/components/Brand';
import { Button, Input, PasswordInput } from '@/components/ui';
import { api, getSession, saveSession, type AuthSession } from '@/lib/api';

export default function PlatformLoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (getSession()?.role === 'PLATFORM_ADMIN') router.replace('/admin');
  }, [router]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    try {
      const data = await api<AuthSession>(
        '/auth/platform-login',
        {
          method: 'POST',
          body: JSON.stringify({
            email: form.get('email'),
            password: form.get('password'),
          }),
        },
        false,
      );
      if (data.role !== 'PLATFORM_ADMIN') {
        setError('Ce compte n’est pas un administrateur de la plateforme.');
        return;
      }
      saveSession(data);
      router.push('/admin');
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
          <Brand />
          <h1>Administration</h1>
          <p>Espace réservé à la gestion de la plateforme.</p>
          <form className="form-stack" onSubmit={onSubmit}>
            <Input label="E-mail" name="email" type="email" required autoComplete="username" />
            <PasswordInput label="Mot de passe" name="password" required minLength={8} autoComplete="current-password" />
            {error ? <div className="error-box">{error}</div> : null}
            <Button type="submit" loading={loading} className="btn-lg">
              Entrer
            </Button>
          </form>
          <p className="muted" style={{ marginTop: 18 }}>
            <Link href="/login">Retour à la connexion</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
