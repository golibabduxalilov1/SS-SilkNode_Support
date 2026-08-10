import axios from 'axios';

const TOKEN_KEY = 'silknode_admin_token';

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1',
});

// Web Admin Panel Mini App bilan hech qanday umumiy sessiya/token'ga ega
// emas (bo'lim 5.3) — o'zining mustaqil JWT'sini shu klientda saqlaydi.
api.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      tokenStore.clear();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);
