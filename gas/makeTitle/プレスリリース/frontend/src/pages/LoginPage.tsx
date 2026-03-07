import { useState } from 'react';
import {
  Box, Paper, Typography, TextField, Button,
  Alert, CircularProgress,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { PublicLayout } from '../layouts/PublicLayout';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ログインに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PublicLayout>
      <Paper sx={{ p: 4, width: '100%', maxWidth: 400, mx: 2 }}>
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Typography variant="h5" fontWeight={700} color="primary">ThreadsBot</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Threads自動投稿アプリ
          </Typography>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            fullWidth label="メールアドレス" type="email" value={email}
            onChange={e => setEmail(e.target.value)} required sx={{ mb: 2 }}
          />
          <TextField
            fullWidth label="パスワード" type="password" value={password}
            onChange={e => setPassword(e.target.value)} required sx={{ mb: 3 }}
          />
          <Button
            fullWidth type="submit" variant="contained" size="large"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={18} color="inherit" /> : null}
          >
            {loading ? 'ログイン中...' : 'ログイン'}
          </Button>
        </Box>

        {import.meta.env.DEV && (
          <Paper sx={{ mt: 3, p: 2, bgcolor: 'grey.50' }} variant="outlined">
            <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
              デモアカウント
            </Typography>
            <Typography variant="body2">demo@example.com / demo123</Typography>
            <Typography variant="body2">admin@example.com / admin123</Typography>
          </Paper>
        )}
      </Paper>
    </PublicLayout>
  );
}
