import { useState, useEffect } from 'react';
import { Box, Card, CardContent, Typography, Chip, CircularProgress, Alert } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ScheduleIcon from '@mui/icons-material/Schedule';
import LabelIcon from '@mui/icons-material/Label';
import { MainLayout } from '../layouts/MainLayout';
import type { PostHistory, PostTheme, ScheduleTime } from '../types';
import { fetchHistory } from '../services/api/history';
import { fetchThemes } from '../services/api/themes';
import { fetchSchedule } from '../services/api/schedule';

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

  useEffect(() => {
    Promise.all([fetchHistory(), fetchThemes(), fetchSchedule()])
      .then(([h, t, s]) => { setHistory(h); setThemes(t); setSchedules(s); })
      .catch(err => setError(err instanceof Error ? err.message : 'データの取得に失敗しました'))
      .finally(() => setLoading(false));
  }, []);

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
          </>
        )}
      </Box>
    </MainLayout>
  );
}
