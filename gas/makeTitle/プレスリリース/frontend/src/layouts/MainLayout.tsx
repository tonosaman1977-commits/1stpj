import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box, Drawer, AppBar, Toolbar, Typography, IconButton,
  List, ListItem, ListItemButton, ListItemIcon, ListItemText,
  Avatar, Menu, MenuItem, useMediaQuery, useTheme,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import LabelIcon from '@mui/icons-material/Label';
import ScheduleIcon from '@mui/icons-material/Schedule';
import HistoryIcon from '@mui/icons-material/History';
import { useAuth } from '../contexts/AuthContext';

const DRAWER_WIDTH = 220;

const NAV_ITEMS = [
  { label: 'ダッシュボード', path: '/dashboard', icon: <DashboardIcon /> },
  { label: 'テーマ管理', path: '/themes', icon: <LabelIcon /> },
  { label: 'スケジュール', path: '/schedule', icon: <ScheduleIcon /> },
  { label: '投稿履歴', path: '/history', icon: <HistoryIcon /> },
];

export function MainLayout({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const drawerContent = (
    <Box sx={{ height: '100%', background: '#1a237e', color: '#fff' }}>
      <Box sx={{ p: 2.5, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <Typography variant="h6" fontWeight={700} color="#40c4ff">ThreadsBot</Typography>
      </Box>
      <List sx={{ pt: 1 }}>
        {NAV_ITEMS.map(item => (
          <ListItem key={item.path} disablePadding>
            <ListItemButton
              selected={location.pathname === item.path}
              onClick={() => { navigate(item.path); if (isMobile) setMobileOpen(false); }}
              sx={{
                mx: 1, borderRadius: 2, mb: 0.5,
                color: '#9fa8da',
                '&.Mui-selected': {
                  background: 'rgba(64,196,255,0.15)',
                  color: '#40c4ff',
                  borderLeft: '3px solid #40c4ff',
                },
                '&:hover': { background: 'rgba(255,255,255,0.05)', color: '#fff' },
              }}
            >
              <ListItemIcon sx={{ color: 'inherit', minWidth: 36 }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} primaryTypographyProps={{ fontSize: 14, fontWeight: 500 }} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{ zIndex: theme.zIndex.drawer + 1, bgcolor: '#fff', borderBottom: '1px solid #e8eaf6' }}
      >
        <Toolbar>
          {isMobile && (
            <IconButton edge="start" onClick={() => setMobileOpen(true)} sx={{ mr: 1, color: '#1a237e' }}>
              <MenuIcon />
            </IconButton>
          )}
          <Typography variant="h6" fontWeight={700} color="primary" sx={{ flexGrow: 1 }}>
            {NAV_ITEMS.find(n => n.path === location.pathname)?.label ?? 'ThreadsBot'}
          </Typography>
          <IconButton onClick={e => setAnchorEl(e.currentTarget)}>
            <Avatar sx={{ width: 34, height: 34, bgcolor: '#1a237e', fontSize: 14 }}>
              {user?.name.charAt(0)}
            </Avatar>
          </IconButton>
          <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
            <MenuItem disabled><Typography variant="caption" color="text.secondary">{user?.email}</Typography></MenuItem>
            <MenuItem onClick={() => { logout(); navigate('/login'); setAnchorEl(null); }}>ログアウト</MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {isMobile ? (
        <Drawer variant="temporary" open={mobileOpen} onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{ '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box' } }}
        >
          {drawerContent}
        </Drawer>
      ) : (
        <Drawer variant="permanent"
          sx={{ width: DRAWER_WIDTH, flexShrink: 0, '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box', border: 'none' } }}
        >
          {drawerContent}
        </Drawer>
      )}

      <Box component="main" sx={{ flexGrow: 1, p: 3, mt: 8 }}>
        {children}
      </Box>
    </Box>
  );
}
