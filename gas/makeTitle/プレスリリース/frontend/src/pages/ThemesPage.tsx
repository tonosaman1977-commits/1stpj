import { useState } from 'react';
import {
  Box, Typography, Card, CardContent, CardActions,
  Button, IconButton, Chip, TextField, Dialog,
  DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import { MainLayout } from '../layouts/MainLayout';
import type { PostTheme } from '../types';

const INITIAL_THEMES: PostTheme[] = [
  {
    id: '1',
    name: 'AIテック',
    description: 'AI・機械学習・最新テクノロジーに関する投稿。エンジニア・研究者向けの専門的な内容を中心に発信する。',
    isActive: true,
    createdAt: '2026-02-01T09:00:00Z',
  },
  {
    id: '2',
    name: 'キャリア・働き方',
    description: 'リモートワーク、キャリア形成、生産性向上など、現代の働き方に関するトピックを投稿する。',
    isActive: false,
    createdAt: '2026-02-10T10:00:00Z',
  },
  {
    id: '3',
    name: 'スタートアップ',
    description: 'スタートアップ文化、資金調達、プロダクト開発など、起業家・投資家向けのコンテンツを発信する。',
    isActive: false,
    createdAt: '2026-02-20T11:00:00Z',
  },
];

interface FormState {
  name: string;
  description: string;
}

const EMPTY_FORM: FormState = { name: '', description: '' };

export function ThemesPage() {
  const [themes, setThemes] = useState<PostTheme[]>(INITIAL_THEMES);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [nameError, setNameError] = useState('');

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setNameError('');
    setDialogOpen(true);
  };

  const openEdit = (theme: PostTheme) => {
    setEditingId(theme.id);
    setForm({ name: theme.name, description: theme.description });
    setNameError('');
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
  };

  const validate = (): boolean => {
    if (!form.name.trim()) {
      setNameError('テーマ名を入力してください');
      return false;
    }
    setNameError('');
    return true;
  };

  const handleSave = () => {
    if (!validate()) return;

    if (editingId === null) {
      const newTheme: PostTheme = {
        id: String(Date.now()),
        name: form.name.trim(),
        description: form.description.trim(),
        isActive: themes.length === 0,
        createdAt: new Date().toISOString(),
      };
      setThemes(prev => [...prev, newTheme]);
    } else {
      setThemes(prev =>
        prev.map(t =>
          t.id === editingId
            ? { ...t, name: form.name.trim(), description: form.description.trim() }
            : t
        )
      );
    }
    setDialogOpen(false);
  };

  const handleActivate = (id: string) => {
    setThemes(prev => prev.map(t => ({ ...t, isActive: t.id === id })));
  };

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`「${name}」を削除しますか？`)) return;
    setThemes(prev => {
      const filtered = prev.filter(t => t.id !== id);
      const wasActive = prev.find(t => t.id === id)?.isActive ?? false;
      if (wasActive && filtered.length > 0) {
        return filtered.map((t, i) => ({ ...t, isActive: i === 0 }));
      }
      return filtered;
    });
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('ja-JP', { year: 'numeric', month: 'short', day: 'numeric' });

  return (
    <MainLayout>
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Box>
            <Typography variant="h5" fontWeight={700} color="primary">
              テーマ管理
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              投稿に使用するテーマを登録・管理します
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={openCreate}
            sx={{ flexShrink: 0 }}
          >
            テーマを追加
          </Button>
        </Box>

        {themes.length === 0 && (
          <Card sx={{ mt: 3, textAlign: 'center', py: 6 }}>
            <Typography color="text.secondary">テーマが登録されていません</Typography>
            <Button variant="outlined" startIcon={<AddIcon />} onClick={openCreate} sx={{ mt: 2 }}>
              最初のテーマを追加
            </Button>
          </Card>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 3 }}>
          {themes.map(theme => (
            <Card
              key={theme.id}
              variant="outlined"
              sx={{
                borderColor: theme.isActive ? 'primary.main' : 'divider',
                borderWidth: theme.isActive ? 2 : 1,
                transition: 'border-color 0.2s',
              }}
            >
              <CardContent sx={{ pb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <Typography variant="h6" fontWeight={600} color="text.primary">
                    {theme.name}
                  </Typography>
                  {theme.isActive && (
                    <Chip
                      label="アクティブ"
                      size="small"
                      color="primary"
                      icon={<CheckCircleIcon />}
                      sx={{ fontWeight: 600 }}
                    />
                  )}
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7, mb: 1 }}>
                  {theme.description || '説明なし'}
                </Typography>
                <Typography variant="caption" color="text.disabled">
                  登録日: {formatDate(theme.createdAt)}
                </Typography>
              </CardContent>
              <CardActions sx={{ px: 2, pb: 1.5, pt: 0, gap: 1 }}>
                {!theme.isActive && (
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<RadioButtonUncheckedIcon />}
                    onClick={() => handleActivate(theme.id)}
                  >
                    アクティブにする
                  </Button>
                )}
                <Box sx={{ ml: 'auto', display: 'flex', gap: 0.5 }}>
                  <IconButton size="small" onClick={() => openEdit(theme)} aria-label="編集">
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => handleDelete(theme.id, theme.name)}
                    aria-label="削除"
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              </CardActions>
            </Card>
          ))}
        </Box>
      </Box>

      <Dialog open={dialogOpen} onClose={closeDialog} fullWidth maxWidth="sm">
        <DialogTitle>{editingId === null ? 'テーマを追加' : 'テーマを編集'}</DialogTitle>
        <DialogContent sx={{ pt: '16px !important', display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="テーマ名"
            value={form.name}
            onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
            error={Boolean(nameError)}
            helperText={nameError || '例: AIテック、キャリア・働き方'}
            fullWidth
            required
            autoFocus
          />
          <TextField
            label="説明"
            value={form.description}
            onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
            multiline
            rows={3}
            fullWidth
            helperText="どのような内容を投稿するかを記述してください（任意）"
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={closeDialog}>キャンセル</Button>
          <Button variant="contained" onClick={handleSave}>
            {editingId === null ? '追加' : '保存'}
          </Button>
        </DialogActions>
      </Dialog>
    </MainLayout>
  );
}
