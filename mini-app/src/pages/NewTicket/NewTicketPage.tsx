import { FormEvent, useState } from 'react';
import { api } from '../../api/client';
import { AuthStatus } from '../../hooks/useCurrentUser';
import { WarningBanner } from './WarningBanner';

const CATEGORIES = ['Uskuna', 'Dastur', 'Tarmoq', 'Boshqa'];
const PRIORITIES = [
  { value: 'low', label: 'Past' },
  { value: 'medium', label: "O'rta" },
  { value: 'high', label: 'Yuqori' },
  { value: 'critical', label: 'Kritik' },
];

interface NewTicketPageProps {
  status: AuthStatus;
  onCreated: () => void;
}

/**
 * Bo'lim 4.2: "Murojaat yuborish" tugmasi faqat is_started && is_phone_verified
 * bo'lganda faol. Yakuniy tekshiruv baribir backend'da (verifyUserEligibility).
 */
export function NewTicketPage({ status, onCreated }: NewTicketPageProps) {
  const canSubmit = status.isStarted && status.isPhoneVerified;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [priority, setPriority] = useState('medium');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setIsSubmitting(true);
    setError(null);
    try {
      await api.post('/tickets', { title, description, category, priority });
      setTitle('');
      setDescription('');
      onCreated();
    } catch (err: any) {
      const message = err?.response?.data?.error?.message ?? 'Xatolik yuz berdi.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!canSubmit) {
    return <WarningBanner />;
  }

  return (
    <form className="ticket-form" onSubmit={handleSubmit}>
      <h2>Yangi murojaat</h2>

      <label>
        Mavzu
        <input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={255} />
      </label>

      <label>
        Kategoriya
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>

      <label>
        Muhimlik
        <select value={priority} onChange={(e) => setPriority(e.target.value)}>
          {PRIORITIES.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </label>

      <label>
        Tavsif
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          rows={5}
        />
      </label>

      {error && <p className="form-error">{error}</p>}

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Yuborilmoqda...' : 'Yuborish'}
      </button>
    </form>
  );
}
