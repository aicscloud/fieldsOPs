'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  Building2,
  Clock3,
  Globe2,
  Palette,
  Receipt,
} from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { SearchSelect } from '@/components/SearchSelect';
import { Button, Skeleton, Toast } from '@/components/ui';
import { api, getSession, saveSession } from '@/lib/api';
import { applyOrgBranding } from '@/lib/branding';

type Org = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  country: string;
  currency: string;
  timezone: string;
  language: string;
  theme: string;
  primaryColor: string;
  workdayStart: number;
  workdayEnd: number;
  weekStartsOn: number;
  defaultTaxRate: number;
  laborHourlyRate: number;
};

type Section = 'identity' | 'regional' | 'appearance' | 'operations' | 'billing';

const SECTIONS: { key: Section; label: string; icon: typeof Building2 }[] = [
  { key: 'identity', label: 'Identité', icon: Building2 },
  { key: 'regional', label: 'Régional', icon: Globe2 },
  { key: 'appearance', label: 'Apparence', icon: Palette },
  { key: 'operations', label: 'Opérations', icon: Clock3 },
  { key: 'billing', label: 'Facturation', icon: Receipt },
];

const CURRENCY_OPTIONS = [
  { value: 'EUR', label: 'Euro (EUR)' },
  { value: 'USD', label: 'Dollar (USD)' },
  { value: 'GBP', label: 'Livre (GBP)' },
  { value: 'MAD', label: 'Dirham (MAD)' },
  { value: 'XOF', label: 'Franc CFA (XOF)' },
];

const TZ_OPTIONS = [
  { value: 'Europe/Paris', label: 'Europe/Paris' },
  { value: 'Europe/London', label: 'Europe/London' },
  { value: 'Europe/Brussels', label: 'Europe/Brussels' },
  { value: 'Africa/Casablanca', label: 'Africa/Casablanca' },
  { value: 'Africa/Abidjan', label: 'Africa/Abidjan' },
  { value: 'America/New_York', label: 'America/New_York' },
];

const LANG_OPTIONS = [
  { value: 'fr', label: 'Français' },
  { value: 'en', label: 'English' },
];

const THEME_OPTIONS = [
  { value: 'light', label: 'Clair' },
  { value: 'dark', label: 'Sombre' },
  { value: 'system', label: 'Système' },
];

const WEEK_OPTIONS = [
  { value: '1', label: 'Lundi' },
  { value: '0', label: 'Dimanche' },
  { value: '6', label: 'Samedi' },
];

const COLOR_PRESETS = [
  '#5b4fcf',
  '#2563eb',
  '#0f9aa8',
  '#2f9e6b',
  '#c9891a',
  '#d64545',
  '#0f172a',
  '#7c3aed',
];

export default function SettingsPage() {
  const [org, setOrg] = useState<Org | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [section, setSection] = useState<Section>('identity');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('FR');
  const [currency, setCurrency] = useState('EUR');
  const [timezone, setTimezone] = useState('Europe/Paris');
  const [language, setLanguage] = useState('fr');
  const [theme, setTheme] = useState('light');
  const [primaryColor, setPrimaryColor] = useState('#5b4fcf');
  const [workdayStart, setWorkdayStart] = useState(7);
  const [workdayEnd, setWorkdayEnd] = useState(19);
  const [weekStartsOn, setWeekStartsOn] = useState('1');
  const [defaultTaxRate, setDefaultTaxRate] = useState(20);
  const [laborHourlyRate, setLaborHourlyRate] = useState(0);

  function hydrate(o: Org) {
    setOrg(o);
    setName(o.name);
    setEmail(o.email ?? '');
    setPhone(o.phone ?? '');
    setAddress(o.address ?? '');
    setCity(o.city ?? '');
    setCountry(o.country || 'FR');
    setCurrency(o.currency || 'EUR');
    setTimezone(o.timezone || 'Europe/Paris');
    setLanguage(o.language || 'fr');
    setTheme(o.theme || 'light');
    setPrimaryColor(o.primaryColor || '#5b4fcf');
    setWorkdayStart(o.workdayStart ?? 7);
    setWorkdayEnd(o.workdayEnd ?? 19);
    setWeekStartsOn(String(o.weekStartsOn ?? 1));
    setDefaultTaxRate(o.defaultTaxRate ?? 20);
    setLaborHourlyRate(o.laborHourlyRate ?? 0);
    applyOrgBranding(o);
  }

  useEffect(() => {
    api<Org>('/organizations/me')
      .then((o) => {
        hydrate(o);
        setError(null);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    applyOrgBranding({ theme, primaryColor });
  }, [theme, primaryColor]);

  const previewLabel = useMemo(
    () => THEME_OPTIONS.find((t) => t.value === theme)?.label ?? theme,
    [theme],
  );

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!org) return;
    if (workdayEnd <= workdayStart) {
      setError('L’heure de fin doit être après l’heure de début');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const updated = await api<Org>('/organizations/me', {
        method: 'PATCH',
        body: JSON.stringify({
          name,
          email: email || undefined,
          phone: phone || undefined,
          address: address || undefined,
          city: city || undefined,
          country: country.toUpperCase(),
          currency,
          timezone,
          language,
          theme,
          primaryColor,
          workdayStart,
          workdayEnd,
          weekStartsOn: Number(weekStartsOn),
          defaultTaxRate,
          laborHourlyRate,
        }),
      });
      hydrate(updated);
      const session = getSession();
      if (session) {
        saveSession({
          ...session,
          organization: {
            ...session.organization,
            name: updated.name,
            country: updated.country,
            currency: updated.currency,
            timezone: updated.timezone,
            language: updated.language,
          },
        });
      }
      setToast('Paramètres organisation enregistrés');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enregistrement impossible');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell
      title="Paramètres"
      actions={
        !loading && org ? (
          <Button form="org-settings-form" type="submit" disabled={saving}>
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        ) : undefined
      }
    >
      <Toast message={toast} onClose={() => setToast(null)} />
      {error ? <div className="error-box" style={{ marginBottom: 12 }}>{error}</div> : null}

      {loading || !org ? (
        <Skeleton height={360} />
      ) : (
        <form id="org-settings-form" className="settings-layout" onSubmit={onSubmit}>
          <aside className="settings-nav" aria-label="Sections paramètres">
            {SECTIONS.map((s) => {
              const Icon = s.icon;
              return (
                <button
                  key={s.key}
                  type="button"
                  className={`settings-nav-item ${section === s.key ? 'is-active' : ''}`}
                  onClick={() => setSection(s.key)}
                >
                  <Icon size={16} />
                  {s.label}
                </button>
              );
            })}
          </aside>

          <div className="settings-main">
            {section === 'identity' ? (
              <section className="settings-card">
                <header className="settings-card-head">
                  <h2>Identité</h2>
                  <p>Nom et coordonnées visibles sur factures et documents.</p>
                </header>
                <div className="settings-grid-2">
                  <label className="field">
                    <span>Nom de l’organisation</span>
                    <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
                  </label>
                  <label className="field">
                    <span>Pays (ISO)</span>
                    <input
                      className="input"
                      value={country}
                      onChange={(e) => setCountry(e.target.value.toUpperCase())}
                      maxLength={2}
                      required
                    />
                  </label>
                  <label className="field">
                    <span>Email</span>
                    <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                  </label>
                  <label className="field">
                    <span>Téléphone</span>
                    <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} />
                  </label>
                  <label className="field settings-span-2">
                    <span>Adresse</span>
                    <input className="input" value={address} onChange={(e) => setAddress(e.target.value)} />
                  </label>
                  <label className="field">
                    <span>Ville</span>
                    <input className="input" value={city} onChange={(e) => setCity(e.target.value)} />
                  </label>
                </div>
              </section>
            ) : null}

            {section === 'regional' ? (
              <section className="settings-card">
                <header className="settings-card-head">
                  <h2>Régional</h2>
                  <p>Langue, devise et fuseau pour toute l’organisation.</p>
                </header>
                <div className="settings-grid-2">
                  <SearchSelect
                    label="Langue"
                    value={language}
                    selectedLabel={LANG_OPTIONS.find((l) => l.value === language)?.label}
                    staticOptions={LANG_OPTIONS}
                    loadOptions={async () => LANG_OPTIONS}
                    onChange={setLanguage}
                    allowClear={false}
                    required
                  />
                  <SearchSelect
                    label="Devise"
                    value={currency}
                    selectedLabel={CURRENCY_OPTIONS.find((c) => c.value === currency)?.label}
                    staticOptions={CURRENCY_OPTIONS}
                    loadOptions={async () => CURRENCY_OPTIONS}
                    onChange={setCurrency}
                    allowClear={false}
                    required
                  />
                  <div className="settings-span-2">
                    <SearchSelect
                      label="Fuseau horaire"
                      value={timezone}
                      selectedLabel={TZ_OPTIONS.find((t) => t.value === timezone)?.label ?? timezone}
                      staticOptions={TZ_OPTIONS}
                      loadOptions={async () => TZ_OPTIONS}
                      onChange={setTimezone}
                      allowClear={false}
                      required
                    />
                  </div>
                </div>
              </section>
            ) : null}

            {section === 'appearance' ? (
              <section className="settings-card">
                <header className="settings-card-head">
                  <h2>Apparence</h2>
                  <p>Thème et couleur de marque appliqués à toute l’app.</p>
                </header>
                <div className="settings-grid-2">
                  <SearchSelect
                    label="Thème"
                    value={theme}
                    selectedLabel={previewLabel}
                    staticOptions={THEME_OPTIONS}
                    loadOptions={async () => THEME_OPTIONS}
                    onChange={setTheme}
                    allowClear={false}
                    required
                  />
                  <label className="field">
                    <span>Couleur principale</span>
                    <div className="settings-color-row">
                      <input
                        className="settings-color-picker"
                        type="color"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                      />
                      <input
                        className="input"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        pattern="^#[0-9A-Fa-f]{6}$"
                        required
                      />
                    </div>
                  </label>
                </div>
                <div className="settings-presets">
                  {COLOR_PRESETS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={`settings-swatch ${primaryColor.toLowerCase() === c ? 'is-active' : ''}`}
                      style={{ background: c }}
                      onClick={() => setPrimaryColor(c)}
                      aria-label={`Couleur ${c}`}
                    />
                  ))}
                </div>
                <div className="settings-preview">
                  <div className="settings-preview-chip">Aperçu</div>
                  <Button type="button">Bouton principal</Button>
                  <Button type="button" variant="secondary">
                    Secondaire
                  </Button>
                  <span className="badge badge-ASSIGNED">
                    <span className="badge-dot" />
                    ASSIGNED
                  </span>
                </div>
              </section>
            ) : null}

            {section === 'operations' ? (
              <section className="settings-card">
                <header className="settings-card-head">
                  <h2>Opérations</h2>
                  <p>Horaires de planning et début de semaine.</p>
                </header>
                <div className="settings-grid-3">
                  <label className="field">
                    <span>Début journée</span>
                    <input
                      className="input"
                      type="number"
                      min={0}
                      max={23}
                      value={workdayStart}
                      onChange={(e) => setWorkdayStart(Number(e.target.value))}
                    />
                  </label>
                  <label className="field">
                    <span>Fin journée</span>
                    <input
                      className="input"
                      type="number"
                      min={1}
                      max={24}
                      value={workdayEnd}
                      onChange={(e) => setWorkdayEnd(Number(e.target.value))}
                    />
                  </label>
                  <SearchSelect
                    label="Début de semaine"
                    value={weekStartsOn}
                    selectedLabel={WEEK_OPTIONS.find((w) => w.value === weekStartsOn)?.label}
                    staticOptions={WEEK_OPTIONS}
                    loadOptions={async () => WEEK_OPTIONS}
                    onChange={setWeekStartsOn}
                    allowClear={false}
                    required
                  />
                </div>
                <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>
                  Créneaux planning et disponibilités : {workdayStart}h – {workdayEnd}h.
                </p>
              </section>
            ) : null}

            {section === 'billing' ? (
              <section className="settings-card">
                <header className="settings-card-head">
                  <h2>Facturation</h2>
                  <p>Valeurs par défaut pour devis et factures.</p>
                </header>
                <div className="settings-grid-2">
                  <label className="field">
                    <span>TVA par défaut (%)</span>
                    <input
                      className="input"
                      type="number"
                      min={0}
                      max={100}
                      step="0.1"
                      value={defaultTaxRate}
                      onChange={(e) => setDefaultTaxRate(Number(e.target.value))}
                    />
                  </label>
                  <label className="field">
                    <span>Tarif main d’œuvre (€ / h)</span>
                    <input
                      className="input"
                      type="number"
                      min={0}
                      step="0.01"
                      value={laborHourlyRate}
                      onChange={(e) => setLaborHourlyRate(Number(e.target.value))}
                    />
                  </label>
                </div>
                <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>
                  Ces valeurs préremplissent la facturation avec les pièces stock.
                </p>
              </section>
            ) : null}
          </div>
        </form>
      )}
    </AppShell>
  );
}
