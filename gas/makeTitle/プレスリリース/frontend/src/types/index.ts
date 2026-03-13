export interface User {
  id: string;
  email: string;
  name: string;
  role: 'user';
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

export interface PostTheme {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  createdAt: string;
}

export interface ScheduleTime {
  id: string;
  time: string; // HH:MM
  enabled: boolean;
}

export interface PostHistory {
  id: string;
  themeId: string;
  themeName: string;
  content: string;
  postedAt: string;
  status: 'success' | 'failed';
  errorMessage?: string;
}

export interface SnsStatus {
  connected: boolean;
  platform: string;
  sns_user_id: string | null;
  token_expires_at: string | null;
  is_expired: boolean;
}

export const API_PATHS = {
  AUTH: {
    LOGIN: '/api/auth/login',
    LOGOUT: '/api/auth/logout',
  },
  THEMES: {
    LIST: '/api/themes',
    CREATE: '/api/themes',
    UPDATE: (id: string) => `/api/themes/${id}`,
    DELETE: (id: string) => `/api/themes/${id}`,
    ACTIVATE: (id: string) => `/api/themes/${id}/activate`,
  },
  SCHEDULE: {
    LIST: '/api/schedule',
    UPDATE: '/api/schedule',
  },
  HISTORY: {
    LIST: '/api/history',
  },
  SNS: {
    STATUS: '/api/sns/status',
    DISCONNECT: '/api/sns/disconnect',
    AUTHORIZE_URL: '/api/auth/threads/authorize-url',
  },
} as const;
