import { createContext, ReactNode, useContext, useState } from 'react';
import { tokenStore } from '../api/client';

interface AdminUser {
  id: string;
  fullname: string | null;
  role: 'admin' | 'superadmin';
}

interface AuthContextValue {
  user: AdminUser | null;
  isAuthenticated: boolean;
  login: (token: string, user: AdminUser) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!tokenStore.get());

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
    <AuthContext.Provider value={{ user, isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth AuthProvider ichida ishlatilishi kerak.');
  return ctx;
}
