const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3010/api';

export type AuthSession = {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  organization: {
    id: string;
    name: string;
    country: string;
    currency: string;
    timezone: string;
    language: string;
  };
  role?: string;
};

const TOKEN_KEY = 'fieldops.session';

export function getSession(): AuthSession | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(TOKEN_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
}

export function saveSession(session: AuthSession) {
  localStorage.setItem(TOKEN_KEY, JSON.stringify(session));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
}

export async function api<T>(
  path: string,
  options: RequestInit = {},
  auth = true,
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');

  if (auth) {
    const session = getSession();
    if (session?.accessToken) {
      headers.set('Authorization', `Bearer ${session.accessToken}`);
    }
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    if (response.status === 401 && auth && typeof window !== 'undefined') {
      clearSession();
      window.location.replace('/login');
      throw new Error('Session expirée');
    }
    const body = await response.json().catch(() => ({}));
    const raw = body.message;
    const message = Array.isArray(raw)
      ? raw.join(', ')
      : typeof raw === 'object' && raw?.message
        ? String(raw.message)
        : typeof raw === 'string'
          ? raw
          : undefined;
    throw new Error(message ?? `Request failed (${response.status})`);
  }

  return response.json() as Promise<T>;
}
