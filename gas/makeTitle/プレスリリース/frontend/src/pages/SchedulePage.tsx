import { useState } from 'react';
import {
  Box, Card, CardContent, Typography, TextField, Switch,
  FormControlLabel, Button, Snackbar, Alert,
} from '@mui/material';
import { MainLayout } from '../layouts/MainLayout';
import type { ScheduleTime } from '../types';

const INITIAL_SCHEDULES: ScheduleTime[] = [
  { id: '1', time: '06:00', enabled: true },
  { id: '2', time: '09:00', enabled: true },
  { id: '3', time: '12:00', enabled: true },
  { id: '4', time: '15:00', enabled: true },
  { id: '5', time: '18:00', enabled: true },
];

export function SchedulePage() {
  const [schedules, setSchedules] = useState<ScheduleTime[]>(INITIAL_SCHEDULES);
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  const handleTimeChange = (id: string, time: string) => {
    setSchedules(prev => prev.map(s => s.id === id ? { ...s, time } : s));
  };

  const handleToggle = (id: string) => {
    setSchedules(prev => prev.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s));
  };

  const handleSave = () => {
    setSnackbarOpen(true);
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

        <Button variant="contained" color="primary" onClick={handleSave} sx={{ minWidth: 120 }}>
          保存
        </Button>

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
