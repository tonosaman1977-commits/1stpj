import type { Components, Theme } from '@mui/material/styles';

export const components: Components<Theme> = {
  MuiButton: {
    styleOverrides: {
      root: {
        borderRadius: 8,
        padding: '8px 20px',
      },
      containedPrimary: {
        background: 'linear-gradient(135deg, #1a237e 0%, #283593 100%)',
        '&:hover': {
          background: 'linear-gradient(135deg, #283593 0%, #3949ab 100%)',
        },
      },
    },
  },
  MuiCard: {
    styleOverrides: {
      root: {
        borderRadius: 12,
        boxShadow: '0 2px 12px rgba(26,35,126,0.08)',
      },
    },
  },
  MuiPaper: {
    styleOverrides: {
      root: {
        borderRadius: 12,
      },
    },
  },
  MuiChip: {
    styleOverrides: {
      root: {
        borderRadius: 8,
        backgroundColor: '#e8eaf6',
        color: '#1a237e',
        fontWeight: 600,
      },
    },
  },
};
