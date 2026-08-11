import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import { api } from '../../api/client';
import { AuthStatus } from '../../hooks/useCurrentUser';
import { WarningBanner } from './WarningBanner';
import { IconSend } from '../../components/icons';

const PRIORITIES = [
  { value: 'low', label: 'Past' },
  { value: 'medium', label: "O'rta" },
  { value: 'high', label: 'Yuqori' },
  { value: 'critical', label: 'Kritik' },
];

interface Organization {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
}

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

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [organizationId, setOrganizationId] = useState('');
  const [customOrgName, setCustomOrgName] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!canSubmit) return;
    api
      .get('/organizations')
      .then((res) => setOrganizations(res.data.data))
      .catch(() => setOrganizations([]));
    api
      .get('/categories')
      .then((res) => setCategories(res.data.data))
      .catch(() => setCategories([]));
  }, [canSubmit]);

  const handleFilesChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFiles(e.target.files ? Array.from(e.target.files) : []);
  };

  const isOtherOrg = organizationId === '__other__';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !categoryId) return;
    if (isOtherOrg ? !customOrgName.trim() : !organizationId) return;

    setIsSubmitting(true);
    setError(null);
    try {
      let resolvedOrganizationId = organizationId;
      if (isOtherOrg) {
        try {
          const orgRes = await api.post('/organizations', { name: customOrgName.trim() });
          resolvedOrganizationId = orgRes.data.data.id;
        } catch {
          setError('Tashkilot yaratib bo\'lmadi.');
          setIsSubmitting(false);
          return;
        }
      }

      const res = await api.post('/tickets', {
        title,
        description,
        categoryId,
        priority,
        organizationId: resolvedOrganizationId,
      });
      const ticketId = res.data.data.id;

      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        await api.post(`/tickets/${ticketId}/attachments`, formData);
      }

      setTitle('');
      setDescription('');
      setFiles([]);
      setCustomOrgName('');
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
        Tashkilot
        <select
          value={organizationId}
          onChange={(e) => setOrganizationId(e.target.value)}
          required
        >
          <option value="" disabled>
            Tanlang...
          </option>
          {organizations.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
          <option value="__other__">Boshqa</option>
        </select>
        {isOtherOrg && (
          <input
            type="text"
            value={customOrgName}
            onChange={(e) => setCustomOrgName(e.target.value)}
            placeholder="Tashkilot nomini kiriting"
            required
          />
        )}
      </label>

      <label>
        Mavzu
        <input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={255} />
      </label>

      <label>
        Kategoriya
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          required
        >
          <option value="" disabled>
            Tanlang...
          </option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
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

      <label>
        Fayl biriktirish
        <input type="file" multiple onChange={handleFilesChange} />
      </label>
      {files.length > 0 && (
        <p className="file-list">{files.map((f) => f.name).join(', ')}</p>
      )}

      {error && <p className="form-error">{error}</p>}

      <button
        type="submit"
        disabled={
          isSubmitting ||
          !categoryId ||
          (isOtherOrg ? !customOrgName.trim() : !organizationId)
        }
      >
        <IconSend width={15} height={15} />
        {isSubmitting ? 'Yuborilmoqda...' : 'Yuborish'}
      </button>
    </form>
  );
}
