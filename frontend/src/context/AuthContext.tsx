import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api, clearAuth, setToken } from '../lib/api';

type AuthContextType = {
  user: any;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
};
const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(() => {
    const saved = localStorage.getItem('auth_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const token = localStorage.getItem('auth_token');
    
    if (!token) {
      setLoading(false);
      return;
    }

    api.get('/auth/me')
      .then((res: any) => {
        if (!active) return;
        const u = res.user || res.data || res;
        if (u && u.id) {
          setUser(u);
          localStorage.setItem('auth_user', JSON.stringify(u));
        } else {
          clearAuth();
          setUser(null);
        }
      })
      .catch((err) => {
        console.warn('Auth failed, starting in unauthenticated state', err);
        if (active) {
          clearAuth();
          setUser(null);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
      
    return () => { active = false; };
  }, []);

  async function login(email: string, password: string) {
    const res: any = await api.post('/auth/login', { email, password });
    const token = res.token || res.accessToken || res.data?.token;
    const u = res.user || res.data?.user || null;
    if (token) setToken(token);
    if (u && u.id) {
      setUser(u);
      localStorage.setItem('auth_user', JSON.stringify(u));
    }
  }

  async function register(name: string, email: string, password: string) {
    const res: any = await api.post('/auth/register', { name, email, password });
    const token = res.token || res.accessToken || res.data?.token;
    const u = res.user || res.data?.user || null;
    if (token) setToken(token);
    if (u && u.id) {
      setUser(u);
      localStorage.setItem('auth_user', JSON.stringify(u));
    }
  }

  function logout() {
    api.post('/auth/logout').catch(() => {});
    clearAuth();
    setUser(null);
    window.location.href = '/login';
  }

  const value = useMemo(() => ({ user, loading, login, register, logout }), [user, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
