// @API_INTEGRATION: バックエンドAPI実装後にAgent 8で接続
import type { PostHistory } from '../../types';

export async function fetchHistory(): Promise<PostHistory[]> {
  throw new Error('API not implemented');
}
