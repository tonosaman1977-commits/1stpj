import { createContext, useContext, useState, type ReactNode } from 'react';
import type { User, AuthState } from '../types';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const MOCK_USERS: { email: string; password: string; user: User }[] = [
  { email: 'demo@example.com', password: 'demo123', user: { id: '1', email: 'demo@example.com', name: 'デモユーザー', role: 'user' } },
  { email: 'admin@example.com', password: 'admin123', user: { id: '2', email: 'admin@example.com', name: '管理者', role: 'user' } },
];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>(() => {
    const saved = localStorage.getItem('auth');
    if (saved) {
      try { return JSON.parse(saved); } catch { /* ignore */ }
    }
    return { user: null, token: null, isAuthenticated: false };
  });

  const login = async (email: string, password: string) => {
    const match = MOCK_USERS.find(u => u.email === email && u.password === password);
    if (!match) throw new Error('メールアドレスまたはパスワードが正しくありません');
    const state: AuthState = { user: match.user, token: 'mock-token-' + match.user.id, isAuthenticated: true };
    setAuthState(state);
    localStorage.setItem('auth', JSON.stringify(state));
  };

  const logout = () => {
    setAuthState({ user: null, token: null, isAuthenticated: false });
    localStorage.removeItem('auth');
  };

  return (
    <AuthContext.Provider value={{ ...authState, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
