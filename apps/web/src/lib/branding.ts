export type OrgBranding = {
  theme?: string | null;
  primaryColor?: string | null;
  name?: string;
  language?: string;
  currency?: string;
  timezone?: string;
};

function clamp(n: number) {
  return Math.max(0, Math.min(255, Math.round(n)));
}

function hexToRgb(hex: string) {
  const h = hex.replace('#', '');
  if (h.length !== 6) return null;
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b]
    .map((v) => clamp(v).toString(16).padStart(2, '0'))
    .join('')}`;
}

function mix(hex: string, withHex: string, amount: number) {
  const a = hexToRgb(hex);
  const b = hexToRgb(withHex);
  if (!a || !b) return hex;
  return rgbToHex(
    a.r + (b.r - a.r) * amount,
    a.g + (b.g - a.g) * amount,
    a.b + (b.b - a.b) * amount,
  );
}

function darken(hex: string, amount: number) {
  return mix(hex, '#000000', amount);
}

function lighten(hex: string, amount: number) {
  return mix(hex, '#ffffff', amount);
}

export function resolveTheme(theme?: string | null): 'light' | 'dark' {
  if (theme === 'dark') return 'dark';
  if (theme === 'light') return 'light';
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

export function applyOrgBranding(org?: OrgBranding | null) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const mode = resolveTheme(org?.theme);
  root.setAttribute('data-theme', mode === 'dark' ? 'dark' : '');

  const primary = org?.primaryColor && /^#([0-9a-fA-F]{6})$/.test(org.primaryColor)
    ? org.primaryColor
    : '#143d4f';

  if (mode === 'dark') {
    root.style.setProperty('--primary', lighten(primary, 0.28));
    root.style.setProperty('--primary-hover', lighten(primary, 0.4));
    root.style.setProperty('--primary-soft', mix(primary, '#141414', 0.82));
    root.style.setProperty('--primary-ink', '#ffffff');
  } else {
    root.style.setProperty('--primary', primary);
    root.style.setProperty('--primary-hover', darken(primary, 0.12));
    root.style.setProperty('--primary-soft', lighten(primary, 0.88));
    root.style.setProperty('--primary-ink', '#ffffff');
  }

  root.style.setProperty('--focus', `0 0 0 3px ${primary}47`);

  try {
    localStorage.setItem('fieldops.orgTheme', org?.theme ?? 'light');
    localStorage.setItem('fieldops.orgPrimary', primary);
  } catch {
    /* ignore */
  }
}

export function loadCachedBranding(): OrgBranding {
  if (typeof window === 'undefined') return {};
  return {
    theme: localStorage.getItem('fieldops.orgTheme') ?? 'light',
    primaryColor: localStorage.getItem('fieldops.orgPrimary') ?? '#143d4f',
  };
}
