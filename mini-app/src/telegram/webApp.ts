interface TelegramWebApp {
  initData: string;
  ready: () => void;
  expand: () => void;
  colorScheme: 'light' | 'dark';
  openTelegramLink: (url: string) => void;
}

declare global {
  interface Window {
    Telegram?: { WebApp: TelegramWebApp };
  }
}

export function getTelegramWebApp(): TelegramWebApp | null {
  return window.Telegram?.WebApp ?? null;
}

export function getInitData(): string {
  return getTelegramWebApp()?.initData ?? '';
}
