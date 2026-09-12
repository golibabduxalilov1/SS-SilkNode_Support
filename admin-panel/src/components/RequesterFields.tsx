import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import { IconClose, IconPlus } from './icons';

export interface RequesterSuggestion {
  key: string;
  name: string | null;
  phone: string | null;
  organizationId: string | null;
  organizationName: string | null;
  ticketsCount: number;
}

/** T05 — kiritish jarayonida "+998 ## ### ## ##" ko'rinishiga avtomatik formatlaydi. */
export function formatUzPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '').replace(/^998/, '').slice(0, 9);
  if (!digits) return raw.trim().startsWith('+') || raw.trim() === '' ? raw : `+998${digits}`;
  let out = '+998';
  if (digits.length > 0) out += ` ${digits.slice(0, 2)}`;
  if (digits.length > 2) out += ` ${digits.slice(2, 5)}`;
  if (digits.length > 5) out += ` ${digits.slice(5, 7)}`;
  if (digits.length > 7) out += ` ${digits.slice(7, 9)}`;
  return out;
}

export function isPhoneComplete(phone: string): boolean {
  return phone.replace(/\D/g, '').replace(/^998/, '').length === 9;
}

interface RequesterFieldsProps {
  name: string;
  phone: string;
  onNameChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  /** Taklif tanlanganda ism avtomatik to'ldirilgandan tashqari qo'shimcha maydonlarni (masalan, tashkilot) to'ldirish uchun. */
  onApplySuggestion?: (suggestion: RequesterSuggestion) => void;
  phoneInvalid?: boolean;
}

/**
 * Murojaatchi F.I.O. + telefon maydonlari — T03 (mavjud murojaatchini taklif qilish) va T05
 * (telefon maskasi/validatsiya) shu yerda birgalikda amalga oshirilgan (ikkalasi ham bir xil
 * inputga tegishli). "Yangi murojaat" va "Eski murojaat" formalarida qayta ishlatiladi.
 */
export function RequesterFields({
  name,
  phone,
  onNameChange,
  onPhoneChange,
  onApplySuggestion,
  phoneInvalid,
}: RequesterFieldsProps) {
  const [suggestion, setSuggestion] = useState<RequesterSuggestion | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [applied, setApplied] = useState(false);
  const debounceRef = useRef<number | null>(null);

  // T20 (minimal versiya) — "+ Yana bir kontakt": bitta telefon uchun bir nechta ism, joriy
  // sodda F.I.O. matn maydoniga ", " bilan qo'shib yuboriladi (to'liq ma'lumot modeli/migratsiya
  // TZ doirasidan tashqarida — shu sababli alohida jadval emas, mavjud bitta maydon ishlatiladi).
  const [baseName, setBaseName] = useState(name);
  const [extraContacts, setExtraContacts] = useState<string[]>([]);

  useEffect(() => {
    const combined = [baseName, ...extraContacts.map((c) => c.trim()).filter(Boolean)].join(', ');
    onNameChange(combined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseName, extraContacts]);

  useEffect(() => {
    setDismissed(false);
    setApplied(false);
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 7) {
      setSuggestion(null);
      return;
    }
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      api
        .get('/admin/requesters/search', { params: { phone } })
        .then((res) => setSuggestion((res.data.data as RequesterSuggestion[])[0] ?? null))
        .catch(() => setSuggestion(null));
    }, 400);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phone]);

  const handleApply = () => {
    if (!suggestion) return;
    if (suggestion.name) setBaseName(suggestion.name);
    onApplySuggestion?.(suggestion);
    setApplied(true);
  };

  const showSuggestion = !!suggestion && !dismissed && !applied;

  return (
    <>
      <label className="modal-field">
        <span>Murojaatchi F.I.O.</span>
        <input
          value={baseName}
          onChange={(e) => setBaseName(e.target.value)}
          placeholder="Murojaatchining to'liq ismi"
          required
        />
      </label>
      {extraContacts.map((contact, i) => (
        <label className="modal-field" key={i}>
          <span>Yana bir kontakt</span>
          <div className="requester-extra-contact-row">
            <input
              value={contact}
              onChange={(e) =>
                setExtraContacts((prev) => prev.map((c, idx) => (idx === i ? e.target.value : c)))
              }
              placeholder="Masalan, Aziz aka"
            />
            <button
              type="button"
              className="requester-extra-contact-remove"
              aria-label="Kontaktni o'chirish"
              onClick={() => setExtraContacts((prev) => prev.filter((_, idx) => idx !== i))}
            >
              <IconClose width={13} height={13} />
            </button>
          </div>
        </label>
      ))}
      <button
        type="button"
        className="btn btn-secondary btn-sm requester-add-contact"
        onClick={() => setExtraContacts((prev) => [...prev, ''])}
      >
        <IconPlus width={13} height={13} />
        Yana bir kontakt
      </button>
      <label className="modal-field">
        <span>Murojaatchi telefon raqami</span>
        <input
          value={phone}
          onChange={(e) => onPhoneChange(formatUzPhone(e.target.value))}
          placeholder="+998 90 123 45 67"
          className={phoneInvalid ? 'field-invalid' : undefined}
          required
        />
        {phoneInvalid && <p className="field-error">Telefon raqami to'liq emas</p>}
      </label>
      {showSuggestion && suggestion && (
        <div className="requester-suggestion">
          <p>
            Bu raqam allaqachon mavjud: <b>{suggestion.name ?? 'Nomsiz'}</b>
            {suggestion.organizationName ? `, ${suggestion.organizationName}` : ''}, {suggestion.ticketsCount} ta
            murojaat
          </p>
          <div className="requester-suggestion-actions">
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setDismissed(true)}>
              Yangi murojaatchi sifatida davom etish
            </button>
            <button type="button" className="btn btn-primary btn-sm" onClick={handleApply}>
              Shu murojaatchini tanlash
            </button>
          </div>
        </div>
      )}
    </>
  );
}
