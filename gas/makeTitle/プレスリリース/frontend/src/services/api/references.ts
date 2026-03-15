import type { BuzzReference } from '../../types';
import { API_PATHS } from '../../types';
import { apiFetch } from './client';

export async function fetchReferences(): Promise<BuzzReference[]> {
  return apiFetch<BuzzReference[]>(API_PATHS.REFERENCES.LIST);
}

export async function upsertReference(
  slotIndex: number,
  label: string,
  content: string,
): Promise<BuzzReference> {
  return apiFetch<BuzzReference>(API_PATHS.REFERENCES.UPSERT, {
    method: 'PUT',
    body: JSON.stringify({ slotIndex, label, content }),
  });
}

export async function deleteReference(slotIndex: number): Promise<void> {
  return apiFetch<void>(API_PATHS.REFERENCES.DELETE(slotIndex), { method: 'DELETE' });
}
