import { useEffect, useState } from 'react';
import { api } from '../api/client';

export type UserRole = 'user' | 'admin' | 'superadmin';

export interface AuthStatus {
  role: UserRole;
  isStarted: boolean;
  isPhoneVerified: boolean;
  fullname: string | null;
}

interface UseCurrentUserResult {
  status: AuthStatus | null;
  isLoading: boolean;
  error: string | null;
}

/** GET /auth/status — bo'lim 6.1. Mini App ochilganda birinchi navbatda chaqiriladi. */
export function useCurrentUser(): UseCurrentUserResult {
  const [status, setStatus] = useState<AuthStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    api
      .get('/auth/status')
      .then((res) => {
        if (!cancelled) setStatus(res.data.data);
      })
      .catch(() => {
        if (!cancelled) setError('Foydalanuvchi holatini olib bo\'lmadi.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { status, isLoading, error };
}
