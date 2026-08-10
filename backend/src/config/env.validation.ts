import { Logger } from '@nestjs/common';

const logger = new Logger('EnvValidation');

/**
 * .env.example'dagi namunaviy (placeholder) qiymatlar — bular haqiqiy
 * sozlama deb hisoblanmaydi, hatto bo'sh bo'lmasa ham.
 */
const PLACEHOLDER_MARKERS = [
  'example.com',
  'REPLACE_WITH',
  'change_me',
  'your_bot_username',
  'dev-secret-change-me',
];

function looksLikePlaceholder(value: string): boolean {
  const lower = value.toLowerCase();
  return PLACEHOLDER_MARKERS.some((marker) => lower.includes(marker.toLowerCase()));
}

/**
 * MINI_APP_URL uchun alohida eksport qilingan tekshiruv — bot.update.ts
 * xuddi shu qoidani ishlatadi, shunda ikkala joyda ham bir xil mantiq
 * qo'llaniladi (config qatlami va bot ishga tushish nuqtasi).
 */
export function isValidMiniAppUrl(value: string | undefined): boolean {
  const trimmed = (value || '').trim();
  if (!trimmed) return false;
  if (looksLikePlaceholder(trimmed)) return false;
  return trimmed.startsWith('https://');
}

interface EnvRule {
  key: string;
  required: boolean;
  /** Qiymat mavjud bo'lsa qo'shimcha tekshiruv; xato bo'lsa xabar qaytaradi. */
  extraCheck?: (value: string) => string | null;
}

const RULES: EnvRule[] = [
  {
    key: 'BOT_TOKEN',
    required: true,
    extraCheck: (value) => {
      if (looksLikePlaceholder(value)) {
        return "BotFather tokeni bilan almashtirilmagan (hali placeholder qiymat)";
      }
      if (!/^\d+:[\w-]+$/.test(value)) {
        return "format noto'g'ri (kutilgan ko'rinish: 123456789:AA...)";
      }
      return null;
    },
  },
  {
    key: 'MINI_APP_URL',
    required: true,
    extraCheck: (value) => {
      if (looksLikePlaceholder(value)) {
        return "hali haqiqiy domen bilan almashtirilmagan (placeholder qiymat)";
      }
      if (!value.startsWith('https://')) {
        return (
          "HTTPS bilan boshlanishi SHART — Telegram Mini App tugmasi " +
          "HTTP yoki localhost manzilni qabul qilmaydi va \"Webview crashed\" " +
          "xatosi bilan yopiladi"
        );
      }
      return null;
    },
  },
  { key: 'DB_HOST', required: true },
  { key: 'DB_PORT', required: true },
  { key: 'DB_USERNAME', required: true },
  { key: 'DB_PASSWORD', required: true },
  { key: 'DB_DATABASE', required: true },
  {
    key: 'JWT_SECRET',
    required: true,
    extraCheck: (value) => {
      if (looksLikePlaceholder(value)) {
        return "hali xavfsiz tasodifiy qiymat bilan almashtirilmagan (placeholder/standart qiymat)";
      }
      if (value.length < 16) {
        return 'juda qisqa (xavfsizlik uchun kamida 16 belgi tavsiya etiladi)';
      }
      return null;
    },
  },
];

/**
 * ConfigModule.forRoot({ validate }) orqali chaqiriladi — bootstrap
 * boshida, TypeORM ulanishga urinishidan OLDIN ishlaydi. Production'da
 * xato topilsa ilova butunlay ishga tushmaydi (fail-fast): noto'g'ri yoki
 * placeholder qiymat bilan "jim" ishga tushish keyinchalik tushunarsiz
 * runtime xatolarga (masalan Mini App'da "Webview crashed") olib keladi.
 * Development'da faqat ogohlantirish beriladi, ishlash davom etadi.
 */
export function validateEnv(config: Record<string, unknown>): Record<string, unknown> {
  const isProduction = config.NODE_ENV === 'production';
  const errors: string[] = [];

  for (const rule of RULES) {
    const raw = config[rule.key];
    const value = typeof raw === 'string' ? raw.trim() : '';

    if (!value) {
      if (rule.required) errors.push(`${rule.key} — sozlanmagan (.env faylida yo'q yoki bo'sh)`);
      continue;
    }

    const extraError = rule.extraCheck?.(value);
    if (extraError) errors.push(`${rule.key} — ${extraError}`);
  }

  if (errors.length > 0) {
    const message = [
      'Muhit o\'zgaruvchilari (.env) sozlamasida xatolar topildi:',
      ...errors.map((e) => `  - ${e}`),
    ].join('\n');

    if (isProduction) {
      throw new Error(message);
    }

    logger.warn(`${message}\n(Development muhitida davom etilmoqda — production'da bular MAJBURIY.)`);
  }

  return config;
}
