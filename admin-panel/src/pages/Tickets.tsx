import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { AppShell } from '../components/AppShell';
import { ConfirmModal } from '../components/ConfirmModal';
import {
  IconClose,
  IconHistory,
  IconInbox,
  IconPlus,
  IconSearch,
  IconTicketNew,
  IconTrash,
} from '../components/icons';
import { Avatar, EmptyState, Pagination, TableSkeleton } from '../components/ui';

interface Message {
  id: string;
  text: string;
  createdAt: string;
}

interface Ticket {
  id: string;
  number: string;
  title: string;
  categoryEntity?: { id: string; name: string } | null;
  priority: string;
  status: string;
  createdAt: string;
  closedAt?: string | null;
  organization?: { id: string; name: string } | null;
  createdBy?: { fullname: string | null; phoneNumber: string | null } | null;
  requesterName?: string | null;
  requesterPhone?: string | null;
  assignedTo?: { id: string; fullname: string | null } | null;
  messages?: Message[];
}

interface Organization {
  id: string;
  name: string;
}

interface AdminUser {
  id: string;
  fullname: string | null;
  role: string;
}

interface Category {
  id: string;
  name: string;
}

const STATUS_OPTIONS = [
  { value: 'new', label: 'Yangi' },
  { value: 'in_progress', label: 'Jarayonda' },
  { value: 'waiting_user', label: 'Javob kutilmoqda' },
  { value: 'resolved', label: 'Yechilgan' },
  { value: 'closed', label: 'Yopilgan' },
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Past' },
  { value: 'medium', label: "O'rta" },
  { value: 'high', label: 'Yuqori' },
  { value: 'critical', label: 'Kritik' },
];

const PAGE_SIZE = 15;

interface CreateTicketForm {
  title: string;
  description: string;
  categoryId: string;
  customCategoryName: string;
  priority: string;
  organizationId: string;
  customOrgName: string;
  requesterName: string;
  requesterPhone: string;
  files: File[];
}

const EMPTY_CREATE_FORM: CreateTicketForm = {
  title: '',
  description: '',
  categoryId: '',
  customCategoryName: '',
  priority: 'medium',
  organizationId: '',
  customOrgName: '',
  requesterName: '',
  requesterPhone: '',
  files: [],
};

function CreateTicketChoiceModal({
  isOpen,
  onClose,
  onSelectNew,
  onSelectLegacy,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSelectNew: () => void;
  onSelectLegacy: () => void;
}) {
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-card modal-card-sm">
        <div className="modal-header">
          <h3>Murojaat yasash</h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Yopish">
            <IconClose width={18} height={18} />
          </button>
        </div>
        <div className="modal-body">
          <button type="button" className="choice-option" onClick={onSelectNew}>
            <span className="choice-option-icon">
              <IconTicketNew width={18} height={18} />
            </span>
            <span className="choice-option-text">
              <span className="choice-option-title">Yangi murojaat qo'shish</span>
              <span className="choice-option-desc">Hozir kelib tushgan murojaatni ro'yxatdan o'tkazish</span>
            </span>
          </button>
          <button type="button" className="choice-option" onClick={onSelectLegacy}>
            <span className="choice-option-icon">
              <IconHistory width={18} height={18} />
            </span>
            <span className="choice-option-text">
              <span className="choice-option-title">Eski murojaat qo'shish</span>
              <span className="choice-option-desc">Avval boshqa joyda yuritilgan arxiv murojaatni kiritish</span>
            </span>
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function CreateTicketModal({
  isOpen,
  organizations,
  categories,
  onClose,
  onSubmit,
  isSaving,
  error,
}: {
  isOpen: boolean;
  organizations: Organization[];
  categories: Category[];
  onClose: () => void;
  onSubmit: (form: CreateTicketForm) => void;
  isSaving: boolean;
  error: string | null;
}) {
  const [form, setForm] = useState<CreateTicketForm>(EMPTY_CREATE_FORM);

  useEffect(() => {
    if (isOpen) setForm(EMPTY_CREATE_FORM);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isOtherCategory = form.categoryId === '__other__';
  const isOtherOrg = form.organizationId === '__other__';

  const disabled =
    isSaving ||
    !form.title.trim() ||
    !form.description.trim() ||
    !form.categoryId ||
    !form.requesterName.trim() ||
    !form.requesterPhone.trim() ||
    (isOtherCategory && !form.customCategoryName.trim()) ||
    (isOtherOrg && !form.customOrgName.trim());

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (disabled) return;
    onSubmit(form);
  };

  const handleFilesChange = (e: ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, files: e.target.files ? Array.from(e.target.files) : [] }));
  };

  return createPortal(
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-card">
        <div className="modal-header">
          <span className="modal-header-icon">
            <IconTicketNew width={18} height={18} />
          </span>
          <h3>Yangi murojaat</h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Yopish">
            <IconClose width={18} height={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <p className="form-error">{error}</p>}
            <label className="modal-field">
              <span>Murojaatchi F.I.O.</span>
              <input
                value={form.requesterName}
                onChange={(e) => setForm((f) => ({ ...f, requesterName: e.target.value }))}
                placeholder="Murojaatchining to'liq ismi"
                required
              />
            </label>
            <label className="modal-field">
              <span>Murojaatchi telefon raqami</span>
              <input
                value={form.requesterPhone}
                onChange={(e) => setForm((f) => ({ ...f, requesterPhone: e.target.value }))}
                placeholder="+998 90 123 45 67"
                required
              />
            </label>
            <label className="modal-field">
              <span>Mavzu</span>
              <input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Murojaat mavzusi"
                required
                autoFocus
              />
            </label>
            <label className="modal-field">
              <span>Tavsif</span>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Murojaat tafsilotlari"
                rows={4}
                required
              />
            </label>
            <label className="modal-field">
              <span>Kategoriya</span>
              <select
                value={form.categoryId}
                onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
                required
              >
                <option value="">Tanlang</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
                <option value="__other__">Boshqa</option>
              </select>
              {isOtherCategory && (
                <input
                  value={form.customCategoryName}
                  onChange={(e) => setForm((f) => ({ ...f, customCategoryName: e.target.value }))}
                  placeholder="Kategoriya nomini kiriting"
                  required
                />
              )}
            </label>
            <label className="modal-field">
              <span>Muhimlik</span>
              <select
                value={form.priority}
                onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
              >
                {PRIORITY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="modal-field">
              <span>Tashkilot</span>
              <select
                value={form.organizationId}
                onChange={(e) => setForm((f) => ({ ...f, organizationId: e.target.value }))}
              >
                <option value="">Tanlanmagan</option>
                {organizations.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
                <option value="__other__">Boshqa</option>
              </select>
              {isOtherOrg && (
                <input
                  value={form.customOrgName}
                  onChange={(e) => setForm((f) => ({ ...f, customOrgName: e.target.value }))}
                  placeholder="Tashkilot nomini kiriting"
                  required
                />
              )}
            </label>
            <label className="modal-field">
              <span>Fayl biriktirish</span>
              <input type="file" multiple onChange={handleFilesChange} />
              {form.files.length > 0 && (
                <p className="file-list">{form.files.map((f) => f.name).join(', ')}</p>
              )}
            </label>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSaving}>
              Bekor qilish
            </button>
            <button className="btn btn-primary" type="submit" disabled={disabled}>
              {isSaving ? 'Yasalmoqda...' : 'Yasash'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}

interface LegacyTicketForm {
  title: string;
  description: string;
  categoryId: string;
  customCategoryName: string;
  priority: string;
  organizationId: string;
  customOrgName: string;
  requesterName: string;
  requesterPhone: string;
  status: string;
  createdAt: string;
  closedAt: string;
}

const EMPTY_LEGACY_FORM: LegacyTicketForm = {
  title: '',
  description: '',
  categoryId: '',
  customCategoryName: '',
  priority: 'medium',
  organizationId: '',
  customOrgName: '',
  requesterName: '',
  requesterPhone: '',
  status: 'closed',
  createdAt: '',
  closedAt: '',
};

function LegacyTicketModal({
  isOpen,
  organizations,
  categories,
  onClose,
  onSubmit,
  isSaving,
  error,
}: {
  isOpen: boolean;
  organizations: Organization[];
  categories: Category[];
  onClose: () => void;
  onSubmit: (form: LegacyTicketForm) => void;
  isSaving: boolean;
  error: string | null;
}) {
  const [form, setForm] = useState<LegacyTicketForm>(EMPTY_LEGACY_FORM);

  useEffect(() => {
    if (isOpen) setForm(EMPTY_LEGACY_FORM);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isOtherCategory = form.categoryId === '__other__';
  const isOtherOrg = form.organizationId === '__other__';

  const disabled =
    isSaving ||
    !form.title.trim() ||
    !form.description.trim() ||
    !form.categoryId ||
    !form.requesterName.trim() ||
    !form.requesterPhone.trim() ||
    !form.createdAt ||
    (isOtherCategory && !form.customCategoryName.trim()) ||
    (isOtherOrg && !form.customOrgName.trim());

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (disabled) return;
    onSubmit(form);
  };

  return createPortal(
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-card">
        <div className="modal-header">
          <span className="modal-header-icon">
            <IconHistory width={18} height={18} />
          </span>
          <h3>Eski murojaat qo'shish</h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Yopish">
            <IconClose width={18} height={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <p className="form-error">{error}</p>}
            <label className="modal-field">
              <span>Murojaatchi F.I.O.</span>
              <input
                value={form.requesterName}
                onChange={(e) => setForm((f) => ({ ...f, requesterName: e.target.value }))}
                placeholder="Murojaatchining to'liq ismi"
                required
              />
            </label>
            <label className="modal-field">
              <span>Murojaatchi telefon raqami</span>
              <input
                value={form.requesterPhone}
                onChange={(e) => setForm((f) => ({ ...f, requesterPhone: e.target.value }))}
                placeholder="+998 90 123 45 67"
                required
              />
            </label>
            <label className="modal-field">
              <span>Mavzu</span>
              <input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Murojaat mavzusi"
                required
                autoFocus
              />
            </label>
            <label className="modal-field">
              <span>Tavsif</span>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Murojaat tafsilotlari"
                rows={4}
                required
              />
            </label>
            <label className="modal-field">
              <span>Kategoriya</span>
              <select
                value={form.categoryId}
                onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
                required
              >
                <option value="">Tanlang</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
                <option value="__other__">Boshqa</option>
              </select>
              {isOtherCategory && (
                <input
                  value={form.customCategoryName}
                  onChange={(e) => setForm((f) => ({ ...f, customCategoryName: e.target.value }))}
                  placeholder="Kategoriya nomini kiriting"
                  required
                />
              )}
            </label>
            <label className="modal-field">
              <span>Muhimlik</span>
              <select
                value={form.priority}
                onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
              >
                {PRIORITY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="modal-field">
              <span>Tashkilot</span>
              <select
                value={form.organizationId}
                onChange={(e) => setForm((f) => ({ ...f, organizationId: e.target.value }))}
              >
                <option value="">Tanlanmagan</option>
                {organizations.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
                <option value="__other__">Boshqa</option>
              </select>
              {isOtherOrg && (
                <input
                  value={form.customOrgName}
                  onChange={(e) => setForm((f) => ({ ...f, customOrgName: e.target.value }))}
                  placeholder="Tashkilot nomini kiriting"
                  required
                />
              )}
            </label>
            <label className="modal-field">
              <span>Holat</span>
              <select
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="modal-field">
              <span>Yaratilgan sana/vaqt</span>
              <input
                type="datetime-local"
                value={form.createdAt}
                onChange={(e) => setForm((f) => ({ ...f, createdAt: e.target.value }))}
                required
              />
            </label>
            <label className="modal-field">
              <span>Yopilgan sana/vaqt (ixtiyoriy)</span>
              <input
                type="datetime-local"
                value={form.closedAt}
                onChange={(e) => setForm((f) => ({ ...f, closedAt: e.target.value }))}
              />
            </label>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSaving}>
              Bekor qilish
            </button>
            <button className="btn btn-primary" type="submit" disabled={disabled}>
              {isSaving ? 'Yasalmoqda...' : 'Yasash'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}

function closingDuration(ticket: Ticket): string {
  if (!ticket.closedAt) return '-';
  const minutes = Math.max(
    0,
    Math.round((new Date(ticket.closedAt).getTime() - new Date(ticket.createdAt).getTime()) / 60000),
  );
  if (minutes < 60) return `${minutes} daqiqa`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} soat`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} kun`;
  if (days < 30) return `${Math.round(days / 7)} hafta`;
  return `${Math.round(days / 30)} oy`;
}

/** Asosiy TZ bo'lim 6 dagi murojaatlar jadvali — endi Dashboard'dan ajratilgan alohida bo'lim. */
export function TicketsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isSuperadmin = user?.role === 'superadmin';
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [organizationFilter, setOrganizationFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [assignedToFilter, setAssignedToFilter] = useState('');
  const [createdFrom, setCreatedFrom] = useState('');
  const [createdTo, setCreatedTo] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ticketToDelete, setTicketToDelete] = useState<Ticket | null>(null);
  const [page, setPage] = useState(1);
  const [choiceModalOpen, setChoiceModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [legacyModalOpen, setLegacyModalOpen] = useState(false);
  const [isCreatingLegacy, setIsCreatingLegacy] = useState(false);
  const [legacyError, setLegacyError] = useState<string | null>(null);

  const load = () => {
    setIsLoading(true);
    Promise.all([
      api.get('/admin/tickets'),
      api.get('/admin/organizations'),
      api.get('/admin/users'),
      api.get('/admin/categories'),
    ])
      .then(([ticketsRes, orgsRes, adminsRes, categoriesRes]) => {
        setTickets(ticketsRes.data.data);
        setOrganizations(orgsRes.data.data);
        setAdmins(adminsRes.data.data);
        setCategories(categoriesRes.data.data);
      })
      .finally(() => setIsLoading(false));
  };

  const clearFilters = () => {
    setSearchTerm('');
    setOrganizationFilter('');
    setStatusFilter('');
    setPriorityFilter('');
    setCategoryFilter('');
    setAssignedToFilter('');
    setCreatedFrom('');
    setCreatedTo('');
  };

  useEffect(load, []);

  const handleAssign = async (ticket: Ticket, assignedToId: string) => {
    try {
      const res = await api.patch(`/admin/tickets/${ticket.id}/assign`, {
        assignedToId: assignedToId || null,
      });
      const updated = res.data.data;
      setTickets((prev) => prev.map((t) => (t.id === ticket.id ? { ...t, assignedTo: updated.assignedTo } : t)));
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message ?? "Ijrochini tayinlab bo'lmadi.";
      setError(message);
    }
  };

  const handleDelete = async () => {
    if (!ticketToDelete) return;
    const ticket = ticketToDelete;
    setTicketToDelete(null);
    try {
      await api.delete(`/admin/tickets/${ticket.id}`);
      setTickets((prev) => prev.filter((t) => t.id !== ticket.id));
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message ?? "Murojaatni o'chirib bo'lmadi.";
      setError(message);
    }
  };

  const handleCreateTicket = async (form: CreateTicketForm) => {
    setIsCreating(true);
    setCreateError(null);
    try {
      let resolvedOrganizationId = form.organizationId;
      if (form.organizationId === '__other__') {
        try {
          const orgRes = await api.post('/admin/organizations', { name: form.customOrgName.trim() });
          resolvedOrganizationId = orgRes.data.data.id;
        } catch {
          setCreateError("Tashkilot yasab bo'lmadi.");
          setIsCreating(false);
          return;
        }
      }

      let resolvedCategoryId = form.categoryId;
      if (form.categoryId === '__other__') {
        try {
          const categoryRes = await api.post('/admin/categories', { name: form.customCategoryName.trim() });
          resolvedCategoryId = categoryRes.data.data.id;
        } catch {
          setCreateError("Kategoriya yasab bo'lmadi.");
          setIsCreating(false);
          return;
        }
      }

      const res = await api.post('/admin/tickets', {
        title: form.title.trim(),
        description: form.description.trim(),
        categoryId: resolvedCategoryId,
        priority: form.priority,
        organizationId: resolvedOrganizationId || undefined,
        requesterName: form.requesterName.trim(),
        requesterPhone: form.requesterPhone.trim(),
      });
      const ticketId = res.data.data.id;

      for (const file of form.files) {
        const formData = new FormData();
        formData.append('file', file);
        await api.post(`/admin/tickets/${ticketId}/attachments`, formData);
      }

      setCreateModalOpen(false);
      load();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message ?? "Murojaat yasab bo'lmadi.";
      setCreateError(message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleCreateLegacyTicket = async (form: LegacyTicketForm) => {
    setIsCreatingLegacy(true);
    setLegacyError(null);
    try {
      let resolvedOrganizationId = form.organizationId;
      if (form.organizationId === '__other__') {
        try {
          const orgRes = await api.post('/admin/organizations', { name: form.customOrgName.trim() });
          resolvedOrganizationId = orgRes.data.data.id;
        } catch {
          setLegacyError("Tashkilot yasab bo'lmadi.");
          setIsCreatingLegacy(false);
          return;
        }
      }

      let resolvedCategoryId = form.categoryId;
      if (form.categoryId === '__other__') {
        try {
          const categoryRes = await api.post('/admin/categories', { name: form.customCategoryName.trim() });
          resolvedCategoryId = categoryRes.data.data.id;
        } catch {
          setLegacyError("Kategoriya yasab bo'lmadi.");
          setIsCreatingLegacy(false);
          return;
        }
      }

      await api.post('/admin/tickets/legacy', {
        title: form.title.trim(),
        description: form.description.trim(),
        categoryId: resolvedCategoryId,
        priority: form.priority,
        organizationId: resolvedOrganizationId || undefined,
        requesterName: form.requesterName.trim(),
        requesterPhone: form.requesterPhone.trim(),
        status: form.status,
        createdAt: new Date(form.createdAt).toISOString(),
        closedAt: form.closedAt ? new Date(form.closedAt).toISOString() : undefined,
      });

      setLegacyModalOpen(false);
      load();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message ?? "Eski murojaatni saqlab bo'lmadi.";
      setLegacyError(message);
    } finally {
      setIsCreatingLegacy(false);
    }
  };

  const filteredTickets = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const from = createdFrom ? new Date(`${createdFrom}T00:00:00`) : null;
    const to = createdTo ? new Date(`${createdTo}T23:59:59.999`) : null;
    return tickets.filter((t) => {
      const matchesOrg = !organizationFilter || t.organization?.id === organizationFilter;
      const matchesStatus = !statusFilter || t.status === statusFilter;
      const matchesPriority = !priorityFilter || t.priority === priorityFilter;
      const matchesCategory = !categoryFilter || t.categoryEntity?.id === categoryFilter;
      const matchesAssignedTo = !assignedToFilter || t.assignedTo?.id === assignedToFilter;
      const createdDate = new Date(t.createdAt);
      const matchesFrom = !from || createdDate >= from;
      const matchesTo = !to || createdDate <= to;
      const matchesTerm =
        !term ||
        t.number.toLowerCase().includes(term) ||
        t.title.toLowerCase().includes(term) ||
        (t.requesterName ?? t.createdBy?.fullname ?? '').toLowerCase().includes(term);
      return (
        matchesOrg &&
        matchesStatus &&
        matchesPriority &&
        matchesCategory &&
        matchesAssignedTo &&
        matchesFrom &&
        matchesTo &&
        matchesTerm
      );
    });
  }, [
    tickets,
    organizationFilter,
    statusFilter,
    priorityFilter,
    categoryFilter,
    assignedToFilter,
    createdFrom,
    createdTo,
    searchTerm,
  ]);

  useEffect(() => {
    setPage(1);
  }, [
    organizationFilter,
    statusFilter,
    priorityFilter,
    categoryFilter,
    assignedToFilter,
    createdFrom,
    createdTo,
    searchTerm,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredTickets.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedTickets = filteredTickets.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  return (
    <AppShell title="Murojaatlar" breadcrumb="Barcha murojaatlar">
      {isLoading ? (
        <TableSkeleton rows={6} cols={10} />
      ) : (
        <>
          <div className="toolbar">
            <div className="toolbar-search toolbar-search-full">
              <IconSearch width={15} height={15} />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Murojaat, mijoz yoki raqam bo'yicha qidirish"
              />
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setChoiceModalOpen(true)}
            >
              <IconPlus width={15} height={15} />
              Yasash
            </button>
          </div>

          <div className="filters">
            <label>
              Tashkilot
              <select value={organizationFilter} onChange={(e) => setOrganizationFilter(e.target.value)}>
                <option value="">Barchasi</option>
                {organizations.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Holat
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">Barchasi</option>
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Muhimlik
              <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
                <option value="">Barchasi</option>
                {PRIORITY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Kategoriya
              <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                <option value="">Barchasi</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Mas'ul
              <select value={assignedToFilter} onChange={(e) => setAssignedToFilter(e.target.value)}>
                <option value="">Barchasi</option>
                {admins.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.fullname ?? a.id}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Yasaldi (dan)
              <input type="date" value={createdFrom} onChange={(e) => setCreatedFrom(e.target.value)} />
            </label>
            <label>
              Yasaldi (gacha)
              <input type="date" value={createdTo} onChange={(e) => setCreatedTo(e.target.value)} />
            </label>
            <div className="filters-actions">
              <button type="button" className="btn btn-secondary btn-sm" onClick={clearFilters}>
                Filterlarni tozalash
              </button>
            </div>
          </div>

          {error && <p className="form-error">{error}</p>}

          <p className="filter-results">{filteredTickets.length} ta murojaat topildi</p>

          {filteredTickets.length === 0 ? (
            <EmptyState
              icon={<IconInbox width={24} height={24} />}
              title="Hozircha murojaatlar yo'q"
              description="Filtrni o'zgartirib ko'ring yoki yangi murojaat kelishini kuting."
            />
          ) : (
            <div className="table-wrap">
              <table className="tickets-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Mavzu</th>
                    <th>Tashkilot</th>
                    <th>Foydalanuvchi</th>
                    <th>Kategoriya</th>
                    <th>Muhimlik</th>
                    <th>Holat</th>
                    <th>Mas'ul</th>
                    <th>Yopilish vaqti</th>
                    <th>Yasaldi</th>
                    {isSuperadmin && <th></th>}
                  </tr>
                </thead>
                <tbody>
                  {paginatedTickets.map((t) => (
                    <tr
                      key={t.id}
                      className="clickable-row"
                      onClick={() => navigate(`/dashboard/tickets/${t.id}`)}
                    >
                      <td className="cell-muted">{t.number}</td>
                      <td className="cell-primary">{t.title}</td>
                      <td>{t.organization?.name ?? '—'}</td>
                      <td>
                        <div className="cell-user">
                          <Avatar name={t.requesterName ?? t.createdBy?.fullname} />
                          <div className="cell-user-info">
                            <span>{t.requesterName ?? t.createdBy?.fullname ?? '—'}</span>
                            {(t.requesterPhone ?? t.createdBy?.phoneNumber) && (
                              <span className="cell-muted cell-user-phone">
                                {t.requesterPhone ?? t.createdBy?.phoneNumber}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="cell-muted">{t.categoryEntity?.name ?? '—'}</td>
                      <td>
                        <span className={`priority priority--${t.priority}`}>{t.priority}</span>
                      </td>
                      <td>
                        <span className={`status status--${t.status}`}>
                          {STATUS_OPTIONS.find((o) => o.value === t.status)?.label ?? t.status}
                        </span>
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <select
                          className="assign-select"
                          value={t.assignedTo?.id ?? ''}
                          onChange={(e) => handleAssign(t, e.target.value)}
                        >
                          <option value="">Tayinlanmagan</option>
                          {admins.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.fullname ?? a.id}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="cell-muted">{closingDuration(t)}</td>
                      <td className="cell-muted">{new Date(t.createdAt).toLocaleString('uz-UZ')}</td>
                      {isSuperadmin && (
                        <td className="table-actions" onClick={(e) => e.stopPropagation()}>
                          <button className="danger" onClick={() => setTicketToDelete(t)}>
                            <IconTrash width={13} height={13} />
                            O'chirish
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <Pagination page={currentPage} totalPages={totalPages} onChange={setPage} />
        </>
      )}

      <CreateTicketChoiceModal
        isOpen={choiceModalOpen}
        onClose={() => setChoiceModalOpen(false)}
        onSelectNew={() => {
          setChoiceModalOpen(false);
          setCreateError(null);
          setCreateModalOpen(true);
        }}
        onSelectLegacy={() => {
          setChoiceModalOpen(false);
          setLegacyError(null);
          setLegacyModalOpen(true);
        }}
      />

      <CreateTicketModal
        isOpen={createModalOpen}
        organizations={organizations}
        categories={categories}
        onClose={() => {
          if (isCreating) return;
          setCreateModalOpen(false);
        }}
        onSubmit={handleCreateTicket}
        isSaving={isCreating}
        error={createError}
      />

      <LegacyTicketModal
        isOpen={legacyModalOpen}
        organizations={organizations}
        categories={categories}
        onClose={() => {
          if (isCreatingLegacy) return;
          setLegacyModalOpen(false);
        }}
        onSubmit={handleCreateLegacyTicket}
        isSaving={isCreatingLegacy}
        error={legacyError}
      />

      <ConfirmModal
        isOpen={!!ticketToDelete}
        title="Murojaatni o'chirish"
        message={
          ticketToDelete
            ? `"${ticketToDelete.title}" murojaatini o'chirmoqchimisiz? Bu amalni ortga qaytarib bo'lmaydi.`
            : ''
        }
        onConfirm={handleDelete}
        onCancel={() => setTicketToDelete(null)}
      />
    </AppShell>
  );
}
