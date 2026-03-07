import { useState } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Chip, Dialog, DialogTitle,
  DialogContent, DialogActions, Button, Tooltip,
} from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { MainLayout } from '../layouts/MainLayout';
import type { PostHistory } from '../types';

const MOCK_HISTORY: PostHistory[] = [
  {
    id: '1',
    themeId: 'theme-1',
    themeName: 'AIテック',
    content: '最新のAI技術が私たちの働き方を根本から変えつつある。今日も新しいツールが登場し、生産性が向上しています。#AI #テクノロジー',
    postedAt: '2026-03-07T12:00:00+09:00',
    status: 'success',
  },
  {
    id: '2',
    themeId: 'theme-1',
    themeName: 'AIテック',
    content: '機械学習モデルの進化が止まらない。大規模言語モデルの登場でまた一段と高度な会話が可能になりそうだ。#機械学習 #LLM',
    postedAt: '2026-03-07T09:00:00+09:00',
    status: 'success',
  },
  {
    id: '3',
    themeId: 'theme-2',
    themeName: '研究発信',
    content: '研究成果を社会に届けるには、わかりやすい言葉に変換する力が必要だ。サイエンスコミュニケーションの重要性が高まっている。',
    postedAt: '2026-03-06T18:00:00+09:00',
    status: 'failed',
    errorMessage: 'Threads API エラー: rate limit exceeded (429)',
  },
  {
    id: '4',
    themeId: 'theme-2',
    themeName: '研究発信',
    content: '論文を書くだけでは不十分。研究者は自らの成果をSNSで発信し、社会との接点を作ることが求められている。',
    postedAt: '2026-03-06T15:00:00+09:00',
    status: 'success',
  },
  {
    id: '5',
    themeId: 'theme-1',
    themeName: 'AIテック',
    content: 'AIによる自動化が進む中、人間に求められるスキルも変化している。創造性・共感力・判断力がより重要になってきた。',
    postedAt: '2026-03-06T12:00:00+09:00',
    status: 'success',
  },
  {
    id: '6',
    themeId: 'theme-3',
    themeName: 'オープンサイエンス',
    content: 'オープンアクセスの波が研究界を変えている。誰もが論文を読める時代、知識の民主化が加速する。',
    postedAt: '2026-03-06T09:00:00+09:00',
    status: 'failed',
    errorMessage: 'ネットワークタイムアウト: 接続がタイムアウトしました',
  },
  {
    id: '7',
    themeId: 'theme-3',
    themeName: 'オープンサイエンス',
    content: '再現性の危機を乗り越えるために、データ共有と透明性の確保が研究倫理の中核になりつつある。',
    postedAt: '2026-03-05T18:00:00+09:00',
    status: 'success',
  },
  {
    id: '8',
    themeId: 'theme-1',
    themeName: 'AIテック',
    content: 'ChatGPTの登場から2年。AIは研究補助ツールとして定着し、文献調査や執筆支援に広く使われるようになった。',
    postedAt: '2026-03-05T15:00:00+09:00',
    status: 'success',
  },
  {
    id: '9',
    themeId: 'theme-2',
    themeName: '研究発信',
    content: 'プレスリリースの書き方を学ぶことで、研究者は自分の言葉で社会に貢献できる。今日から始めてみよう。',
    postedAt: '2026-03-05T12:00:00+09:00',
    status: 'success',
  },
  {
    id: '10',
    themeId: 'theme-3',
    themeName: 'オープンサイエンス',
    content: 'プレプリントサーバーへの投稿が増加中。査読前でも知見を共有することで、科学の速度が上がっている。',
    postedAt: '2026-03-05T09:00:00+09:00',
    status: 'success',
  },
];

function formatDateTime(isoString: string): string {
  const d = new Date(isoString);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function HistoryPage() {
  const [selected, setSelected] = useState<PostHistory | null>(null);

  return (
    <MainLayout>
      <Box>
        <Typography variant="h5" fontWeight={700} color="primary" gutterBottom>
          投稿履歴
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          過去の投稿一覧です。行をクリックすると投稿内容を確認できます。
        </Typography>

        <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e8eaf6' }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: 13 }}>投稿日時</TableCell>
                <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: 13 }}>テーマ</TableCell>
                <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: 13 }}>投稿内容（抜粋）</TableCell>
                <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: 13 }} align="center">状態</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {MOCK_HISTORY.map(row => (
                <TableRow
                  key={row.id}
                  hover
                  onClick={() => setSelected(row)}
                  sx={{ cursor: 'pointer', '&:last-child td': { border: 0 } }}
                >
                  <TableCell sx={{ fontSize: 13, whiteSpace: 'nowrap', color: 'text.secondary' }}>
                    {formatDateTime(row.postedAt)}
                  </TableCell>
                  <TableCell>
                    <Chip label={row.themeName} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell sx={{ fontSize: 13, maxWidth: 360 }}>
                    <Typography variant="body2" noWrap sx={{ maxWidth: 340 }}>
                      {row.content}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                      <Chip
                        label={row.status === 'success' ? '成功' : '失敗'}
                        size="small"
                        color={row.status === 'success' ? 'success' : 'error'}
                      />
                      {row.status === 'failed' && row.errorMessage && (
                        <Tooltip title={row.errorMessage} arrow>
                          <ErrorOutlineIcon fontSize="small" color="error" sx={{ cursor: 'help' }} />
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      <Dialog open={Boolean(selected)} onClose={() => setSelected(null)} maxWidth="sm" fullWidth>
        {selected && (
          <>
            <DialogTitle sx={{ fontWeight: 700, color: 'primary.main' }}>
              投稿内容の詳細
            </DialogTitle>
            <DialogContent dividers>
              <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                <Typography variant="caption" color="text.secondary">
                  {formatDateTime(selected.postedAt)}
                </Typography>
                <Chip label={selected.themeName} size="small" variant="outlined" />
                <Chip
                  label={selected.status === 'success' ? '成功' : '失敗'}
                  size="small"
                  color={selected.status === 'success' ? 'success' : 'error'}
                />
              </Box>
              <Typography variant="body1" sx={{ lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
                {selected.content}
              </Typography>
              {selected.status === 'failed' && selected.errorMessage && (
                <Box sx={{ mt: 2, p: 1.5, bgcolor: '#ffebee', borderRadius: 1 }}>
                  <Typography variant="caption" color="error.main" fontWeight={600}>
                    エラー詳細
                  </Typography>
                  <Typography variant="body2" color="error.dark" sx={{ mt: 0.5 }}>
                    {selected.errorMessage}
                  </Typography>
                </Box>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setSelected(null)}>閉じる</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </MainLayout>
  );
}
