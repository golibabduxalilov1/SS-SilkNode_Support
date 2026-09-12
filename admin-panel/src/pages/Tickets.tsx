import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { AppShell } from '../components/AppShell';
import { ConfirmModal } from '../components/ConfirmModal';
import {
  IconClose,
  IconDownload,
  IconFileSpreadsheet,
  IconFileText,
  IconHistory,
  IconInbox,
  IconPlus,
  IconSearch,
  IconTicketNew,
  IconTrash,
} from '../components/icons';
import { RequesterFields, isPhoneComplete } from '../components/RequesterFields';
import { Avatar, CategoryOptionGroups, EmptyState, Pagination, TableSkeleton } from '../components/ui';
import { usePageSize } from '../utils/usePageSize';
import { exportTableToExcel, exportTableToPdf } from '../utils/tableExport';
import { formatDurationMinutes } from '../utils/formatDuration';
import { LIST_POLL_INTERVAL_MS } from '../utils/pollInterval';

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
  resolutionMinutes?: number | null;
  processingResolutionMinutes?: number | null;
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
  cluster?: string;
}

/** T13 — saqlangan filtr kombinatsiyasi (shaxsiy, murojaatlar sahifasidagi filtrlar bo'yicha). */
interface SavedFilter {
  id: string;
  name: string;
  filterJson: Partial<TicketFilters>;
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

const TICKET_COLUMN_WIDTHS = [40, 56, 260, 140, 210, 120, 100, 120, 190, 110, 160];
const TICKET_COLUMN_WIDTHS_WITH_ACTIONS = [...TICKET_COLUMN_WIDTHS, 140];

function TicketTableColgroup({ isSuperadmin }: { isSuperadmin: boolean }) {
  const widths = isSuperadmin ? TICKET_COLUMN_WIDTHS_WITH_ACTIONS : TICKET_COLUMN_WIDTHS;
  return (
    <colgroup>
      {widths.map((w, i) => (
        <col key={i} style={{ width: `${w}px` }} />
      ))}
    </colgroup>
  );
}

interface TicketFilters {
  organizationFilter: string;
  statusFilter: string;
  priorityFilter: string;
  categoryFilter: string;
  assignedToFilter: string;
  createdFrom: string;
  createdTo: string;
  searchTerm: string;
}

const EMPTY_TICKET_FILTERS: TicketFilters = {
  organizationFilter: '',
  statusFilter: '',
  priorityFilter: '',
  categoryFilter: '',
  assignedToFilter: '',
  createdFrom: '',
  createdTo: '',
  searchTerm: '',
};

function filterTickets(tickets: Ticket[], filters: TicketFilters): Ticket[] {
  const term = filters.searchTerm.trim().toLowerCase();
  const from = filters.createdFrom ? new Date(`${filters.createdFrom}T00:00:00`) : null;
  const to = filters.createdTo ? new Date(`${filters.createdTo}T23:59:59.999`) : null;
  return tickets.filter((t) => {
    const matchesOrg = !filters.organizationFilter || t.organization?.id === filters.organizationFilter;
    const matchesStatus = !filters.statusFilter || t.status === filters.statusFilter;
    const matchesPriority = !filters.priorityFilter || t.priority === filters.priorityFilter;
    const matchesCategory = !filters.categoryFilter || t.categoryEntity?.id === filters.categoryFilter;
    const matchesAssignedTo = !filters.assignedToFilter || t.assignedTo?.id === filters.assignedToFilter;
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
}

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
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setForm(EMPTY_CREATE_FORM);
      setAttemptedSubmit(false);
    }
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

  const isOrgMissing = !form.organizationId || (isOtherOrg && !form.customOrgName.trim());
  const isPhoneMissing = !form.requesterPhone.trim() || !isPhoneComplete(form.requesterPhone);

  const disabled =
    isSaving ||
    !form.title.trim() ||
    !form.description.trim() ||
    !form.categoryId ||
    !form.requesterName.trim() ||
    isPhoneMissing ||
    (isOtherCategory && !form.customCategoryName.trim()) ||
    isOrgMissing;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setAttemptedSubmit(true);
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
            <RequesterFields
              name={form.requesterName}
              phone={form.requesterPhone}
              onNameChange={(value) => setForm((f) => ({ ...f, requesterName: value }))}
              onPhoneChange={(value) => setForm((f) => ({ ...f, requesterPhone: value }))}
              onApplySuggestion={(s) =>
                setForm((f) => ({ ...f, organizationId: s.organizationId ?? f.organizationId }))
              }
              phoneInvalid={attemptedSubmit && isPhoneMissing}
            />
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
                <CategoryOptionGroups categories={categories} />
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
                className={attemptedSubmit && isOrgMissing ? 'field-invalid' : undefined}
                required
              >
                <option value="">Tanlang</option>
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
                  className={attemptedSubmit && isOrgMissing ? 'field-invalid' : undefined}
                  required
                />
              )}
              {attemptedSubmit && isOrgMissing && <p className="field-error">Tashkilotni tanlang</p>}
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
  assignedToId: string;
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
  assignedToId: '',
  status: 'closed',
  createdAt: '',
  closedAt: '',
};

function LegacyTicketModal({
  isOpen,
  organizations,
  categories,
  admins,
  onClose,
  onSubmit,
  isSaving,
  error,
}: {
  isOpen: boolean;
  organizations: Organization[];
  categories: Category[];
  admins: AdminUser[];
  onClose: () => void;
  onSubmit: (form: LegacyTicketForm) => void;
  isSaving: boolean;
  error: string | null;
}) {
  const [form, setForm] = useState<LegacyTicketForm>(EMPTY_LEGACY_FORM);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setForm(EMPTY_LEGACY_FORM);
      setAttemptedSubmit(false);
    }
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
  const isOrgMissing = !form.organizationId || (isOtherOrg && !form.customOrgName.trim());
  const isPhoneMissing = !form.requesterPhone.trim() || !isPhoneComplete(form.requesterPhone);
  const showUnassignedClosedWarning =
    !form.assignedToId && (form.status === 'closed' || form.status === 'resolved');

  const disabled =
    isSaving ||
    !form.title.trim() ||
    !form.description.trim() ||
    !form.categoryId ||
    !form.requesterName.trim() ||
    isPhoneMissing ||
    !form.createdAt ||
    (isOtherCategory && !form.customCategoryName.trim()) ||
    isOrgMissing;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setAttemptedSubmit(true);
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
            <RequesterFields
              name={form.requesterName}
              phone={form.requesterPhone}
              onNameChange={(value) => setForm((f) => ({ ...f, requesterName: value }))}
              onPhoneChange={(value) => setForm((f) => ({ ...f, requesterPhone: value }))}
              onApplySuggestion={(s) =>
                setForm((f) => ({ ...f, organizationId: s.organizationId ?? f.organizationId }))
              }
              phoneInvalid={attemptedSubmit && isPhoneMissing}
            />
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
                <CategoryOptionGroups categories={categories} />
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
                className={attemptedSubmit && isOrgMissing ? 'field-invalid' : undefined}
                required
              >
                <option value="">Tanlang</option>
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
                  className={attemptedSubmit && isOrgMissing ? 'field-invalid' : undefined}
                  required
                />
              )}
              {attemptedSubmit && isOrgMissing && <p className="field-error">Tashkilotni tanlang</p>}
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
              <span>Ijrochi</span>
              <select
                value={form.assignedToId}
                onChange={(e) => setForm((f) => ({ ...f, assignedToId: e.target.value }))}
              >
                <option value="">Tayinlanmagan</option>
                {admins.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.fullname ?? a.id}
                  </option>
                ))}
              </select>
              {showUnassignedClosedWarning && (
                <p className="field-hint field-hint--warning">
                  Ijrochisiz yopilgan murojaat xodimlar statistikasiga tushmaydi
                </p>
              )}
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

function ticketPriorityLabel(priority: string): string {
  return PRIORITY_OPTIONS.find((o) => o.value === priority)?.label ?? priority;
}

function ticketStatusLabel(status: string): string {
  return STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status;
}

function ticketsToExportRows(tickets: Ticket[]): (string | number)[][] {
  return tickets.map((t) => [
    t.number,
    t.title,
    t.organization?.name ?? '-',
    t.requesterName ?? t.createdBy?.fullname ?? '-',
    t.requesterPhone ?? t.createdBy?.phoneNumber ?? '-',
    t.categoryEntity?.name ?? '-',
    ticketPriorityLabel(t.priority),
    ticketStatusLabel(t.status),
    t.assignedTo?.fullname ?? 'Tayinlanmagan',
    new Date(t.createdAt).toLocaleString('uz-UZ'),
    closingDuration(t),
  ]);
}

const EXPORT_HEADERS = [
  '№',
  'Mavzu',
  'Tashkilot',
  'Foydalanuvchi',
  'Telefon',
  'Kategoriya',
  'Muhimlik',
  'Holat',
  "Mas'ul",
  'Yaratildi',
  'Yopilish vaqti',
];

function ExportTicketsModal({
  isOpen,
  onClose,
  tickets,
  organizations,
  categories,
  admins,
  initialFilters,
}: {
  isOpen: boolean;
  onClose: () => void;
  tickets: Ticket[];
  organizations: Organization[];
  categories: Category[];
  admins: AdminUser[];
  initialFilters: TicketFilters;
}) {
  const [filters, setFilters] = useState<TicketFilters>(initialFilters);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  useEffect(() => {
    if (isOpen) setFilters({ ...initialFilters, searchTerm: '' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const matched = filterTickets(tickets, filters);

  const buildExportTable = () => {
    const filterSummary = [
      filters.statusFilter && `Holat: ${ticketStatusLabel(filters.statusFilter)}`,
      filters.priorityFilter && `Muhimlik: ${ticketPriorityLabel(filters.priorityFilter)}`,
      filters.organizationFilter &&
        `Tashkilot: ${organizations.find((o) => o.id === filters.organizationFilter)?.name ?? ''}`,
      filters.categoryFilter &&
        `Kategoriya: ${categories.find((c) => c.id === filters.categoryFilter)?.name ?? ''}`,
      filters.assignedToFilter &&
        `Mas'ul: ${admins.find((a) => a.id === filters.assignedToFilter)?.fullname ?? ''}`,
      filters.createdFrom && `${filters.createdFrom} dan`,
      filters.createdTo && `${filters.createdTo} gacha`,
      filters.searchTerm && `Qidiruv: "${filters.searchTerm}"`,
    ]
      .filter(Boolean)
      .join(' • ');

    return {
      title: 'Murojaatlar ro\'yxati',
      subtitle: `Yaratildi: ${new Date().toLocaleString('uz-UZ')} • Jami: ${matched.length} ta${
        filterSummary ? ` • ${filterSummary}` : ''
      }`,
      headers: EXPORT_HEADERS,
      rows: ticketsToExportRows(matched),
      fileName: `murojaatlar_${new Date().toISOString().slice(0, 10)}`,
    };
  };

  const handleExportExcel = async () => {
    setIsExportingExcel(true);
    try {
      const table = buildExportTable();
      await exportTableToExcel({ ...table, fileName: `${table.fileName}.xlsx` });
      onClose();
    } finally {
      setIsExportingExcel(false);
    }
  };

  const handleExportPdf = () => {
    setIsExportingPdf(true);
    try {
      const table = buildExportTable();
      exportTableToPdf({ ...table, fileName: `${table.fileName}.pdf` });
      onClose();
    } finally {
      setIsExportingPdf(false);
    }
  };

  const clearExportFilters = () => setFilters(EMPTY_TICKET_FILTERS);

  return createPortal(
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-card modal-card-lg">
        <div className="modal-header">
          <span className="modal-header-icon">
            <IconDownload width={18} height={18} />
          </span>
          <h3>Murojaatlarni yuklab olish</h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Yopish">
            <IconClose width={18} height={18} />
          </button>
        </div>
        <div className="modal-body">
          <p className="export-section-label">Filtrlar</p>
          <div className="export-filters">
            <label className="modal-field">
              <span>Tashkilot</span>
              <select
                value={filters.organizationFilter}
                onChange={(e) => setFilters((f) => ({ ...f, organizationFilter: e.target.value }))}
              >
                <option value="">Barchasi</option>
                {organizations.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="modal-field">
              <span>Holat</span>
              <select
                value={filters.statusFilter}
                onChange={(e) => setFilters((f) => ({ ...f, statusFilter: e.target.value }))}
              >
                <option value="">Barchasi</option>
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="modal-field">
              <span>Muhimlik</span>
              <select
                value={filters.priorityFilter}
                onChange={(e) => setFilters((f) => ({ ...f, priorityFilter: e.target.value }))}
              >
                <option value="">Barchasi</option>
                {PRIORITY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="modal-field">
              <span>Kategoriya</span>
              <select
                value={filters.categoryFilter}
                onChange={(e) => setFilters((f) => ({ ...f, categoryFilter: e.target.value }))}
              >
                <option value="">Barchasi</option>
                <CategoryOptionGroups categories={categories} />
              </select>
            </label>
            <label className="modal-field">
              <span>Mas'ul</span>
              <select
                value={filters.assignedToFilter}
                onChange={(e) => setFilters((f) => ({ ...f, assignedToFilter: e.target.value }))}
              >
                <option value="">Barchasi</option>
                {admins.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.fullname ?? a.id}
                  </option>
                ))}
              </select>
            </label>
            <label className="modal-field">
              <span>Yaratildi (dan)</span>
              <input
                type="date"
                value={filters.createdFrom}
                onChange={(e) => setFilters((f) => ({ ...f, createdFrom: e.target.value }))}
              />
            </label>
            <label className="modal-field">
              <span>Yaratildi (gacha)</span>
              <input
                type="date"
                value={filters.createdTo}
                onChange={(e) => setFilters((f) => ({ ...f, createdTo: e.target.value }))}
              />
            </label>
          </div>
          <button type="button" className="btn btn-secondary btn-sm" onClick={clearExportFilters}>
            Filterlarni tozalash
          </button>

          <p className="export-result-count">{matched.length} ta murojaat yuklab olinadi</p>

          <p className="export-section-label">Format</p>
          <div className="export-format-grid">
            <button
              type="button"
              className="choice-option"
              onClick={handleExportExcel}
              disabled={isExportingExcel || matched.length === 0}
            >
              <span className="choice-option-icon choice-option-icon--success">
                <IconFileSpreadsheet width={18} height={18} />
              </span>
              <span className="choice-option-text">
                <span className="choice-option-title">{isExportingExcel ? 'Tayyorlanmoqda...' : 'Excel'}</span>
                <span className="choice-option-desc">.xlsx fayl sifatida yuklab olish</span>
              </span>
            </button>
            <button
              type="button"
              className="choice-option"
              onClick={handleExportPdf}
              disabled={isExportingPdf || matched.length === 0}
            >
              <span className="choice-option-icon choice-option-icon--danger">
                <IconFileText width={18} height={18} />
              </span>
              <span className="choice-option-text">
                <span className="choice-option-title">{isExportingPdf ? 'Tayyorlanmoqda...' : 'PDF'}</span>
                <span className="choice-option-desc">.pdf fayl sifatida yuklab olish</span>
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function truncateWords(text: string, limit: number): string {
  const words = text.trim().split(/\s+/);
  if (words.length <= limit) return text;
  return `${words.slice(0, limit).join(' ')}...`;
}

/** "Yopilish vaqti" — createdAt'dan closedAt'gacha bo'lgan vaqt. */
function closingDuration(ticket: Ticket): string {
  if (!ticket.closedAt) return '-';
  return formatDurationMinutes(ticket.resolutionMinutes);
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
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [isSavingFilter, setIsSavingFilter] = useState(false);
  const [savingFilterName, setSavingFilterName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ticketToDelete, setTicketToDelete] = useState<Ticket | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkSaving, setIsBulkSaving] = useState(false);
  const [bulkStatusToConfirm, setBulkStatusToConfirm] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = usePageSize();
  const [choiceModalOpen, setChoiceModalOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [legacyModalOpen, setLegacyModalOpen] = useState(false);
  const [isCreatingLegacy, setIsCreatingLegacy] = useState(false);
  const [legacyError, setLegacyError] = useState<string | null>(null);
  // background=true — fonda avtomatik yangilanish uchun (yangi murojaat kelganda jadval qo'lda
  // yangilamasdan ham yangilanadi): joriy filtr/sahifa/tanlovlarga tegmasdan, skeletonsiz.
  const load = (background = false) => {
    if (!background) setIsLoading(true);
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
      .finally(() => {
        if (!background) setIsLoading(false);
      });
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

  const currentFilters: TicketFilters = {
    organizationFilter,
    statusFilter,
    priorityFilter,
    categoryFilter,
    assignedToFilter,
    createdFrom,
    createdTo,
    searchTerm,
  };
  const activeFilterCount = Object.values(currentFilters).filter(Boolean).length;

  const loadSavedFilters = () => {
    api
      .get('/admin/saved-filters')
      .then((res) => setSavedFilters(res.data.data))
      .catch(() => {});
  };

  // T13 — saqlangan filtrni bir klikda qo'llash.
  const applySavedFilter = (savedFilter: SavedFilter) => {
    const f = savedFilter.filterJson;
    setOrganizationFilter(f.organizationFilter ?? '');
    setStatusFilter(f.statusFilter ?? '');
    setPriorityFilter(f.priorityFilter ?? '');
    setCategoryFilter(f.categoryFilter ?? '');
    setAssignedToFilter(f.assignedToFilter ?? '');
    setCreatedFrom(f.createdFrom ?? '');
    setCreatedTo(f.createdTo ?? '');
    setSearchTerm(f.searchTerm ?? '');
  };

  const handleSaveCurrentFilter = async (name: string) => {
    if (!name.trim()) return;
    setIsSavingFilter(true);
    try {
      await api.post('/admin/saved-filters', { name: name.trim(), filterJson: currentFilters });
      setSavingFilterName(null);
      loadSavedFilters();
    } catch {
      // jim o'tkazib yuboriladi — filtrni saqlash ixtiyoriy qulaylik, asosiy oqimni to'xtatmaydi.
    } finally {
      setIsSavingFilter(false);
    }
  };

  const handleDeleteSavedFilter = async (id: string) => {
    setSavedFilters((prev) => prev.filter((f) => f.id !== id));
    try {
      await api.delete(`/admin/saved-filters/${id}`);
    } catch {
      loadSavedFilters();
    }
  };

  useEffect(load, []);
  useEffect(loadSavedFilters, []);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [page]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      if (!document.hidden) load(true);
    }, LIST_POLL_INTERVAL_MS);
    return () => window.clearInterval(intervalId);
  }, []);

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

  const applyBulkResult = (updated: Ticket[]) => {
    const byId = new Map(updated.map((t) => [t.id, t]));
    setTickets((prev) => prev.map((t) => byId.get(t.id) ?? t));
    setSelectedIds(new Set());
  };

  const handleBulkAssign = async (assignedToId: string) => {
    if (selectedIds.size === 0) return;
    setIsBulkSaving(true);
    try {
      const res = await api.patch('/admin/tickets/bulk', {
        ids: Array.from(selectedIds),
        assignedToId: assignedToId || null,
      });
      applyBulkResult(res.data.data);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message ?? "Ommaviy tayinlab bo'lmadi.";
      setError(message);
    } finally {
      setIsBulkSaving(false);
    }
  };

  const applyBulkStatus = async (status: string) => {
    if (selectedIds.size === 0) return;
    setIsBulkSaving(true);
    try {
      const res = await api.patch('/admin/tickets/bulk', {
        ids: Array.from(selectedIds),
        status,
      });
      applyBulkResult(res.data.data);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message ?? "Ommaviy holatni o'zgartirib bo'lmadi.";
      setError(message);
    } finally {
      setIsBulkSaving(false);
    }
  };

  const handleBulkStatus = (status: string) => {
    if (!status) return;
    // "Yopilgan"ga ommaviy o'tishdan oldin tasdiqlash so'raladi (T09 talabi).
    if (status === 'closed') {
      setBulkStatusToConfirm(status);
      return;
    }
    applyBulkStatus(status);
  };

  const toggleSelectAll = () => {
    setSelectedIds((prev) =>
      prev.size === paginatedTickets.length ? new Set() : new Set(paginatedTickets.map((t) => t.id)),
    );
  };

  const toggleSelectOne = (ticketId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(ticketId)) next.delete(ticketId);
      else next.add(ticketId);
      return next;
    });
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
        assignedToId: form.assignedToId || undefined,
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

  const filteredTickets = useMemo(
    () =>
      filterTickets(tickets, {
        organizationFilter,
        statusFilter,
        priorityFilter,
        categoryFilter,
        assignedToFilter,
        createdFrom,
        createdTo,
        searchTerm,
      }),
    [
      tickets,
      organizationFilter,
      statusFilter,
      priorityFilter,
      categoryFilter,
      assignedToFilter,
      createdFrom,
      createdTo,
      searchTerm,
    ],
  );

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
    pageSize,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredTickets.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedTickets = filteredTickets.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  return (
    <AppShell title="Murojaatlar" breadcrumb="Barcha murojaatlar" contentClassName="app-content--table-scroll">
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
              className="btn btn-secondary"
              onClick={() => setExportModalOpen(true)}
            >
              <IconDownload width={15} height={15} />
              Yuklab olish
            </button>
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
                <CategoryOptionGroups categories={categories} />
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
              {activeFilterCount > 0 && (
                <span className="filter-active-chip">{activeFilterCount} ta filtr aktiv</span>
              )}
              <button type="button" className="btn btn-secondary btn-sm" onClick={clearFilters}>
                Filterlarni tozalash
              </button>
            </div>
          </div>

          {/* T13 — saqlangan filtrlar: bir klikda qo'llash + joriy kombinatsiyani nom bilan saqlash. */}
          {(savedFilters.length > 0 || activeFilterCount > 0) && (
            <div className="saved-filters-bar">
              {savedFilters.map((sf) => (
                <span key={sf.id} className="saved-filter-chip">
                  <button type="button" onClick={() => applySavedFilter(sf)}>
                    {sf.name}
                  </button>
                  <button
                    type="button"
                    className="saved-filter-chip-remove"
                    aria-label={`"${sf.name}" filtrini o'chirish`}
                    onClick={() => handleDeleteSavedFilter(sf.id)}
                  >
                    ×
                  </button>
                </span>
              ))}
              {activeFilterCount > 0 &&
                (savingFilterName !== null ? (
                  <span className="saved-filter-save-form">
                    <input
                      autoFocus
                      value={savingFilterName}
                      onChange={(e) => setSavingFilterName(e.target.value)}
                      placeholder="Filtr nomi"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveCurrentFilter(savingFilterName);
                        if (e.key === 'Escape') setSavingFilterName(null);
                      }}
                    />
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      disabled={isSavingFilter || !savingFilterName.trim()}
                      onClick={() => handleSaveCurrentFilter(savingFilterName)}
                    >
                      Saqlash
                    </button>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSavingFilterName(null)}>
                      Bekor qilish
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => setSavingFilterName('')}
                  >
                    + Joriy filtrni saqlash
                  </button>
                ))}
            </div>
          )}

          {error && <p className="form-error">{error}</p>}

          <p className="filter-results">{filteredTickets.length} ta murojaat topildi</p>

          {filteredTickets.length === 0 ? (
            <EmptyState
              icon={<IconInbox width={24} height={24} />}
              title="Hech narsa topilmadi"
              description="Filtrlarni o'zgartirib ko'ring yoki yangi murojaat kelishini kuting."
              actionLabel="Filterlarni tozalash"
              onAction={clearFilters}
            />
          ) : (
            <div className="table-wrap table-wrap--pin-actions">
              {selectedIds.size > 0 && (
                <div className="bulk-actions-bar">
                  <span className="bulk-actions-count">{selectedIds.size} ta tanlandi</span>
                  <label className="bulk-actions-field">
                    Mas'ulni tayinlash
                    <select
                      className="assign-select"
                      defaultValue="__placeholder__"
                      disabled={isBulkSaving}
                      onChange={(e) => handleBulkAssign(e.target.value)}
                    >
                      <option value="__placeholder__" disabled>
                        Tanlang
                      </option>
                      <option value="">Tayinlanmagan</option>
                      {admins.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.fullname ?? a.id}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="bulk-actions-field">
                    Holatni o'zgartirish
                    <select
                      defaultValue=""
                      disabled={isBulkSaving}
                      onChange={(e) => handleBulkStatus(e.target.value)}
                    >
                      <option value="" disabled>
                        Tanlang
                      </option>
                      {STATUS_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => setSelectedIds(new Set())}
                    disabled={isBulkSaving}
                  >
                    Bekor qilish
                  </button>
                </div>
              )}
              <table className="tickets-table">
                <TicketTableColgroup isSuperadmin={isSuperadmin} />
                <thead>
                  <tr>
                    <th>
                      <input
                        type="checkbox"
                        checked={paginatedTickets.length > 0 && selectedIds.size === paginatedTickets.length}
                        onChange={toggleSelectAll}
                        aria-label="Hammasini tanlash"
                      />
                    </th>
                    <th>№</th>
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
                  {paginatedTickets.map((t, idx) => (
                    <tr
                      key={t.id}
                      className="clickable-row"
                      onClick={() => navigate(`/dashboard/tickets/${t.id}`)}
                    >
                      <td onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(t.id)}
                          onChange={() => toggleSelectOne(t.id)}
                          aria-label={`${t.title} tanlash`}
                        />
                      </td>
                      <td className="cell-muted">{(currentPage - 1) * pageSize + idx + 1}</td>
                      <td className="cell-primary">{truncateWords(t.title, 7)}</td>
                      <td className="cell-nowrap">{t.organization?.name ?? '—'}</td>
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
                        <span className={`priority priority--${t.priority}`}>{ticketPriorityLabel(t.priority)}</span>
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
                      <td className="cell-muted">
                        <div className="cell-datetime">
                          <span>{new Date(t.createdAt).toLocaleDateString('uz-UZ')}</span>
                          <span className="cell-datetime-time">{new Date(t.createdAt).toLocaleTimeString('uz-UZ')}</span>
                        </div>
                      </td>
                      {isSuperadmin && (
                        <td className="table-actions" onClick={(e) => e.stopPropagation()}>
                          <button className="danger ticket-delete-btn" onClick={() => setTicketToDelete(t)}>
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

          <Pagination
            page={currentPage}
            totalPages={totalPages}
            onChange={setPage}
            totalItems={filteredTickets.length}
            pageSize={pageSize}
            onPageSizeChange={setPageSize}
          />
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
        admins={admins}
        onClose={() => {
          if (isCreatingLegacy) return;
          setLegacyModalOpen(false);
        }}
        onSubmit={handleCreateLegacyTicket}
        isSaving={isCreatingLegacy}
        error={legacyError}
      />

      <ExportTicketsModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        tickets={tickets}
        organizations={organizations}
        categories={categories}
        admins={admins}
        initialFilters={{
          organizationFilter,
          statusFilter,
          priorityFilter,
          categoryFilter,
          assignedToFilter,
          createdFrom,
          createdTo,
          searchTerm,
        }}
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

      <ConfirmModal
        isOpen={!!bulkStatusToConfirm}
        title="Tanlangan murojaatlarni yopish"
        message={`${selectedIds.size} ta murojaatni "Yopilgan" holatiga o'tkazmoqchimisiz?`}
        onConfirm={() => {
          const status = bulkStatusToConfirm;
          setBulkStatusToConfirm(null);
          if (status) applyBulkStatus(status);
        }}
        onCancel={() => setBulkStatusToConfirm(null)}
      />
    </AppShell>
  );
}
