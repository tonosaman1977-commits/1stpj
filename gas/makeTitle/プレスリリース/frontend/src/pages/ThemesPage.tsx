import { useState, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent, CardActions,
  Button, IconButton, Chip, TextField, Dialog,
  DialogTitle, DialogContent, DialogActions, CircularProgress, Alert,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import { MainLayout } from '../layouts/MainLayout';
import type { PostTheme } from '../types';
import { fetchThemes, createTheme, updateTheme, deleteTheme, activateTheme } from '../services/api/themes';

interface FormState {
  name: string;
  description: string;
}

const EMPTY_FORM: FormState = { name: '', description: '' };

export function ThemesPage() {
  const [themes, setThemes] = useState<PostTheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [nameError, setNameError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () =>
    fetchThemes()
      .then(setThemes)
      .catch(err => setError(err instanceof Error ? err.message : 'テーマの取得に失敗しました'))
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

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

  const closeDialog = () => setDialogOpen(false);

  const validate = (): boolean => {
    if (!form.name.trim()) {
      setNameError('テーマ名を入力してください');
      return false;
    }
    setNameError('');
    return true;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const data = { name: form.name.trim(), description: form.description.trim() };
      if (editingId === null) {
        await createTheme(data);
      } else {
        await updateTheme(editingId, data);
      }
      setDialogOpen(false);
      setLoading(true);
      await load();
    } catch (err) {
      setNameError(err instanceof Error ? err.message : '保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const handleActivate = async (id: string) => {
    try {
      await activateTheme(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'アクティブ化に失敗しました');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`「${name}」を削除しますか？`)) return;
    try {
      await deleteTheme(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : '削除に失敗しました');
    }
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

        {error && <Alert severity="error" sx={{ mt: 2, mb: 1 }}>{error}</Alert>}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
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
          </>
        )}
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
          <Button onClick={closeDialog} disabled={saving}>キャンセル</Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving}
            startIcon={saving ? <CircularProgress size={18} color="inherit" /> : null}
          >
            {editingId === null ? '追加' : '保存'}
          </Button>
        </DialogActions>
      </Dialog>
    </MainLayout>
  );
}
