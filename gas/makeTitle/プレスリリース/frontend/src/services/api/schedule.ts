// @API_INTEGRATION: バックエンドAPI実装後にAgent 8で接続
import type { ScheduleTime } from '../../types';

export async function fetchSchedule(): Promise<ScheduleTime[]> {
  throw new Error('API not implemented');
}

export async function updateSchedule(slots: ScheduleTime[]): Promise<ScheduleTime[]> {
  throw new Error('API not implemented');
}
