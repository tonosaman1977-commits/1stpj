import { Box } from '@mui/material';
import type { ReactNode } from 'react';

export function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1a237e 0%, #283593 50%, #3949ab 100%)',
      }}
    >
      {children}
    </Box>
  );
}
