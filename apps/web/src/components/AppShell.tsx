'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  BarChart3,
  Briefcase,
  Building2,
  CalendarDays,
  FileText,
  LayoutDashboard,
  MapPin,
  Menu,
  Moon,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
  Sun,
  Tags,
  Truck,
  Users,
  UsersRound,
  X,
} from 'lucide-react';
import { api, clearSession, getSession } from '@/lib/api';
import { applyOrgBranding, loadCachedBranding, resolveTheme } from '@/lib/branding';
import { ReactNode, useEffect, useLayoutEffect, useState } from 'react';
import { LogoMark } from '@/components/Brand';
import { LanguageSwitch, useI18n } from '@/lib/i18n';
import { Avatar, Button } from '@/components/ui';

const groups = [
  {
    label: 'overview',
    links: [
      { href: '/dashboard', label: 'dashboard', icon: LayoutDashboard },
      { href: '/stats', label: 'stats', icon: BarChart3 },
    ],
  },
  {
    label: 'dispatch',
    links: [
      { href: '/work-orders', label: 'workOrders', icon: Briefcase },
      { href: '/planning', label: 'planning', icon: CalendarDays },
      { href: '/field', label: 'field', icon: Truck },
      { href: '/team', label: 'team', icon: Users },
      { href: '/groups', label: 'groups', icon: UsersRound },
    ],
  },
  {
    label: 'business',
    links: [
      { href: '/billing', label: 'billing', icon: FileText },
      { href: '/inventory', label: 'inventory', icon: Package },
    ],
  },
  {
    label: 'organization',
    links: [
      { href: '/customers', label: 'customers', icon: Building2 },
      { href: '/sites', label: 'sites', icon: MapPin },
      { href: '/categories', label: 'categories', icon: Tags },
      { href: '/settings', label: 'settings', icon: Settings },
    ],
  },
];

export function AppShell({
  title,
  children,
  actions,
}: {
  title: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [orgName, setOrgName] = useState('');
  const { m } = useI18n();
  const [userName, setUserName] = useState('Utilisateur');
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [query, setQuery] = useState('');
  const [role, setRole] = useState<string | null>(null);

  useLayoutEffect(() => {
    setCollapsed(localStorage.getItem('fieldops.sidebarCollapsed') === '1');
    applyOrgBranding(loadCachedBranding());
  }, []);

  useEffect(() => {
    const session = getSession();
    if (!session) {
      router.replace('/login');
      return;
    }
    setRole(session.role ?? null);
    setOrgName(session.organization.name);
    setUserName(`${session.user.firstName} ${session.user.lastName}`);
    if (session.role === 'FIELD_WORKER' && !pathname.startsWith('/field')) {
      router.replace('/field');
    }

    api<{
      name: string;
      theme?: string;
      primaryColor?: string;
      language?: string;
      currency?: string;
      timezone?: string;
    }>('/organizations/me')
      .then((org) => {
        setOrgName(org.name);
        const mode = resolveTheme(org.theme);
        setTheme(mode);
        applyOrgBranding(org);
      })
      .catch(() => {
        const cached = loadCachedBranding();
        setTheme(resolveTheme(cached.theme));
        applyOrgBranding(cached);
      });
  }, [router, pathname]);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('fieldops.sidebarCollapsed', next ? '1' : '0');
      return next;
    });
  }

  function logout() {
    clearSession();
    router.replace('/login');
  }

  function toggleTheme() {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    applyOrgBranding({
      ...loadCachedBranding(),
      theme: next,
    });
  }

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    router.push(`/work-orders?q=${encodeURIComponent(query.trim())}`);
  }

  const navGroups =
    role === 'FIELD_WORKER'
      ? [
          {
            label: 'field',
            links: [{ href: '/field', label: 'missions', icon: Truck }],
          },
        ]
      : groups;

  return (
    <div className={`app-shell ${collapsed ? 'collapsed' : ''}`}>
      <aside className={`sidebar ${mobileOpen ? 'open' : ''}`} aria-label={m.shell.menu}>
        <div className="brand-row">
          <div className="brand">
            <LogoMark />
            {!collapsed || mobileOpen ? (
              <div>
                Inter<span>venio</span>
                <div className="muted" style={{ fontSize: '0.75rem' }}>
                  {orgName || m.shell.organization}
                </div>
              </div>
            ) : null}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="mobile-only"
            onClick={() => setMobileOpen(false)}
            aria-label={m.shell.closeMenu}
          >
            <X size={18} />
          </Button>
        </div>

        <nav style={{ display: 'grid', gap: 16, flex: 1 }}>
          {navGroups.map((group) => (
            <div key={group.label}>
              {!collapsed || mobileOpen ? (
                <div className="nav-label">{m.nav[group.label]}</div>
              ) : null}
              <div style={{ display: 'grid', gap: 4 }}>
                {group.links.map((link) => {
                  const Icon = link.icon;
                  const active = pathname.startsWith(link.href);
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`nav-link ${active ? 'active' : ''}`}
                      onClick={() => setMobileOpen(false)}
                      title={m.nav[link.label]}
                    >
                      <Icon size={18} />
                      {!collapsed || mobileOpen ? <span>{m.nav[link.label]}</span> : null}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      <button
        type="button"
        className="shell-fab desktop-only"
        onClick={toggleCollapsed}
        aria-label={collapsed ? 'Étendre la sidebar' : 'Réduire la sidebar'}
      >
        {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
      </button>

      <div className="app-main">
        <header className="topbar">
          <div className="topbar-left">
            <Button
              variant="ghost"
              size="icon"
              className="mobile-only"
              onClick={() => setMobileOpen(true)}
              aria-label="Ouvrir le menu"
            >
              <Menu size={18} />
            </Button>
            {role === 'FIELD_WORKER' ? null : (
            <form className="search-box input-wrap" onSubmit={onSearch}>
              <Search
                size={16}
                style={{ position: 'absolute', left: 12, color: 'var(--muted)' }}
              />
              <input
                className="input"
                style={{ paddingLeft: 36 }}
                placeholder={m.shell.search}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label={m.shell.searchLabel}
              />
            </form>
            )}
          </div>
          <div className="topbar-right">
            <LanguageSwitch />
            <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label={m.shell.theme}>
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </Button>
            <div style={{ position: 'relative' }}>
              <button
                className="btn btn-ghost"
                onClick={() => setMenuOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
              >
                <Avatar name={userName} />
                <span className="desktop-only">{userName}</span>
              </button>
              {menuOpen ? (
                <div className="user-menu" role="menu">
                  <div style={{ padding: 10 }}>
                    <div>{userName}</div>
                    <div className="muted" style={{ fontSize: '0.85rem' }}>
                      {orgName || m.shell.organization}
                    </div>
                  </div>
                  <button className="menu-item" role="menuitem" onClick={logout}>
                    {m.shell.logout}
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <div className="page">
          <div className="page-header">
            <div>
              <h1>{title}</h1>
            </div>
            {actions}
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
