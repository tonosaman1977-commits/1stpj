import { useState, useEffect, useCallback } from 'react';
import type { SnsStatus } from '../types';
import { fetchSnsStatus, disconnectSns, fetchThreadsAuthorizeUrl } from '../services/api/sns';

export function useSnsStatus() {
  const [status, setStatus] = useState<SnsStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    fetchSnsStatus()
      .then(s => { setStatus(s); setError(''); })
      .catch(err => setError(err instanceof Error ? err.message : '連携状態の取得に失敗しました'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const connect = useCallback(async () => {
    try {
      const { url } = await fetchThreadsAuthorizeUrl();
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : '連携URLの取得に失敗しました');
    }
  }, []);

  const disconnect = useCallback(async () => {
    try {
      await disconnectSns();
      setStatus(prev => prev ? { ...prev, connected: false, sns_user_id: null, token_expires_at: null, is_expired: false } : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '連携解除に失敗しました');
    }
  }, []);

  return { status, loading, error, connect, disconnect, reload: load };
}
