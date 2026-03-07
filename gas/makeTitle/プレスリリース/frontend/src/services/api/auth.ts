import type { User } from '../../types';
import { apiFetch } from './client';

export interface LoginResponse {
  user: User;
  token: string;
}

export async function apiLogin(email: string, password: string): Promise<LoginResponse> {
  return apiFetch<LoginResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function apiLogout(): Promise<void> {
  await apiFetch<void>('/api/auth/logout', { method: 'POST' });
}

export async function apiMe(): Promise<User> {
  return apiFetch<User>('/api/auth/me');
}
