import { useState, useEffect } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Chip, Dialog, DialogTitle,
  DialogContent, DialogActions, Button, Tooltip, CircularProgress, Alert,
} from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { MainLayout } from '../layouts/MainLayout';
import type { PostHistory } from '../types';
import { fetchHistory } from '../services/api/history';

function formatDateTime(isoString: string): string {
  const d = new Date(isoString);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function HistoryPage() {
  const [history, setHistory] = useState<PostHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<PostHistory | null>(null);

  useEffect(() => {
    fetchHistory()
      .then(setHistory)
      .catch(err => setError(err instanceof Error ? err.message : '履歴の取得に失敗しました'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <MainLayout>
      <Box>
        <Typography variant="h5" fontWeight={700} color="primary" gutterBottom>
          投稿履歴
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          過去の投稿一覧です。行をクリックすると投稿内容を確認できます。
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
            <CircularProgress />
          </Box>
        ) : history.length === 0 ? (
          <Paper elevation={0} sx={{ p: 6, textAlign: 'center', border: '1px solid #e8eaf6' }}>
            <Typography color="text.secondary">投稿履歴がありません</Typography>
          </Paper>
        ) : (
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
                {history.map(row => (
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
        )}
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
