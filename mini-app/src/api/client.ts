import axios from 'axios';
import { getInitData } from '../telegram/webApp';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1',
});

// TALAB 1: har bir so'rovga Telegram initData'ni qo'shamiz — backend
// (TelegramAuthGuard) shuni tekshiradi. Bo'lim 4.2, 4.3.
api.interceptors.request.use((config) => {
  config.headers['X-Telegram-Init-Data'] = getInitData();
  return config;
});
