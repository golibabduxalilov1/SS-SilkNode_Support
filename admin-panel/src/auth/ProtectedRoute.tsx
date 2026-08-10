import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './AuthContext';

/** Web Admin Panel'ning yagona kirish nuqtasi (bo'lim 5.3) — login/parol shart. */
export function ProtectedRoute() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}
