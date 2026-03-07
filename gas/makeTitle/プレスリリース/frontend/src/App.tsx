import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline, GlobalStyles } from '@mui/material';
import { theme } from './theme';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ThemesPage } from './pages/ThemesPage';
import { SchedulePage } from './pages/SchedulePage';
import { HistoryPage } from './pages/HistoryPage';
import { NotFoundPage } from './pages/NotFoundPage';

const globalStyles = (
  <GlobalStyles styles={{ body: { backgroundColor: theme.palette.background.default } }} />
);

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {globalStyles}
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
            <Route path="/themes" element={<ProtectedRoute><ThemesPage /></ProtectedRoute>} />
            <Route path="/schedule" element={<ProtectedRoute><SchedulePage /></ProtectedRoute>} />
            <Route path="/history" element={<ProtectedRoute><HistoryPage /></ProtectedRoute>} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
