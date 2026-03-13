import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Box, Card, CardContent, Typography, Chip, CircularProgress, Alert,
  Button, Divider,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ScheduleIcon from '@mui/icons-material/Schedule';
import LabelIcon from '@mui/icons-material/Label';
import LinkIcon from '@mui/icons-material/Link';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { MainLayout } from '../layouts/MainLayout';
import type { PostHistory, PostTheme, ScheduleTime } from '../types';
import { fetchHistory } from '../services/api/history';
import { fetchThemes } from '../services/api/themes';
import { fetchSchedule } from '../services/api/schedule';
import { useSnsStatus } from '../hooks/useSnsStatus';

function getTodayStats(history: PostHistory[]): string {
  const today = new Date().toDateString();
  const todayPosts = history.filter(h => new Date(h.postedAt).toDateString() === today);
  const successful = todayPosts.filter(h => h.status === 'success').length;
  return `${successful} / ${todayPosts.length}`;
}

function getNextPostTime(schedules: ScheduleTime[]): string {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const enabled = schedules
    .filter(s => s.enabled)
    .map(s => {
      const [h, m] = s.time.split(':').map(Number);
      return { time: s.time, minutes: h * 60 + m };
    })
    .sort((a, b) => a.minutes - b.minutes);
  const next = enabled.find(s => s.minutes > currentMinutes);
  return next ? next.time : (enabled.length > 0 ? `${enabled[0].time} (明日)` : 'なし');
}

function getActiveTheme(themes: PostTheme[]): string {
  return themes.find(t => t.isActive)?.name ?? 'なし';
}

export function DashboardPage() {
  const [history, setHistory] = useState<PostHistory[]>([]);
  const [themes, setThemes] = useState<PostTheme[]>([]);
  const [schedules, setSchedules] = useState<ScheduleTime[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [snsConnectedAlert, setSnsConnectedAlert] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const { status: snsStatus, loading: snsLoading, error: snsError, connect, disconnect, reload: reloadSns } = useSnsStatus();

  useEffect(() => {
    Promise.all([fetchHistory(), fetchThemes(), fetchSchedule()])
      .then(([h, t, s]) => { setHistory(h); setThemes(t); setSchedules(s); })
      .catch(err => setError(err instanceof Error ? err.message : 'データの取得に失敗しました'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (searchParams.get('sns_connected') === '1') {
      setSnsConnectedAlert(true);
      reloadSns();
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams, reloadSns]);

  const stats = loading ? [] : [
    { label: '今日の投稿', value: getTodayStats(history), icon: <CheckCircleIcon />, color: '#40c4ff' },
    { label: '次回投稿', value: getNextPostTime(schedules), icon: <ScheduleIcon />, color: '#7c4dff' },
    { label: 'アクティブテーマ', value: getActiveTheme(themes), icon: <LabelIcon />, color: '#00bfa5' },
  ];

  const recentPosts = history.slice(0, 5);

  return (
    <MainLayout>
      <Box>
        <Typography variant="h5" fontWeight={700} color="primary" gutterBottom>
          ダッシュボード
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          今日の投稿状況をご確認ください
        </Typography>

        {snsConnectedAlert && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSnsConnectedAlert(false)}>
            Threadsとの連携が完了しました
          </Alert>
        )}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
              {stats.map(stat => (
                <Card key={stat.label} sx={{ flex: '1 1 180px' }}>
                  <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ color: stat.color, display: 'flex' }}>{stat.icon}</Box>
                    <Box>
                      <Typography variant="h5" fontWeight={700} color="primary">{stat.value}</Typography>
                      <Typography variant="caption" color="text.secondary">{stat.label}</Typography>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Box>

            <Typography variant="h6" fontWeight={600} color="primary" gutterBottom>
              直近の投稿
            </Typography>
            {recentPosts.length === 0 ? (
              <Typography variant="body2" color="text.secondary">投稿履歴がありません</Typography>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {recentPosts.map(post => (
                  <Card key={post.id}>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(post.postedAt).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                        </Typography>
                        <Chip label={post.themeName} size="small" />
                        <Chip
                          label={post.status === 'success' ? '成功' : '失敗'}
                          size="small"
                          color={post.status === 'success' ? 'success' : 'error'}
                          sx={{ ml: 'auto' }}
                        />
                      </Box>
                      <Typography variant="body2" color="text.primary" sx={{ lineHeight: 1.7 }}>
                        {post.content}
                      </Typography>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            )}
            <Divider sx={{ my: 3 }} />

            <Typography variant="h6" fontWeight={600} color="primary" gutterBottom>
              SNS連携
            </Typography>

            {snsError && <Alert severity="error" sx={{ mb: 2 }}>{snsError}</Alert>}

            {snsStatus?.is_expired && (
              <Alert severity="warning" icon={<WarningAmberIcon />} sx={{ mb: 2 }}>
                Threadsのアクセストークンが期限切れです。再連携してください。
              </Alert>
            )}

            <Card>
              <CardContent>
                {snsLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                    <CircularProgress size={24} />
                  </Box>
                ) : (
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Box sx={{ color: snsStatus?.connected ? '#00bfa5' : '#9e9e9e', display: 'flex' }}>
                        {snsStatus?.connected ? <LinkIcon /> : <LinkOffIcon />}
                      </Box>
                      <Box>
                        <Typography variant="body2" fontWeight={600}>
                          Threads {snsStatus?.connected ? '連携中' : '未連携'}
                        </Typography>
                        {snsStatus?.connected && snsStatus.token_expires_at && (
                          <Typography variant="caption" color="text.secondary">
                            有効期限: {new Date(snsStatus.token_expires_at).toLocaleDateString('ja-JP')}
                          </Typography>
                        )}
                      </Box>
                      {snsStatus?.connected && (
                        <Chip
                          label={snsStatus.is_expired ? '期限切れ' : '有効'}
                          size="small"
                          color={snsStatus.is_expired ? 'error' : 'success'}
                        />
                      )}
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      {snsStatus?.connected ? (
                        <>
                          {snsStatus.is_expired && (
                            <Button variant="contained" size="small" onClick={connect} startIcon={<LinkIcon />}>
                              再連携
                            </Button>
                          )}
                          <Button variant="outlined" size="small" color="error" onClick={disconnect} startIcon={<LinkOffIcon />}>
                            連携解除
                          </Button>
                        </>
                      ) : (
                        <Button variant="contained" size="small" onClick={connect} startIcon={<LinkIcon />}>
                          Threadsと連携
                        </Button>
                      )}
                    </Box>
                  </Box>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </Box>
    </MainLayout>
  );
}
