import { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, TextField, Switch,
  FormControlLabel, Button, Snackbar, Alert, CircularProgress,
} from '@mui/material';
import { MainLayout } from '../layouts/MainLayout';
import type { ScheduleTime } from '../types';
import { fetchSchedule, updateSchedule } from '../services/api/schedule';

export function SchedulePage() {
  const [schedules, setSchedules] = useState<ScheduleTime[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  useEffect(() => {
    fetchSchedule()
      .then(setSchedules)
      .catch(err => setError(err instanceof Error ? err.message : 'スケジュールの取得に失敗しました'))
      .finally(() => setLoading(false));
  }, []);

  const handleTimeChange = (id: string, time: string) => {
    setSchedules(prev => prev.map(s => s.id === id ? { ...s, time } : s));
  };

  const handleToggle = (id: string) => {
    setSchedules(prev => prev.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s));
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const updated = await updateSchedule(schedules);
      setSchedules(updated);
      setSnackbarOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  return (
    <MainLayout>
      <Box>
        <Typography variant="h5" fontWeight={700} color="primary" gutterBottom>
          スケジュール設定
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          1日5回の投稿時刻を設定してください
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
              {schedules.map((schedule, index) => (
                <Card key={schedule.id}>
                  <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
                    <Typography variant="body2" color="text.secondary" sx={{ minWidth: 60 }}>
                      スロット {index + 1}
                    </Typography>
                    <TextField
                      type="time"
                      value={schedule.time}
                      onChange={e => handleTimeChange(schedule.id, e.target.value)}
                      size="small"
                      disabled={!schedule.enabled}
                      inputProps={{ step: 60 }}
                      sx={{ width: 140 }}
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={schedule.enabled}
                          onChange={() => handleToggle(schedule.id)}
                          color="primary"
                        />
                      }
                      label={
                        <Typography variant="body2" color={schedule.enabled ? 'text.primary' : 'text.secondary'}>
                          {schedule.enabled ? '有効' : '無効'}
                        </Typography>
                      }
                    />
                  </CardContent>
                </Card>
              ))}
            </Box>

            <Button
              variant="contained"
              color="primary"
              onClick={handleSave}
              disabled={saving}
              startIcon={saving ? <CircularProgress size={18} color="inherit" /> : null}
              sx={{ minWidth: 120 }}
            >
              {saving ? '保存中...' : '保存'}
            </Button>
          </>
        )}

        <Snackbar
          open={snackbarOpen}
          autoHideDuration={3000}
          onClose={() => setSnackbarOpen(false)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert onClose={() => setSnackbarOpen(false)} severity="success" variant="filled">
            スケジュールを保存しました
          </Alert>
        </Snackbar>
      </Box>
    </MainLayout>
  );
}
