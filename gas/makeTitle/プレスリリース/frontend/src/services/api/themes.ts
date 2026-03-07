import type { PostTheme } from '../../types';
import { API_PATHS } from '../../types';
import { apiFetch } from './client';

export async function fetchThemes(): Promise<PostTheme[]> {
  return apiFetch<PostTheme[]>(API_PATHS.THEMES.LIST);
}

export async function createTheme(data: { name: string; description: string }): Promise<PostTheme> {
  return apiFetch<PostTheme>(API_PATHS.THEMES.CREATE, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateTheme(id: string, data: { name: string; description: string }): Promise<PostTheme> {
  return apiFetch<PostTheme>(API_PATHS.THEMES.UPDATE(id), {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteTheme(id: string): Promise<void> {
  await apiFetch<void>(API_PATHS.THEMES.DELETE(id), { method: 'DELETE' });
}

export async function activateTheme(id: string): Promise<PostTheme> {
  return apiFetch<PostTheme>(API_PATHS.THEMES.ACTIVATE(id), { method: 'POST' });
}
