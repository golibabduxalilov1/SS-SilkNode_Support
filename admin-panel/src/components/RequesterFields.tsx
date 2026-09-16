import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import { IconClose, IconPlus } from './icons';
import { useLanguage } from '../i18n/LanguageContext';

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
  const { t } = useLanguage();
  const [suggestion, setSuggestion] = useState<RequesterSuggestion | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [applied, setApplied] = useState(false);
  const debounceRef = useRef<number | null>(null);
  // Ism va telefon bo'yicha takliflar bir-birini o'zaro qayta ishga tushirib yubormasligi uchun:
  // biri tanlanib ikkinchi maydon dasturiy to'ldirilganda, shu maydonning o'z qidiruvi bir marta o'tkazib yuboriladi.
  const skipPhoneSearchRef = useRef(false);
  const skipNameSearchRef = useRef(false);

  // T20 (minimal versiya) — "+ Yana bir kontakt": bitta telefon uchun bir nechta ism, joriy
  // sodda F.I.O. matn maydoniga ", " bilan qo'shib yuboriladi (to'liq ma'lumot modeli/migratsiya
  // TZ doirasidan tashqarida — shu sababli alohida jadval emas, mavjud bitta maydon ishlatiladi).
  const [baseName, setBaseName] = useState(name);
  const [extraContacts, setExtraContacts] = useState<string[]>([]);

  const [nameSuggestions, setNameSuggestions] = useState<RequesterSuggestion[]>([]);
  const [showNameSuggestions, setShowNameSuggestions] = useState(false);
  const nameDebounceRef = useRef<number | null>(null);

  useEffect(() => {
    const combined = [baseName, ...extraContacts.map((c) => c.trim()).filter(Boolean)].join(', ');
    onNameChange(combined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseName, extraContacts]);

  useEffect(() => {
    if (skipPhoneSearchRef.current) {
      skipPhoneSearchRef.current = false;
      return;
    }
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

  useEffect(() => {
    if (skipNameSearchRef.current) {
      skipNameSearchRef.current = false;
      return;
    }
    const query = baseName.trim();
    if (query.length < 2) {
      setNameSuggestions([]);
      setShowNameSuggestions(false);
      return;
    }
    if (nameDebounceRef.current) window.clearTimeout(nameDebounceRef.current);
    nameDebounceRef.current = window.setTimeout(() => {
      api
        .get('/admin/requesters/search', { params: { name: query } })
        .then((res) => {
          setNameSuggestions(res.data.data as RequesterSuggestion[]);
          setShowNameSuggestions(true);
        })
        .catch(() => setNameSuggestions([]));
    }, 400);
    return () => {
      if (nameDebounceRef.current) window.clearTimeout(nameDebounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseName]);

  const handleApply = () => {
    if (!suggestion) return;
    if (suggestion.name) {
      skipNameSearchRef.current = true;
      setBaseName(suggestion.name);
    }
    onApplySuggestion?.(suggestion);
    setApplied(true);
  };

  const handleSelectName = (s: RequesterSuggestion) => {
    skipNameSearchRef.current = true;
    setBaseName(s.name ?? '');
    if (s.phone) {
      skipPhoneSearchRef.current = true;
      onPhoneChange(s.phone);
    }
    onApplySuggestion?.(s);
    setShowNameSuggestions(false);
    setNameSuggestions([]);
  };

  const showSuggestion = !!suggestion && !dismissed && !applied;
  const showNameDropdown = showNameSuggestions && nameSuggestions.length > 0;

  return (
    <>
      <label className="modal-field requester-name-field">
        <span>{t('requesterFields.fullName')}</span>
        <input
          value={baseName}
          onChange={(e) => setBaseName(e.target.value)}
          onFocus={() => nameSuggestions.length > 0 && setShowNameSuggestions(true)}
          onBlur={() => window.setTimeout(() => setShowNameSuggestions(false), 150)}
          placeholder={t('requesterFields.fullNamePlaceholder')}
          autoComplete="off"
          required
        />
        {showNameDropdown && (
          <ul className="requester-name-suggestions">
            {nameSuggestions.map((s) => (
              <li key={s.key}>
                <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => handleSelectName(s)}>
                  <span className="requester-name-suggestions-name">{s.name ?? t('requesterFields.unnamed')}</span>
                  {s.phone && <span className="requester-name-suggestions-phone">{s.phone}</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </label>
      {extraContacts.map((contact, i) => (
        <label className="modal-field" key={i}>
          <span>{t('requesterFields.extraContact')}</span>
          <div className="requester-extra-contact-row">
            <input
              value={contact}
              onChange={(e) =>
                setExtraContacts((prev) => prev.map((c, idx) => (idx === i ? e.target.value : c)))
              }
              placeholder={t('requesterFields.extraContactPlaceholder')}
            />
            <button
              type="button"
              className="requester-extra-contact-remove"
              aria-label={t('requesterFields.removeContact')}
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
        {t('requesterFields.addContact')}
      </button>
      <label className="modal-field">
        <span>{t('requesterFields.phoneLabel')}</span>
        <input
          value={phone}
          onChange={(e) => onPhoneChange(formatUzPhone(e.target.value))}
          placeholder="+998 90 123 45 67"
          className={phoneInvalid ? 'field-invalid' : undefined}
          required
        />
        {phoneInvalid && <p className="field-error">{t('requesterFields.phoneIncomplete')}</p>}
      </label>
      {showSuggestion && suggestion && (
        <div className="requester-suggestion">
          <p>
            {t('requesterFields.existingRequester')} <b>{suggestion.name ?? t('requesterFields.unnamed')}</b>
            {suggestion.organizationName ? `, ${suggestion.organizationName}` : ''}, {suggestion.ticketsCount}{' '}
            {t('requesterFields.ticketsCount')}
          </p>
          <div className="requester-suggestion-actions">
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setDismissed(true)}>
              {t('requesterFields.continueAsNew')}
            </button>
            <button type="button" className="btn btn-primary btn-sm" onClick={handleApply}>
              {t('requesterFields.selectRequester')}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
