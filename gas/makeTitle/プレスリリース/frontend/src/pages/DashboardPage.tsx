import { Box, Card, CardContent, Typography, Chip } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ScheduleIcon from '@mui/icons-material/Schedule';
import LabelIcon from '@mui/icons-material/Label';
import { MainLayout } from '../layouts/MainLayout';

const MOCK_STATS = [
  { label: '今日の投稿', value: '3 / 5', icon: <CheckCircleIcon />, color: '#40c4ff' },
  { label: '次回投稿', value: '15:00', icon: <ScheduleIcon />, color: '#7c4dff' },
  { label: 'アクティブテーマ', value: 'AIテック', icon: <LabelIcon />, color: '#00bfa5' },
];

const MOCK_RECENT = [
  { time: '12:00', theme: 'AIテック', content: '最新のAI技術が私たちの働き方を根本から変えつつある。今日も新しいツールが登場し、生産性が向上しています。', status: 'success' },
  { time: '09:00', theme: 'AIテック', content: '機械学習モデルの進化が止まらない。GPT-5の登場でまた一段と高度な会話が可能になりそうだ。', status: 'success' },
];

export function DashboardPage() {
  return (
    <MainLayout>
      <Box>
        <Typography variant="h5" fontWeight={700} color="primary" gutterBottom>
          ダッシュボード
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          今日の投稿状況をご確認ください
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          {MOCK_STATS.map(stat => (
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
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {MOCK_RECENT.map((post, i) => (
            <Card key={i}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Typography variant="caption" color="text.secondary">{post.time}</Typography>
                  <Chip label={post.theme} size="small" />
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
      </Box>
    </MainLayout>
  );
}
