import { useState, useEffect, useCallback } from 'react';
import {
  Box, Button, Card, CardContent, Chip, CircularProgress, Collapse,
  Dialog, DialogActions, DialogContent, DialogTitle,
  Alert, Snackbar, Tab, Tabs, TextField, Typography,
  IconButton, Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import EditIcon from '@mui/icons-material/Edit';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import DeleteIcon from '@mui/icons-material/Delete';
import { MainLayout } from '../layouts/MainLayout';
import {
  fetchPosts, generateDraft, createDraft, editPost, approvePost, cancelPost,
  type PostQueueItem,
} from '../services/api/posts';
import { fetchThemes } from '../services/api/themes';
import { fetchReferences, upsertReference, deleteReference } from '../services/api/references';
import type { PostTheme, BuzzReference } from '../types';

const STATUS_LABEL: Record<string, { label: string; color: 'default' | 'warning' | 'success' | 'error' | 'info' }> = {
  draft:     { label: '下書き',   color: 'default' },
  approved:  { label: '予約済み', color: 'info' },
  posted:    { label: '投稿済み', color: 'success' },
  failed:    { label: '失敗',     color: 'error' },
  cancelled: { label: 'キャンセル', color: 'default' },
};

function formatJST(iso: string): string {
  return new Date(iso).toLocaleString('ja-JP', {
    timeZone: 'Asia/Tokyo', month: 'numeric', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function isLocked(post: PostQueueItem): boolean {
  if (post.status !== 'approved' || !post.scheduledAt) return false;
  const delta = (new Date(post.scheduledAt).getTime() - Date.now()) / 1000;
  return delta < 60;
}

export function PostsPage() {
  const [tab, setTab] = useState(0);
  const [posts, setPosts] = useState<PostQueueItem[]>([]);
  const [themes, setThemes] = useState<PostTheme[]>([]);
  const [loading, setLoading] = useState(true);   // 初回のみtrue
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // 下書き作成ダイアログ
  const [createOpen, setCreateOpen] = useState(false);
  const [manualContent, setManualContent] = useState('');
  const [selectedThemeId, setSelectedThemeId] = useState('');
  const [generating, setGenerating] = useState(false);
  const [creating, setCreating] = useState(false);

  // 編集ダイアログ
  const [editTarget, setEditTarget] = useState<PostQueueItem | null>(null);
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);

  // 承認ダイアログ
  const [approveTarget, setApproveTarget] = useState<PostQueueItem | null>(null);
  const [scheduledAt, setScheduledAt] = useState('');
  const [approving, setApproving] = useState(false);

  // バズりリファレンス
  const [references, setReferences] = useState<BuzzReference[]>([]);
  const [refPanelOpen, setRefPanelOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<number | null>(null);
  const [refLabel, setRefLabel] = useState('');
  const [refContent, setRefContent] = useState('');
  const [refSaving, setRefSaving] = useState(false);

  const tabStatuses = [
    ['draft'],
    ['approved'],
    ['posted', 'failed', 'cancelled'],
  ];

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [ps, ts] = await Promise.all([
        fetchPosts(tabStatuses.flat()),
        fetchThemes(),
      ]);
      setPosts(ps);
      setThemes(ts);
    } catch (e) {
      setError(e instanceof Error ? e.message : '読み込みに失敗しました');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    fetchReferences().then(setReferences).catch(() => {});
  }, []);

  // AI自動生成された下書きを30秒ごとにサイレント取得（UIをブロックしない）
  useEffect(() => {
    const id = setInterval(() => { load(true); }, 30_000);
    return () => clearInterval(id);
  }, [load]);

  const currentPosts = posts
    .filter(p => tabStatuses[tab].includes(p.status))
    // scheduledAt 昇順ソート（要件3）
    .sort((a, b) => {
      if (!a.scheduledAt && !b.scheduledAt) return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (!a.scheduledAt) return 1;
      if (!b.scheduledAt) return -1;
      return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
    });

  // AI生成
  const handleGenerate = async () => {
    if (!selectedThemeId) return;
    setGenerating(true);
    try {
      await generateDraft(selectedThemeId);
      setSuccess('下書きを生成しました。内容を確認してから承認してください');
      setCreateOpen(false);
      setSelectedThemeId('');
      await load(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'AI生成に失敗しました');
    } finally {
      setGenerating(false);
    }
  };

  // 手動作成
  const handleCreate = async () => {
    if (!manualContent.trim()) return;
    setCreating(true);
    try {
      await createDraft(manualContent.trim());
      setSuccess('下書きを保存しました');
      setCreateOpen(false);
      setManualContent('');
      await load(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存に失敗しました');
    } finally {
      setCreating(false);
    }
  };

  // 編集保存
  const handleEditSave = async () => {
    if (!editTarget) return;
    setSaving(true);
    try {
      await editPost(editTarget.id, editContent);
      setSuccess('内容を更新しました');
      setEditTarget(null);
      await load(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : '更新に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  // 承認
  const handleApprove = async () => {
    if (!approveTarget || !scheduledAt) return;
    setApproving(true);
    try {
      await approvePost(approveTarget.id, new Date(scheduledAt).toISOString());
      setSuccess('投稿を予約しました。指定日時に自動投稿されます');
      setApproveTarget(null);
      setScheduledAt('');
      setTab(1);
      await load(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : '承認に失敗しました');
    } finally {
      setApproving(false);
    }
  };

  // キャンセル
  const handleCancel = async (post: PostQueueItem) => {
    try {
      await cancelPost(post.id);
      setSuccess(post.status === 'draft' ? '下書きを削除しました' : '予約を取り消しました');
      await load(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : '操作に失敗しました');
    }
  };

  const handleRefSave = async () => {
    if (editingSlot === null || !refContent.trim()) return;
    setRefSaving(true);
    try {
      const saved = await upsertReference(editingSlot, refLabel.trim(), refContent.trim());
      setReferences(prev => {
        const next = prev.filter(r => r.slotIndex !== editingSlot);
        return [...next, saved].sort((a, b) => a.slotIndex - b.slotIndex);
      });
      setEditingSlot(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存に失敗しました');
    } finally {
      setRefSaving(false);
    }
  };

  const handleRefDelete = async (slotIndex: number) => {
    try {
      await deleteReference(slotIndex);
      setReferences(prev => prev.filter(r => r.slotIndex !== slotIndex));
      setEditingSlot(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : '削除に失敗しました');
    }
  };

  const openRefEdit = (slot: number) => {
    const ref = references.find(r => r.slotIndex === slot);
    setRefLabel(ref?.label ?? '');
    setRefContent(ref?.content ?? '');
    setEditingSlot(slot);
  };

  const minDateTime = new Date(Date.now() + 60_000).toISOString().slice(0, 16);

  return (
    <MainLayout>
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
          <Box>
            <Typography variant="h5" fontWeight={700} color="primary">投稿管理</Typography>
            <Typography variant="body2" color="text.secondary">
              下書きを確認・編集してから承認すると指定日時に投稿されます
            </Typography>
          </Box>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
            下書き作成
          </Button>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

        {/* ── バズりリファレンス 5枠グリッド ── */}
        <Card variant="outlined" sx={{ mb: 3 }}>
          <Box
            sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
            onClick={() => setRefPanelOpen(o => !o)}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="subtitle2" fontWeight={600}>バズりリファレンス</Typography>
              {references.length > 0 && (
                <Chip label={`${references.length} / 5`} size="small" color="primary" />
              )}
            </Box>
            <IconButton size="small">{refPanelOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}</IconButton>
          </Box>
          <Collapse in={refPanelOpen}>
            <Box sx={{ px: 2, pb: 2 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                バズったThreads投稿を最大5件登録すると、AI生成時にその構造・熱量をトレースして生成します。
              </Typography>

              {/* 5枠グリッド */}
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, mb: 2 }}>
                {[0, 1, 2, 3, 4].map(slot => {
                  const ref = references.find(r => r.slotIndex === slot);
                  return (
                    <Box
                      key={slot}
                      onClick={() => openRefEdit(slot)}
                      sx={{
                        border: ref ? '1px solid' : '1px dashed',
                        borderColor: ref ? 'primary.main' : 'divider',
                        borderRadius: 1,
                        p: 1,
                        minHeight: 64,
                        cursor: 'pointer',
                        bgcolor: ref ? 'primary.50' : 'background.paper',
                        '&:hover': { borderColor: 'primary.main' },
                        transition: 'border-color 0.15s',
                      }}
                    >
                      {ref ? (
                        <>
                          <Typography variant="caption" color="primary" fontWeight={700} sx={{ display: 'block' }}>
                            参考{slot + 1} {ref.label}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{
                            display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>
                            {ref.content}
                          </Typography>
                        </>
                      ) : (
                        <Typography variant="caption" color="text.disabled" sx={{ display: 'block', textAlign: 'center', pt: 1.5 }}>
                          ＋ 参考{slot + 1}
                        </Typography>
                      )}
                    </Box>
                  );
                })}
              </Box>

              {/* インライン編集フォーム */}
              {editingSlot !== null && (
                <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2, bgcolor: 'grey.50' }}>
                  <Typography variant="subtitle2" sx={{ mb: 1.5 }}>参考{editingSlot + 1} を編集</Typography>
                  <TextField
                    label="ラベル（任意）"
                    size="small"
                    fullWidth
                    value={refLabel}
                    onChange={e => setRefLabel(e.target.value)}
                    placeholder="例: 数字フック型・共感ストーリー型"
                    inputProps={{ maxLength: 30 }}
                    sx={{ mb: 1.5 }}
                  />
                  <TextField
                    label="投稿本文"
                    size="small"
                    fullWidth
                    multiline
                    rows={4}
                    value={refContent}
                    onChange={e => setRefContent(e.target.value)}
                    placeholder="バズったThreads投稿をそのままペーストしてください..."
                    sx={{ mb: 1.5 }}
                  />
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      variant="contained"
                      size="small"
                      onClick={handleRefSave}
                      disabled={!refContent.trim() || refSaving}
                      startIcon={refSaving ? <CircularProgress size={14} /> : null}
                      sx={{ flex: 1 }}
                    >
                      {refSaving ? '保存中...' : '保存'}
                    </Button>
                    {references.find(r => r.slotIndex === editingSlot) && (
                      <Tooltip title="削除">
                        <IconButton size="small" color="error" onClick={() => handleRefDelete(editingSlot)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    <Button size="small" onClick={() => setEditingSlot(null)}>閉じる</Button>
                  </Box>
                </Box>
              )}
            </Box>
          </Collapse>
        </Card>

        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
          <Tab label={`下書き (${posts.filter(p => p.status === 'draft').length})`} />
          <Tab label={`予約済み (${posts.filter(p => p.status === 'approved').length})`} />
          <Tab label="履歴" />
        </Tabs>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
            <CircularProgress />
          </Box>
        ) : currentPosts.length === 0 ? (
          <Typography color="text.secondary" sx={{ mt: 4, textAlign: 'center' }}>
            {tab === 0 ? 'AI Agentが自動生成した下書きはまだありません。しばらくお待ちください' :
             tab === 1 ? '予約済みの投稿はありません' : '履歴がありません'}
          </Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {currentPosts.map(post => {
              const locked = isLocked(post);
              const { label, color } = STATUS_LABEL[post.status] ?? { label: post.status, color: 'default' };
              return (
                <Card key={post.id} variant="outlined">
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <Chip label={label} color={color} size="small" />
                        {post.themeName && <Chip label={post.themeName} size="small" variant="outlined" />}
                        {locked && <Chip label="ロック中" size="small" color="warning" />}
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        {post.scheduledAt ? `予約: ${formatJST(post.scheduledAt)}` :
                         `作成: ${formatJST(post.createdAt)}`}
                      </Typography>
                    </Box>

                    <Typography
                      variant="body2"
                      sx={{ whiteSpace: 'pre-wrap', mb: 2, p: 1.5, bgcolor: 'background.default', borderRadius: 1 }}
                    >
                      {post.content}
                    </Typography>

                    {post.errorMessage && (
                      <Alert severity="error" sx={{ mb: 1 }}>{post.errorMessage}</Alert>
                    )}

                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {/* 編集ボタン */}
                      {(post.status === 'draft' || (post.status === 'approved' && !locked)) && (
                        <Button
                          size="small"
                          startIcon={<EditIcon />}
                          onClick={() => { setEditTarget(post); setEditContent(post.content); }}
                        >
                          編集
                        </Button>
                      )}
                      {/* 承認ボタン（下書きのみ） */}
                      {post.status === 'draft' && (
                        <Button
                          size="small"
                          variant="contained"
                          color="success"
                          startIcon={<CheckCircleIcon />}
                          onClick={() => {
                            setApproveTarget(post);
                            setScheduledAt(minDateTime);
                          }}
                        >
                          承認・予約
                        </Button>
                      )}
                      {/* 削除・取り消しボタン */}
                      {(post.status === 'draft' || (post.status === 'approved' && !locked)) && (
                        <Button
                          size="small"
                          color="error"
                          startIcon={<CancelIcon />}
                          onClick={() => handleCancel(post)}
                        >
                          {post.status === 'draft' ? '削除' : '取り消し'}
                        </Button>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              );
            })}
          </Box>
        )}
      </Box>

      {/* ── 下書き作成ダイアログ ── */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>下書き作成</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <Typography variant="body2" color="text.secondary">
            AIで生成するか、直接テキストを入力してください。承認するまで投稿されません。
          </Typography>

          <Box>
            <Typography variant="subtitle2" gutterBottom>AIで生成</Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                select
                size="small"
                label="テーマを選択"
                value={selectedThemeId}
                onChange={e => setSelectedThemeId(e.target.value)}
                SelectProps={{ native: true }}
                sx={{ flex: 1 }}
              >
                <option value="">テーマを選択...</option>
                {themes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </TextField>
              <Button
                variant="outlined"
                startIcon={generating ? <CircularProgress size={16} /> : <AutoAwesomeIcon />}
                onClick={handleGenerate}
                disabled={!selectedThemeId || generating}
              >
                {generating ? '生成中...' : '生成'}
              </Button>
            </Box>
          </Box>

          <Box>
            <Typography variant="subtitle2" gutterBottom>または手入力</Typography>
            <TextField
              multiline
              rows={4}
              fullWidth
              placeholder="投稿テキストを入力（500文字以内）"
              value={manualContent}
              onChange={e => setManualContent(e.target.value)}
              helperText={`${manualContent.length} / 500`}
              inputProps={{ maxLength: 500 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setCreateOpen(false); setManualContent(''); }}>キャンセル</Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={!manualContent.trim() || creating}
            startIcon={creating ? <CircularProgress size={16} /> : null}
          >
            {creating ? '保存中...' : '下書き保存'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── 編集ダイアログ ── */}
      <Dialog open={!!editTarget} onClose={() => setEditTarget(null)} maxWidth="sm" fullWidth>
        <DialogTitle>内容を編集</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField
            multiline
            rows={6}
            fullWidth
            value={editContent}
            onChange={e => setEditContent(e.target.value)}
            helperText={`${editContent.length} / 500`}
            inputProps={{ maxLength: 500 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditTarget(null)}>キャンセル</Button>
          <Button
            variant="contained"
            onClick={handleEditSave}
            disabled={!editContent.trim() || saving}
            startIcon={saving ? <CircularProgress size={16} /> : null}
          >
            {saving ? '保存中...' : '保存'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── 承認・予約ダイアログ（要件1）── */}
      <Dialog open={!!approveTarget} onClose={() => setApproveTarget(null)} maxWidth="sm" fullWidth>
        <DialogTitle>承認・投稿日時を指定</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <Alert severity="info">
            承認すると指定日時に自動投稿されます。実行1分前まで取り消し・編集が可能です。
          </Alert>
          {approveTarget && (
            <Typography
              variant="body2"
              sx={{ whiteSpace: 'pre-wrap', p: 1.5, bgcolor: 'background.default', borderRadius: 1 }}
            >
              {approveTarget.content}
            </Typography>
          )}
          <TextField
            label="投稿日時（JST）"
            type="datetime-local"
            value={scheduledAt}
            onChange={e => setScheduledAt(e.target.value)}
            inputProps={{ min: minDateTime }}
            fullWidth
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApproveTarget(null)}>キャンセル</Button>
          <Button
            variant="contained"
            color="success"
            onClick={handleApprove}
            disabled={!scheduledAt || approving}
            startIcon={approving ? <CircularProgress size={16} /> : <CheckCircleIcon />}
          >
            {approving ? '処理中...' : 'この内容で承認・予約する'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!success}
        autoHideDuration={4000}
        onClose={() => setSuccess('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" variant="filled" onClose={() => setSuccess('')}>{success}</Alert>
      </Snackbar>
    </MainLayout>
  );
}
