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
