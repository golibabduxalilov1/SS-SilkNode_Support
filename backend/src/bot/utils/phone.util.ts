import { parsePhoneNumberFromString } from 'libphonenumber-js';

/** Telegram contact.phone_number'ni E.164 formatga keltiradi (masalan, +998901234567). */
export function normalizeToE164(rawPhoneNumber: string): string {
  const withPlus = rawPhoneNumber.startsWith('+') ? rawPhoneNumber : `+${rawPhoneNumber}`;
  const parsed = parsePhoneNumberFromString(withPlus);
  return parsed ? parsed.number : withPlus;
}

/**
 * Admin panelda qo'lda kiritilgan requesterPhone'ni DTO validatsiyasidan oldin normallashtirish
 * uchun (T05 — telefon maskasi/validatsiya). Bo'sh qiymatni @IsOptional() to'g'ri o'tkazib
 * yuborishi uchun undefined qaytaradi — aks holda bo'sh string @IsPhoneNumber'ni sindiradi.
 */
export function normalizePhoneOrUndefined(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value.trim()) return undefined;
  return normalizeToE164(value.trim());
}
