import { useState } from 'react';
import {
  Box, Paper, Typography, TextField, Button,
  Alert, CircularProgress, Divider, Link,
} from '@mui/material';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { PublicLayout } from '../layouts/PublicLayout';
import { apiFetch } from '../services/api/client';

export function LoginPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, isAuthenticated, setAuth } = useAuth();
  const navigate = useNavigate();

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        const res = await apiFetch<{ user: object; token: string }>('/api/auth/register', {
          method: 'POST',
          body: JSON.stringify({ email, name, password }),
        });
        setAuth(res);
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : mode === 'login' ? 'ログインに失敗しました' : '登録に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PublicLayout>
      <Paper sx={{ p: 4, width: '100%', maxWidth: 400, mx: 2 }}>
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Typography variant="h5" fontWeight={700} color="primary">AI Agent</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {mode === 'login' ? 'アカウントにログイン' : '新規アカウント作成'}
          </Typography>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Box component="form" onSubmit={handleSubmit}>
          {mode === 'register' && (
            <TextField
              fullWidth label="表示名" value={name}
              onChange={e => setName(e.target.value)} required sx={{ mb: 2 }}
            />
          )}
          <TextField
            fullWidth label="メールアドレス" type="email" value={email}
            onChange={e => setEmail(e.target.value)} required sx={{ mb: 2 }}
          />
          <TextField
            fullWidth label="パスワード" type="password" value={password}
            onChange={e => setPassword(e.target.value)} required
            helperText={mode === 'register' ? '8文字以上' : undefined}
            sx={{ mb: 3 }}
          />
          <Button
            fullWidth type="submit" variant="contained" size="large"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={18} color="inherit" /> : null}
          >
            {loading ? '処理中...' : mode === 'login' ? 'ログイン' : 'アカウント作成'}
          </Button>
        </Box>

        <Divider sx={{ my: 2 }} />
        <Box sx={{ textAlign: 'center' }}>
          {mode === 'login' ? (
            <Typography variant="body2">
              アカウントをお持ちでない方は{' '}
              <Link component="button" onClick={() => { setMode('register'); setError(''); }}>
                新規登録
              </Link>
            </Typography>
          ) : (
            <Typography variant="body2">
              すでにアカウントをお持ちの方は{' '}
              <Link component="button" onClick={() => { setMode('login'); setError(''); }}>
                ログイン
              </Link>
            </Typography>
          )}
        </Box>
      </Paper>
    </PublicLayout>
  );
}
