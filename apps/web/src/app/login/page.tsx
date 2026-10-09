'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, getSession, saveSession, type AuthSession } from '@/lib/api';
import { Brand } from '@/components/Brand';
import { LanguageSwitch, useI18n } from '@/lib/i18n';
import { Button, Input, PasswordInput } from '@/components/ui';

export default function LoginPage() {
  const router = useRouter();
  const { m } = useI18n();
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
      setError(err instanceof Error ? err.message : m.auth.loginFail);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-layout">
      <section className="auth-form-side">
        <div className="auth-card">
          <div className="auth-top">
            <Brand />
            <LanguageSwitch />
          </div>
          <h1>{m.auth.loginTitle}</h1>
          <p>{m.auth.loginLead}</p>
          <form className="form-stack" onSubmit={onSubmit}>
            <Input
              label={m.auth.email}
              name="email"
              type="email"
              required
              placeholder={m.auth.emailPlaceholder}
              autoComplete="email"
            />
            <PasswordInput
              label={m.auth.password}
              name="password"
              required
              minLength={8}
              autoComplete="current-password"
            />
            {error ? <div className="error-box">{error}</div> : null}
            <Button type="submit" loading={loading} className="btn-lg">
              {m.auth.signIn}
            </Button>
          </form>
          <p className="muted" style={{ marginTop: 18 }}>
            {m.auth.noAccount} <Link href="/register">{m.auth.createOrg}</Link>
          </p>
        </div>
      </section>
      <aside className="auth-panel">
        <img
          src="/brand/dispatch.jpg"
          alt={m.auth.loginPhoto}
        />
        <p>{m.auth.loginCaption}</p>
      </aside>
    </main>
  );
}
