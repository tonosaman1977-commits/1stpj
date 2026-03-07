const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

function getToken(): string | null {
  try {
    const saved = localStorage.getItem('auth');
    if (saved) return JSON.parse(saved).token ?? null;
  } catch { /* ignore */ }
  return null;
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const detail = await res.json()
      .then((d: { detail?: unknown }) => {
        const det = d.detail;
        return typeof det === 'string' ? det : JSON.stringify(det);
      })
      .catch(() => res.statusText);
    throw new Error(detail);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
