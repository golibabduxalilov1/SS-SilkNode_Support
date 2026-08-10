import * as crypto from 'crypto';

export interface TelegramInitDataUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
}

export interface ParsedInitData {
  user: TelegramInitDataUser;
  authDate: number;
}

const MAX_INIT_DATA_AGE_SECONDS = 24 * 60 * 60; // 1 kun

/**
 * Telegram WebApp initData'ni tekshiradi (rasmiy algoritm):
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 *
 * 1) secretKey = HMAC_SHA256("WebAppData", botToken)
 * 2) dataCheckString = hash'dan tashqari barcha juftliklar "key=value",
 *    alifbo tartibida, "\n" bilan birlashtirilgan
 * 3) hisoblangan hash = HMAC_SHA256(dataCheckString, secretKey) hex ko'rinishida
 * 4) hisoblangan hash so'rovdagi hash bilan taqqoslanadi (constant-time)
 */
export function validateTelegramInitData(
  initData: string,
  botToken: string,
): ParsedInitData | null {
  if (!initData || !botToken) return null;

  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) return null;
  params.delete('hash');

  const dataCheckString = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const computedHash = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');

  const hashBuffer = Buffer.from(hash, 'hex');
  const computedBuffer = Buffer.from(computedHash, 'hex');
  if (
    hashBuffer.length !== computedBuffer.length ||
    !crypto.timingSafeEqual(hashBuffer, computedBuffer)
  ) {
    return null;
  }

  const authDate = Number(params.get('auth_date') || 0);
  if (!authDate || Date.now() / 1000 - authDate > MAX_INIT_DATA_AGE_SECONDS) {
    return null;
  }

  const userRaw = params.get('user');
  if (!userRaw) return null;

  const user = JSON.parse(userRaw) as TelegramInitDataUser;
  return { user, authDate };
}
