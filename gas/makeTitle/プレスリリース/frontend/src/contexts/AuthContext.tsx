import { createContext, useContext, useState, type ReactNode } from 'react';
import type { AuthState } from '../types';
import { apiLogin, apiLogout } from '../services/api/auth';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>(() => {
    const saved = localStorage.getItem('auth');
    if (saved) {
      try { return JSON.parse(saved); } catch { /* ignore */ }
    }
    return { user: null, token: null, isAuthenticated: false };
  });

  const login = async (email: string, password: string) => {
    const { user, token } = await apiLogin(email, password);
    const state: AuthState = { user, token, isAuthenticated: true };
    setAuthState(state);
    localStorage.setItem('auth', JSON.stringify(state));
  };

  const logout = async () => {
    try { await apiLogout(); } catch { /* ignore logout errors */ }
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
