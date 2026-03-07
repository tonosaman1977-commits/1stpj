import type { PostHistory } from '../../types';
import { API_PATHS } from '../../types';
import { apiFetch } from './client';

export async function fetchHistory(): Promise<PostHistory[]> {
  return apiFetch<PostHistory[]>(API_PATHS.HISTORY.LIST);
}
