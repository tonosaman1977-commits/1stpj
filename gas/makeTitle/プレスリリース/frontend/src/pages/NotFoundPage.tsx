import { Box, Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';

export function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default' }}>
      <Typography variant="h1" fontWeight={700} color="primary">404</Typography>
      <Typography variant="h6" color="text.secondary" sx={{ mb: 3 }}>ページが見つかりません</Typography>
      <Button variant="contained" onClick={() => navigate('/dashboard')}>ダッシュボードに戻る</Button>
    </Box>
  );
}
