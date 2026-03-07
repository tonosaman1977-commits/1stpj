import type { ScheduleTime } from '../../types';
import { API_PATHS } from '../../types';
import { apiFetch } from './client';

export async function fetchSchedule(): Promise<ScheduleTime[]> {
  return apiFetch<ScheduleTime[]>(API_PATHS.SCHEDULE.LIST);
}

export async function updateSchedule(slots: ScheduleTime[]): Promise<ScheduleTime[]> {
  return apiFetch<ScheduleTime[]>(API_PATHS.SCHEDULE.UPDATE, {
    method: 'PUT',
    body: JSON.stringify({ slots }),
  });
}
