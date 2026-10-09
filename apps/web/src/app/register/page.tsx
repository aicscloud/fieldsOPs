'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, saveSession, type AuthSession } from '@/lib/api';
import { Brand } from '@/components/Brand';
import { LanguageSwitch, useI18n } from '@/lib/i18n';
import { Button, Input, PasswordInput, Select } from '@/components/ui';

export default function RegisterPage() {
  const router = useRouter();
  const { m } = useI18n();
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
      setError(err instanceof Error ? err.message : m.auth.registerFail);
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
          <h1>{m.auth.registerTitle}</h1>
          <p>{m.auth.registerLead}</p>
          <form className="form-stack" onSubmit={onSubmit}>
            <div className="row" style={{ alignItems: 'stretch' }}>
              <div style={{ flex: 1 }}>
                <Input label={m.auth.firstName} name="firstName" required />
              </div>
              <div style={{ flex: 1 }}>
                <Input label={m.auth.lastName} name="lastName" required />
              </div>
            </div>
            <Input label={m.auth.email} name="email" type="email" required />
            <PasswordInput label={m.auth.password} name="password" required minLength={8} />
            <Input label={m.auth.company} name="organizationName" required />
            <Select label={m.auth.country} name="country" defaultValue="CM">
              <option value="CM">Cameroun</option>
              <option value="FR">France</option>
              <option value="CI">Côte d&apos;Ivoire</option>
              <option value="SN">Sénégal</option>
              <option value="BE">Belgique</option>
            </Select>
            {error ? <div className="error-box">{error}</div> : null}
            <Button type="submit" loading={loading} className="btn-lg">
              {m.auth.createAccount}
            </Button>
          </form>
          <p className="muted" style={{ marginTop: 18 }}>
            {m.auth.hasAccount} <Link href="/login">{m.auth.signIn}</Link>
          </p>
        </div>
      </section>
      <aside className="auth-panel">
        <img
          src="/brand/technician.jpg"
          alt={m.auth.registerPhoto}
        />
        <p>{m.auth.registerCaption}</p>
      </aside>
    </main>
  );
}
