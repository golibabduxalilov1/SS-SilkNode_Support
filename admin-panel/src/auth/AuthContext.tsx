import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { api, tokenStore } from '../api/client';

interface AdminUser {
  id: string;
  fullname: string | null;
  role: 'admin' | 'superadmin';
}

interface AuthContextValue {
  user: AdminUser | null;
  isAuthenticated: boolean;
  isLoadingUser: boolean;
  login: (token: string, user: AdminUser) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!tokenStore.get());
  const [isLoadingUser, setIsLoadingUser] = useState<boolean>(!!tokenStore.get());

  useEffect(() => {
    if (!tokenStore.get()) {
      setIsLoadingUser(false);
      return;
    }
    api
      .get('/admin/auth/me')
      .then((res) => setUser(res.data.data))
      .catch(() => {
        tokenStore.clear();
        setIsAuthenticated(false);
      })
      .finally(() => setIsLoadingUser(false));
  }, []);

  const login = (token: string, loggedInUser: AdminUser) => {
    tokenStore.set(token);
    setUser(loggedInUser);
    setIsAuthenticated(true);
  };

  const logout = () => {
    tokenStore.clear();
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isLoadingUser, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth AuthProvider ichida ishlatilishi kerak.');
  return ctx;
}
