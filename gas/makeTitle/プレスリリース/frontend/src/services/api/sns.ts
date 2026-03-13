import type { SnsStatus } from '../../types';
import { apiFetch } from './client';

export async function fetchSnsStatus(): Promise<SnsStatus> {
  return apiFetch<SnsStatus>('/api/sns/status');
}

export async function disconnectSns(): Promise<void> {
  await apiFetch<void>('/api/sns/disconnect', { method: 'DELETE' });
}

export async function fetchThreadsAuthorizeUrl(): Promise<{ url: string }> {
  return apiFetch<{ url: string }>('/api/auth/threads/authorize-url');
}
