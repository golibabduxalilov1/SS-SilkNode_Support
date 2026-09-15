import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { AppShell } from '../components/AppShell';
import { ConfirmModal } from '../components/ConfirmModal';
import {
  IconChevronDown,
  IconClose,
  IconDownload,
  IconFileSpreadsheet,
  IconFileText,
  IconFilter,
  IconHistory,
  IconInbox,
  IconPlus,
  IconSearch,
  IconTicketNew,
  IconTrash,
} from '../components/icons';
import { RequesterFields, isPhoneComplete } from '../components/RequesterFields';
import {
  Avatar,
  CategoryOptionGroups,
  EmptyState,
  MobileFilterDrawer,
  Pagination,
  TableSkeleton,
} from '../components/ui';
import { usePageSize } from '../utils/usePageSize';
import { exportTableToExcel, exportTableToPdf } from '../utils/tableExport';
import { formatDurationMinutes } from '../utils/formatDuration';
import { LIST_POLL_INTERVAL_MS } from '../utils/pollInterval';
import { TranslationKey, useLanguage } from '../i18n/LanguageContext';

type T = (key: TranslationKey) => string;

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

function getStatusOptions(t: T) {
  return [
    { value: 'new', label: t('ticketFields.statusNew') },
    { value: 'in_progress', label: t('ticketFields.statusInProgress') },
    { value: 'waiting_user', label: t('ticketFields.statusWaitingUser') },
    { value: 'resolved', label: t('ticketFields.statusResolved') },
    { value: 'closed', label: t('ticketFields.statusClosed') },
  ];
}

function getPriorityOptions(t: T) {
  return [
    { value: 'low', label: t('ticketFields.priorityLow') },
    { value: 'medium', label: t('ticketFields.priorityMedium') },
    { value: 'high', label: t('ticketFields.priorityHigh') },
    { value: 'critical', label: t('ticketFields.priorityCritical') },
  ];
}

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
  const { t } = useLanguage();

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
          <h3>{t('tickets.createChoiceTitle')}</h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label={t('common.close')}>
            <IconClose width={18} height={18} />
          </button>
        </div>
        <div className="modal-body">
          <button type="button" className="choice-option" onClick={onSelectNew}>
            <span className="choice-option-icon">
              <IconTicketNew width={18} height={18} />
            </span>
            <span className="choice-option-text">
              <span className="choice-option-title">{t('tickets.createNewTitle')}</span>
              <span className="choice-option-desc">{t('tickets.createNewDesc')}</span>
            </span>
          </button>
          <button type="button" className="choice-option" onClick={onSelectLegacy}>
            <span className="choice-option-icon">
              <IconHistory width={18} height={18} />
            </span>
            <span className="choice-option-text">
              <span className="choice-option-title">{t('tickets.createLegacyTitle')}</span>
              <span className="choice-option-desc">{t('tickets.createLegacyDesc')}</span>
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
  const { t } = useLanguage();
  const PRIORITY_OPTIONS = getPriorityOptions(t);
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
          <h3>{t('tickets.newTicketModalTitle')}</h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label={t('common.close')}>
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
              <span>{t('tickets.subject')}</span>
              <input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder={t('tickets.subjectPlaceholder')}
                required
                autoFocus
              />
            </label>
            <label className="modal-field">
              <span>{t('tickets.description')}</span>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder={t('tickets.descriptionPlaceholder')}
                rows={4}
                required
              />
            </label>
            <label className="modal-field">
              <span>{t('tickets.category')}</span>
              <select
                value={form.categoryId}
                onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
                required
              >
                <option value="">{t('tickets.choose')}</option>
                <CategoryOptionGroups categories={categories} />
                <option value="__other__">{t('tickets.other')}</option>
              </select>
              {isOtherCategory && (
                <input
                  value={form.customCategoryName}
                  onChange={(e) => setForm((f) => ({ ...f, customCategoryName: e.target.value }))}
                  placeholder={t('tickets.categoryNamePlaceholder')}
                  required
                />
              )}
            </label>
            <label className="modal-field">
              <span>{t('tickets.priority')}</span>
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
              <span>{t('tickets.organization')}</span>
              <select
                value={form.organizationId}
                onChange={(e) => setForm((f) => ({ ...f, organizationId: e.target.value }))}
                className={attemptedSubmit && isOrgMissing ? 'field-invalid' : undefined}
                required
              >
                <option value="">{t('tickets.choose')}</option>
                {organizations.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
                <option value="__other__">{t('tickets.other')}</option>
              </select>
              {isOtherOrg && (
                <input
                  value={form.customOrgName}
                  onChange={(e) => setForm((f) => ({ ...f, customOrgName: e.target.value }))}
                  placeholder={t('tickets.orgNamePlaceholder')}
                  className={attemptedSubmit && isOrgMissing ? 'field-invalid' : undefined}
                  required
                />
              )}
              {attemptedSubmit && isOrgMissing && <p className="field-error">{t('tickets.orgRequired')}</p>}
            </label>
            <label className="modal-field">
              <span>{t('tickets.attachFile')}</span>
              <input type="file" multiple onChange={handleFilesChange} />
              {form.files.length > 0 && (
                <p className="file-list">{form.files.map((f) => f.name).join(', ')}</p>
              )}
            </label>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSaving}>
              {t('common.cancel')}
            </button>
            <button className="btn btn-primary" type="submit" disabled={disabled}>
              {isSaving ? t('tickets.creating') : t('tickets.createButton')}
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
  const { t } = useLanguage();
  const STATUS_OPTIONS = getStatusOptions(t);
  const PRIORITY_OPTIONS = getPriorityOptions(t);
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
          <h3>{t('tickets.legacyTicketModalTitle')}</h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label={t('common.close')}>
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
              <span>{t('tickets.subject')}</span>
              <input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder={t('tickets.subjectPlaceholder')}
                required
                autoFocus
              />
            </label>
            <label className="modal-field">
              <span>{t('tickets.description')}</span>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder={t('tickets.descriptionPlaceholder')}
                rows={4}
                required
              />
            </label>
            <label className="modal-field">
              <span>{t('tickets.category')}</span>
              <select
                value={form.categoryId}
                onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
                required
              >
                <option value="">{t('tickets.choose')}</option>
                <CategoryOptionGroups categories={categories} />
                <option value="__other__">{t('tickets.other')}</option>
              </select>
              {isOtherCategory && (
                <input
                  value={form.customCategoryName}
                  onChange={(e) => setForm((f) => ({ ...f, customCategoryName: e.target.value }))}
                  placeholder={t('tickets.categoryNamePlaceholder')}
                  required
                />
              )}
            </label>
            <label className="modal-field">
              <span>{t('tickets.priority')}</span>
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
              <span>{t('tickets.organization')}</span>
              <select
                value={form.organizationId}
                onChange={(e) => setForm((f) => ({ ...f, organizationId: e.target.value }))}
                className={attemptedSubmit && isOrgMissing ? 'field-invalid' : undefined}
                required
              >
                <option value="">{t('tickets.choose')}</option>
                {organizations.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
                <option value="__other__">{t('tickets.other')}</option>
              </select>
              {isOtherOrg && (
                <input
                  value={form.customOrgName}
                  onChange={(e) => setForm((f) => ({ ...f, customOrgName: e.target.value }))}
                  placeholder={t('tickets.orgNamePlaceholder')}
                  className={attemptedSubmit && isOrgMissing ? 'field-invalid' : undefined}
                  required
                />
              )}
              {attemptedSubmit && isOrgMissing && <p className="field-error">{t('tickets.orgRequired')}</p>}
            </label>
            <label className="modal-field">
              <span>{t('tickets.status')}</span>
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
              <span>{t('tickets.assignee')}</span>
              <select
                value={form.assignedToId}
                onChange={(e) => setForm((f) => ({ ...f, assignedToId: e.target.value }))}
              >
                <option value="">{t('tickets.unassigned')}</option>
                {admins.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.fullname ?? a.id}
                  </option>
                ))}
              </select>
              {showUnassignedClosedWarning && (
                <p className="field-hint field-hint--warning">{t('tickets.unassignedClosedWarning')}</p>
              )}
            </label>
            <label className="modal-field">
              <span>{t('tickets.createdAtDateTime')}</span>
              <input
                type="datetime-local"
                value={form.createdAt}
                onChange={(e) => setForm((f) => ({ ...f, createdAt: e.target.value }))}
                required
              />
            </label>
            <label className="modal-field">
              <span>{t('tickets.closedAtDateTimeOptional')}</span>
              <input
                type="datetime-local"
                value={form.closedAt}
                onChange={(e) => setForm((f) => ({ ...f, closedAt: e.target.value }))}
              />
            </label>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSaving}>
              {t('common.cancel')}
            </button>
            <button className="btn btn-primary" type="submit" disabled={disabled}>
              {isSaving ? t('tickets.creating') : t('tickets.createButton')}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}

function ticketPriorityLabel(priority: string, t: T): string {
  return getPriorityOptions(t).find((o) => o.value === priority)?.label ?? priority;
}

function ticketStatusLabel(status: string, t: T): string {
  return getStatusOptions(t).find((o) => o.value === status)?.label ?? status;
}

function ticketsToExportRows(tickets: Ticket[], t: T, dateLocale: string): (string | number)[][] {
  return tickets.map((t2) => [
    t2.number,
    t2.title,
    t2.organization?.name ?? '-',
    t2.requesterName ?? t2.createdBy?.fullname ?? '-',
    t2.requesterPhone ?? t2.createdBy?.phoneNumber ?? '-',
    t2.categoryEntity?.name ?? '-',
    ticketPriorityLabel(t2.priority, t),
    ticketStatusLabel(t2.status, t),
    t2.assignedTo?.fullname ?? t('tickets.unassigned'),
    new Date(t2.createdAt).toLocaleString(dateLocale),
    closingDuration(t2),
  ]);
}

function getExportHeaders(t: T): string[] {
  return [
    t('tickets.colNumber'),
    t('tickets.exportSubjectHeader'),
    t('tickets.colOrganization'),
    t('tickets.exportUserHeader'),
    t('tickets.exportPhoneHeader'),
    t('tickets.exportCategoryHeader'),
    t('tickets.exportPriorityHeader'),
    t('tickets.exportStatusHeader'),
    t('tickets.exportAssigneeHeader'),
    t('tickets.exportCreatedHeader'),
    t('tickets.exportClosedDurationHeader'),
  ];
}

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
  const { language, t } = useLanguage();
  const dateLocale = language === 'ru' ? 'ru-RU' : 'uz-UZ';
  const STATUS_OPTIONS = getStatusOptions(t);
  const PRIORITY_OPTIONS = getPriorityOptions(t);
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
      filters.statusFilter && `${t('tickets.exportStatusLabel')}: ${ticketStatusLabel(filters.statusFilter, t)}`,
      filters.priorityFilter &&
        `${t('tickets.exportPriorityLabel')}: ${ticketPriorityLabel(filters.priorityFilter, t)}`,
      filters.organizationFilter &&
        `${t('tickets.exportOrgLabel')}: ${organizations.find((o) => o.id === filters.organizationFilter)?.name ?? ''}`,
      filters.categoryFilter &&
        `${t('tickets.exportCategoryLabel')}: ${categories.find((c) => c.id === filters.categoryFilter)?.name ?? ''}`,
      filters.assignedToFilter &&
        `${t('tickets.exportAssigneeLabel')}: ${admins.find((a) => a.id === filters.assignedToFilter)?.fullname ?? ''}`,
      filters.createdFrom && `${filters.createdFrom} ${t('tickets.exportFromLabel')}`,
      filters.createdTo && `${filters.createdTo} ${t('tickets.exportToLabel')}`,
      filters.searchTerm && `${t('tickets.exportSearchLabel')}: "${filters.searchTerm}"`,
    ]
      .filter(Boolean)
      .join(' • ');

    return {
      title: t('tickets.exportTitle'),
      subtitle: `${t('tickets.exportCreatedLabel')}: ${new Date().toLocaleString(dateLocale)} • ${t(
        'tickets.exportTotalLabel',
      )}: ${matched.length}${t('tickets.exportUnit') ? ` ${t('tickets.exportUnit')}` : ''}${
        filterSummary ? ` • ${filterSummary}` : ''
      }`,
      headers: getExportHeaders(t),
      rows: ticketsToExportRows(matched, t, dateLocale),
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
          <h3>{t('tickets.exportModalTitle')}</h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label={t('common.close')}>
            <IconClose width={18} height={18} />
          </button>
        </div>
        <div className="modal-body">
          <p className="export-section-label">{t('tickets.filters')}</p>
          <div className="export-filters">
            <label className="modal-field">
              <span>{t('tickets.organization')}</span>
              <select
                value={filters.organizationFilter}
                onChange={(e) => setFilters((f) => ({ ...f, organizationFilter: e.target.value }))}
              >
                <option value="">{t('common.all')}</option>
                {organizations.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="modal-field">
              <span>{t('tickets.status')}</span>
              <select
                value={filters.statusFilter}
                onChange={(e) => setFilters((f) => ({ ...f, statusFilter: e.target.value }))}
              >
                <option value="">{t('common.all')}</option>
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="modal-field">
              <span>{t('tickets.priority')}</span>
              <select
                value={filters.priorityFilter}
                onChange={(e) => setFilters((f) => ({ ...f, priorityFilter: e.target.value }))}
              >
                <option value="">{t('common.all')}</option>
                {PRIORITY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="modal-field">
              <span>{t('tickets.category')}</span>
              <select
                value={filters.categoryFilter}
                onChange={(e) => setFilters((f) => ({ ...f, categoryFilter: e.target.value }))}
              >
                <option value="">{t('common.all')}</option>
                <CategoryOptionGroups categories={categories} />
              </select>
            </label>
            <label className="modal-field">
              <span>{t('tickets.assignedToFilterLabel')}</span>
              <select
                value={filters.assignedToFilter}
                onChange={(e) => setFilters((f) => ({ ...f, assignedToFilter: e.target.value }))}
              >
                <option value="">{t('common.all')}</option>
                {admins.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.fullname ?? a.id}
                  </option>
                ))}
              </select>
            </label>
            <label className="modal-field">
              <span>{t('tickets.createdFrom')}</span>
              <input
                type="date"
                value={filters.createdFrom}
                onChange={(e) => setFilters((f) => ({ ...f, createdFrom: e.target.value }))}
              />
            </label>
            <label className="modal-field">
              <span>{t('tickets.createdTo')}</span>
              <input
                type="date"
                value={filters.createdTo}
                onChange={(e) => setFilters((f) => ({ ...f, createdTo: e.target.value }))}
              />
            </label>
          </div>
          <button type="button" className="btn btn-secondary btn-sm" onClick={clearExportFilters}>
            {t('tickets.clearFilters')}
          </button>

          <p className="export-result-count">
            {matched.length} {t('tickets.exportResultCount')}
          </p>

          <p className="export-section-label">{t('tickets.format')}</p>
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
                <span className="choice-option-title">{isExportingExcel ? t('tickets.preparing') : 'Excel'}</span>
                <span className="choice-option-desc">{t('tickets.excelDesc')}</span>
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
                <span className="choice-option-title">{isExportingPdf ? t('tickets.preparing') : 'PDF'}</span>
                <span className="choice-option-desc">{t('tickets.pdfDesc')}</span>
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
  const { language, t } = useLanguage();
  const dateLocale = language === 'ru' ? 'ru-RU' : 'uz-UZ';
  const STATUS_OPTIONS = getStatusOptions(t);
  const PRIORITY_OPTIONS = getPriorityOptions(t);
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
  const [isToolbarOpen, setIsToolbarOpen] = useState(false);
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [savedFiltersError, setSavedFiltersError] = useState<string | null>(null);
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
      .then((res) => {
        setSavedFilters(res.data.data);
        setSavedFiltersError(null);
      })
      .catch(() => setSavedFiltersError(t('tickets.savedFiltersLoadError')));
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
      setTickets((prev) => prev.map((t2) => (t2.id === ticket.id ? { ...t2, assignedTo: updated.assignedTo } : t2)));
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message ?? t('tickets.assignError');
      setError(message);
    }
  };

  const applyBulkResult = (updated: Ticket[]) => {
    const byId = new Map(updated.map((t2) => [t2.id, t2]));
    setTickets((prev) => prev.map((t2) => byId.get(t2.id) ?? t2));
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
          ?.message ?? t('tickets.bulkAssignError');
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
          ?.message ?? t('tickets.bulkStatusError');
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
      setTickets((prev) => prev.filter((t2) => t2.id !== ticket.id));
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message ?? t('tickets.deleteError');
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
          setCreateError(t('tickets.createOrgError'));
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
          setCreateError(t('tickets.createCategoryError'));
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
          ?.message ?? t('tickets.createTicketError');
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
          setLegacyError(t('tickets.createOrgError'));
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
          setLegacyError(t('tickets.createCategoryError'));
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
          ?.message ?? t('tickets.createLegacyError');
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
    <AppShell title={t('tickets.title')} breadcrumb={t('tickets.breadcrumb')} contentClassName="app-content--table-scroll">
      {isLoading ? (
        <TableSkeleton rows={6} cols={10} />
      ) : (
        <>
          <div className="toolbar-collapsible">
            <div className="toolbar-header-row">
              <button
                type="button"
                className={`toolbar-toggle${isToolbarOpen ? ' toolbar-toggle--open' : ''}`}
                aria-expanded={isToolbarOpen}
                onClick={() => setIsToolbarOpen((open) => !open)}
              >
                <IconFilter width={15} height={15} />
                {t('tickets.toolbarToggle')}
                {activeFilterCount > 0 && (
                  <span className="filter-active-chip">{activeFilterCount}</span>
                )}
                <IconChevronDown width={15} height={15} className="toolbar-toggle-chevron" />
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setChoiceModalOpen(true)}
              >
                <IconPlus width={15} height={15} />
                {t('tickets.create')}
              </button>
            </div>

            {isToolbarOpen && (
              <>
                <div className="toolbar">
                  <div className="toolbar-search toolbar-search-full">
                    <IconSearch width={15} height={15} />
                    <input
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder={t('tickets.searchPlaceholder')}
                    />
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setExportModalOpen(true)}
                  >
                    <IconDownload width={15} height={15} />
                    {t('tickets.download')}
                  </button>
                </div>

                <MobileFilterDrawer activeCount={activeFilterCount}>
                  <div className="filters">
                    <label>
                      {t('tickets.organization')}
                      <select value={organizationFilter} onChange={(e) => setOrganizationFilter(e.target.value)}>
                        <option value="">{t('common.all')}</option>
                        {organizations.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      {t('tickets.status')}
                      <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                        <option value="">{t('common.all')}</option>
                        {STATUS_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      {t('tickets.priority')}
                      <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
                        <option value="">{t('common.all')}</option>
                        {PRIORITY_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      {t('tickets.category')}
                      <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                        <option value="">{t('common.all')}</option>
                        <CategoryOptionGroups categories={categories} />
                      </select>
                    </label>
                    <label>
                      {t('tickets.assignedToFilterLabel')}
                      <select value={assignedToFilter} onChange={(e) => setAssignedToFilter(e.target.value)}>
                        <option value="">{t('common.all')}</option>
                        {admins.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.fullname ?? a.id}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      {t('tickets.createdFrom')}
                      <input type="date" value={createdFrom} onChange={(e) => setCreatedFrom(e.target.value)} />
                    </label>
                    <label>
                      {t('tickets.createdTo')}
                      <input type="date" value={createdTo} onChange={(e) => setCreatedTo(e.target.value)} />
                    </label>
                    <div className="filters-actions">
                      {activeFilterCount > 0 && (
                        <span className="filter-active-chip">
                          {activeFilterCount} {t('tickets.activeFilterCount')}
                        </span>
                      )}
                      <button type="button" className="btn btn-secondary btn-sm" onClick={clearFilters}>
                        {t('tickets.clearFilters')}
                      </button>
                    </div>
                  </div>
                </MobileFilterDrawer>
              </>
            )}
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
                    aria-label={`"${sf.name}" ${t('tickets.removeSavedFilter')}`}
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
                      placeholder={t('tickets.filterNamePlaceholder')}
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
                      {t('common.save')}
                    </button>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSavingFilterName(null)}>
                      {t('common.cancel')}
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => setSavingFilterName('')}
                  >
                    {t('tickets.saveCurrentFilter')}
                  </button>
                ))}
            </div>
          )}

          {savedFiltersError && <p className="form-error">{savedFiltersError}</p>}

          {error && <p className="form-error">{error}</p>}

          <p className="filter-results">
            {filteredTickets.length} {t('tickets.resultsFound')}
          </p>

          {filteredTickets.length === 0 ? (
            <EmptyState
              icon={<IconInbox width={24} height={24} />}
              title={t('tickets.notFound')}
              description={t('tickets.notFoundDescription')}
              actionLabel={t('tickets.clearFilters')}
              onAction={clearFilters}
            />
          ) : (
            <div className="table-wrap table-wrap--pin-actions">
              {selectedIds.size > 0 && (
                <div className="bulk-actions-bar">
                  <span className="bulk-actions-count">
                    {selectedIds.size} {t('tickets.selectedCount')}
                  </span>
                  <label className="bulk-actions-field">
                    {t('tickets.assignSelected')}
                    <select
                      className="assign-select"
                      defaultValue="__placeholder__"
                      disabled={isBulkSaving}
                      onChange={(e) => handleBulkAssign(e.target.value)}
                    >
                      <option value="__placeholder__" disabled>
                        {t('tickets.choose')}
                      </option>
                      <option value="">{t('tickets.unassigned')}</option>
                      {admins.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.fullname ?? a.id}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="bulk-actions-field">
                    {t('tickets.changeStatus')}
                    <select
                      defaultValue=""
                      disabled={isBulkSaving}
                      onChange={(e) => handleBulkStatus(e.target.value)}
                    >
                      <option value="" disabled>
                        {t('tickets.choose')}
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
                    {t('common.cancel')}
                  </button>
                </div>
              )}
              <table className="tickets-table">
                <TicketTableColgroup isSuperadmin={isSuperadmin} />
                <thead>
                  <tr>
                    <th></th>
                    <th>{t('tickets.colNumber')}</th>
                    <th>{t('tickets.colSubject')}</th>
                    <th>{t('tickets.colOrganization')}</th>
                    <th>{t('tickets.colUser')}</th>
                    <th>{t('tickets.colCategory')}</th>
                    <th>{t('tickets.colPriority')}</th>
                    <th>{t('tickets.colStatus')}</th>
                    <th>{t('tickets.colAssignee')}</th>
                    <th>{t('tickets.colResolutionTime')}</th>
                    <th>{t('tickets.colCreatedAt')}</th>
                    {isSuperadmin && <th></th>}
                  </tr>
                </thead>
                <tbody>
                  {paginatedTickets.map((t2, idx) => (
                    <tr
                      key={t2.id}
                      className={`clickable-row row--status-${t2.status}`}
                      onClick={() => navigate(`/dashboard/tickets/${t2.id}`)}
                    >
                      <td onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(t2.id)}
                          onChange={() => toggleSelectOne(t2.id)}
                          aria-label={`${t2.title} ${t('tickets.selectRow')}`}
                        />
                      </td>
                      <td className="cell-muted">{(currentPage - 1) * pageSize + idx + 1}</td>
                      <td className="cell-primary">{truncateWords(t2.title, 7)}</td>
                      <td className="cell-nowrap">{t2.organization?.name ?? '—'}</td>
                      <td>
                        <div className="cell-user">
                          <Avatar name={t2.requesterName ?? t2.createdBy?.fullname} />
                          <div className="cell-user-info">
                            <span>{t2.requesterName ?? t2.createdBy?.fullname ?? '—'}</span>
                            {(t2.requesterPhone ?? t2.createdBy?.phoneNumber) && (
                              <span className="cell-muted cell-user-phone">
                                {t2.requesterPhone ?? t2.createdBy?.phoneNumber}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="cell-muted">{t2.categoryEntity?.name ?? '—'}</td>
                      <td>
                        <span className={`priority priority--${t2.priority}`}>{ticketPriorityLabel(t2.priority, t)}</span>
                      </td>
                      <td>
                        <span className={`status status--${t2.status}`}>
                          {STATUS_OPTIONS.find((o) => o.value === t2.status)?.label ?? t2.status}
                        </span>
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <select
                          className="assign-select"
                          value={t2.assignedTo?.id ?? ''}
                          onChange={(e) => handleAssign(t2, e.target.value)}
                        >
                          <option value="">{t('tickets.unassigned')}</option>
                          {admins.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.fullname ?? a.id}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="cell-muted">{closingDuration(t2)}</td>
                      <td className="cell-muted">
                        <div className="cell-datetime">
                          <span>{new Date(t2.createdAt).toLocaleDateString(dateLocale)}</span>
                          <span className="cell-datetime-time">{new Date(t2.createdAt).toLocaleTimeString(dateLocale)}</span>
                        </div>
                      </td>
                      {isSuperadmin && (
                        <td className="table-actions" onClick={(e) => e.stopPropagation()}>
                          <button className="danger ticket-delete-btn" onClick={() => setTicketToDelete(t2)}>
                            <IconTrash width={13} height={13} />
                            {t('tickets.delete')}
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
        title={t('tickets.deleteTitle')}
        message={
          ticketToDelete ? t('tickets.deleteConfirmTemplate').replace('{title}', ticketToDelete.title) : ''
        }
        onConfirm={handleDelete}
        onCancel={() => setTicketToDelete(null)}
      />

      <ConfirmModal
        isOpen={!!bulkStatusToConfirm}
        title={t('tickets.bulkCloseTitle')}
        message={t('tickets.bulkCloseConfirmTemplate').replace('{count}', String(selectedIds.size))}
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
