import { FormEvent, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { AppShell } from '../components/AppShell';
import { ConfirmModal } from '../components/ConfirmModal';
import { IconClose, IconEdit, IconPlus, IconPower, IconTrash, IconUsers } from '../components/icons';
import { EmptyState, TableSkeleton } from '../components/ui';
import { useLanguage } from '../i18n/LanguageContext';

interface Organization {
  id: string;
  name: string;
}

interface Employee {
  id: string;
  fullname: string | null;
  adminLogin: string | null;
  role: 'admin' | 'superadmin';
  organization: Organization | null;
  isActive: boolean;
  telegramId: string | null;
}

interface EmployeeFormData {
  fullname: string;
  adminLogin: string;
  password: string;
  role: 'admin' | 'superadmin';
  organizationId: string;
  telegramId: string;
}

const emptyForm: EmployeeFormData = {
  fullname: '',
  adminLogin: '',
  password: '',
  role: 'admin',
  organizationId: '',
  telegramId: '',
};

type ModalMode = 'create' | 'edit';

function EmployeeModal({
  isOpen,
  mode,
  initialData,
  organizations,
  superadminTaken,
  onClose,
  onSubmit,
  isSaving,
  error,
}: {
  isOpen: boolean;
  mode: ModalMode;
  initialData: EmployeeFormData;
  organizations: Organization[];
  superadminTaken: boolean;
  onClose: () => void;
  onSubmit: (data: EmployeeFormData, newOrgName: string) => void;
  isSaving: boolean;
  error: string | null;
}) {
  const { t } = useLanguage();
  const [form, setForm] = useState<EmployeeFormData>(initialData);
  const [newOrgName, setNewOrgName] = useState('');

  useEffect(() => {
    if (isOpen) {
      setForm(initialData);
      setNewOrgName('');
    }
  }, [isOpen, initialData]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit(form, newOrgName);
  };

  return createPortal(
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-card">
        <div className="modal-header">
          <span className="modal-header-icon">
            <IconUsers width={18} height={18} />
          </span>
          <h3>{mode === 'create' ? t('employees.createTitle') : t('employees.editTitle')}</h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label={t('common.close')}>
            <IconClose width={18} height={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <p className="form-error">{error}</p>}
            <label className="modal-field">
              <span>{t('employees.fullname')}</span>
              <input
                value={form.fullname}
                onChange={(e) => setForm({ ...form, fullname: e.target.value })}
                placeholder={t('employees.fullname')}
                autoFocus
              />
            </label>
            <label className="modal-field">
              <span>{t('employees.login')}</span>
              <input
                value={form.adminLogin}
                onChange={(e) => setForm({ ...form, adminLogin: e.target.value })}
                placeholder={t('employees.login')}
              />
            </label>
            <label className="modal-field">
              <span>{mode === 'edit' ? t('employees.newPasswordOptional') : t('employees.password')}</span>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder={mode === 'edit' ? t('employees.newPasswordOptional') : t('employees.password')}
              />
            </label>
            <label className="modal-field">
              <span>{t('employees.telegramIdOptional')}</span>
              <input
                value={form.telegramId}
                onChange={(e) => setForm({ ...form, telegramId: e.target.value.replace(/\D/g, '') })}
                placeholder="Telegram ID"
                inputMode="numeric"
              />
            </label>
            <label className="modal-field">
              <span>{t('employees.role')}</span>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as 'admin' | 'superadmin' })}
              >
                <option value="admin">{t('employees.admin')}</option>
                <option value="superadmin" disabled={superadminTaken}>
                  {t('employees.superadmin')}
                  {superadminTaken ? ` ${t('employees.taken')}` : ''}
                </option>
              </select>
            </label>
            <label className="modal-field">
              <span>{t('employees.organization')}</span>
              <select
                value={form.organizationId}
                onChange={(e) => setForm({ ...form, organizationId: e.target.value })}
              >
                <option value="">{t('employees.noOrganization')}</option>
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
                <option value="__other__">{t('employees.other')}</option>
              </select>
            </label>
            {form.organizationId === '__other__' && (
              <label className="modal-field">
                <span>{t('employees.newOrganizationName')}</span>
                <input
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                  placeholder={t('employees.newOrganizationName')}
                />
              </label>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSaving}>
              {t('common.cancel')}
            </button>
            <button className="btn btn-primary" type="submit" disabled={isSaving}>
              {isSaving ? t('common.saving') : mode === 'edit' ? t('common.save') : t('employees.createButton')}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}

export function EmployeesPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const isSuperadmin = user?.role === 'superadmin';

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>('create');
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);

  const editingId = editingEmployee?.id ?? null;
  const existingSuperadmin = employees.find((emp) => emp.role === 'superadmin');
  const superadminTaken = !!existingSuperadmin && existingSuperadmin.id !== editingId;

  const load = () => {
    setIsLoading(true);
    api
      .get('/admin/users')
      .then((res) => setEmployees(res.data.data))
      .finally(() => setIsLoading(false));
  };

  useEffect(load, []);

  useEffect(() => {
    api.get('/admin/organizations').then((res) => setOrganizations(res.data.data));
  }, []);

  const modalInitialData = useMemo<EmployeeFormData>(() => {
    if (modalMode === 'edit' && editingEmployee) {
      return {
        fullname: editingEmployee.fullname ?? '',
        adminLogin: editingEmployee.adminLogin ?? '',
        password: '',
        role: editingEmployee.role,
        organizationId: editingEmployee.organization?.id ?? '',
        telegramId: editingEmployee.telegramId ?? '',
      };
    }
    return emptyForm;
  }, [modalMode, editingEmployee]);

  const openCreateModal = () => {
    setModalMode('create');
    setEditingEmployee(null);
    setModalError(null);
    setModalOpen(true);
  };

  const openEditModal = (employee: Employee) => {
    setModalMode('edit');
    setEditingEmployee(employee);
    setModalError(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    if (isSaving) return;
    setModalOpen(false);
  };

  const handleModalSubmit = async (data: EmployeeFormData, newOrgName: string) => {
    if (!editingId && (!data.fullname.trim() || !data.adminLogin.trim() || data.password.length < 6)) {
      setModalError(t('employees.validationRequired'));
      return;
    }
    if (editingId && !data.adminLogin.trim()) {
      setModalError(t('employees.validationLoginRequired'));
      return;
    }
    if (data.organizationId === '__other__' && !newOrgName.trim()) {
      setModalError(t('employees.validationNewOrgRequired'));
      return;
    }

    setIsSaving(true);
    setModalError(null);
    try {
      let organizationId: string | null = data.organizationId || null;
      if (data.organizationId === '__other__') {
        const res = await api.post('/admin/organizations', { name: newOrgName.trim() });
        const organization = res.data.data;
        organizationId = organization.id;
        setOrganizations((prev) => [...prev, organization]);
      }

      const payload: Record<string, unknown> = {
        fullname: data.fullname.trim(),
        adminLogin: data.adminLogin.trim(),
        role: data.role,
        organizationId,
        telegramId: data.telegramId.trim() || null,
      };
      if (data.password) payload.password = data.password;

      if (editingId) {
        await api.patch(`/admin/users/${editingId}`, payload);
      } else {
        await api.post('/admin/users', payload);
      }
      setModalOpen(false);
      setEditingEmployee(null);
      load();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message ?? t('employees.saveError');
      setModalError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (employee: Employee) => {
    await api.patch(`/admin/users/${employee.id}`, { isActive: !employee.isActive });
    load();
  };

  const handleDelete = async () => {
    if (!employeeToDelete) return;
    const employee = employeeToDelete;
    setEmployeeToDelete(null);
    try {
      await api.delete(`/admin/users/${employee.id}`);
      load();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message ?? t('employees.deleteError');
      setError(message);
    }
  };

  if (!isSuperadmin) {
    return (
      <AppShell title={t('employees.title')} breadcrumb={t('employees.breadcrumb')}>
        <EmptyState
          icon={<IconUsers width={24} height={24} />}
          title={t('employees.noAccess')}
          description={t('employees.noAccessDescription')}
        />
      </AppShell>
    );
  }

  return (
    <AppShell title={t('employees.title')} breadcrumb={t('employees.breadcrumb')}>
      <div className="toolbar">
        <button className="btn btn-primary" type="button" onClick={openCreateModal}>
          <IconPlus width={15} height={15} />
          {t('employees.add')}
        </button>
      </div>
      {error && <p className="form-error">{error}</p>}

      {isLoading ? (
        <TableSkeleton rows={4} cols={6} />
      ) : employees.length === 0 ? (
        <EmptyState
          icon={<IconUsers width={24} height={24} />}
          title={t('employees.empty')}
          description={t('employees.emptyDescription')}
        />
      ) : (
        <div className="table-wrap">
          <table className="tickets-table employees-table">
            <thead>
              <tr>
                <th>{t('employees.colFullname')}</th>
                <th>{t('employees.colLogin')}</th>
                <th>{t('employees.colTelegramId')}</th>
                <th>{t('employees.colRole')}</th>
                <th>{t('employees.colOrganization')}</th>
                <th>{t('employees.colStatus')}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => (
                <tr key={emp.id}>
                  <td>
                    <div className="cell-user">
                      <span className="avatar avatar--sm">
                        <IconUsers width={12} height={12} />
                      </span>
                      <span className="cell-primary">{emp.fullname ?? '—'}</span>
                    </div>
                  </td>
                  <td>{emp.adminLogin ?? '—'}</td>
                  <td>{emp.telegramId ?? '—'}</td>
                  <td>{emp.role === 'superadmin' ? t('employees.superadmin') : t('employees.admin')}</td>
                  <td>{emp.organization?.name ?? '—'}</td>
                  <td>
                    <span className={`status status--${emp.isActive ? 'active' : 'inactive'}`}>
                      {emp.isActive ? t('employees.active') : t('employees.inactive')}
                    </span>
                  </td>
                  <td className="table-actions">
                    <button onClick={() => openEditModal(emp)}>
                      <IconEdit width={13} height={13} />
                      {t('employees.edit')}
                    </button>
                    <button onClick={() => handleToggleActive(emp)}>
                      <IconPower width={13} height={13} />
                      {emp.isActive ? t('employees.deactivate') : t('employees.activate')}
                    </button>
                    {emp.id !== user?.id && (
                      <button className="danger" onClick={() => setEmployeeToDelete(emp)}>
                        <IconTrash width={13} height={13} />
                        {t('employees.delete')}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <EmployeeModal
        isOpen={modalOpen}
        mode={modalMode}
        initialData={modalInitialData}
        organizations={organizations}
        superadminTaken={superadminTaken}
        onClose={closeModal}
        onSubmit={handleModalSubmit}
        isSaving={isSaving}
        error={modalError}
      />

      <ConfirmModal
        isOpen={!!employeeToDelete}
        title={t('employees.deleteTitle')}
        message={
          employeeToDelete
            ? t('employees.deleteConfirmTemplate').replace(
                '{name}',
                employeeToDelete.fullname ?? employeeToDelete.adminLogin ?? '',
              )
            : ''
        }
        onConfirm={handleDelete}
        onCancel={() => setEmployeeToDelete(null)}
      />
    </AppShell>
  );
}
