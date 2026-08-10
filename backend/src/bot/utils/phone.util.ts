import { parsePhoneNumberFromString } from 'libphonenumber-js';

/** Telegram contact.phone_number'ni E.164 formatga keltiradi (masalan, +998901234567). */
export function normalizeToE164(rawPhoneNumber: string): string {
  const withPlus = rawPhoneNumber.startsWith('+') ? rawPhoneNumber : `+${rawPhoneNumber}`;
  const parsed = parsePhoneNumberFromString(withPlus);
  return parsed ? parsed.number : withPlus;
}
