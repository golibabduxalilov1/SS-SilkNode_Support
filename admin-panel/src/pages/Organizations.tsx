import { FormEvent, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../api/client';
import { AppShell } from '../components/AppShell';
import { ConfirmModal } from '../components/ConfirmModal';
import { IconBuilding, IconClose, IconEdit, IconPlus, IconPower, IconTrash } from '../components/icons';
import { EmptyState, TableSkeleton } from '../components/ui';
import { useLanguage } from '../i18n/LanguageContext';

interface Organization {
  id: string;
  name: string;
  isActive: boolean;
  description: string | null;
  colorTag: string | null;
}

export interface OrganizationFormValues {
  name: string;
  description: string;
  colorTag: string;
}

type ModalMode = 'create' | 'edit';

function OrganizationModal({
  isOpen,
  mode,
  initial,
  onClose,
  onSubmit,
  isSaving,
  error,
}: {
  isOpen: boolean;
  mode: ModalMode;
  initial: OrganizationFormValues;
  onClose: () => void;
  onSubmit: (values: OrganizationFormValues) => void;
  isSaving: boolean;
  error: string | null;
}) {
  const { t } = useLanguage();
  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description);
  const [colorTag, setColorTag] = useState(initial.colorTag);

  useEffect(() => {
    if (isOpen) {
      setName(initial.name);
      setDescription(initial.description);
      setColorTag(initial.colorTag);
    }
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

  const trimmed = name.trim();
  const disabled = isSaving || !trimmed;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (disabled) return;
    onSubmit({ name: trimmed, description: description.trim(), colorTag });
  };

  return createPortal(
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-card">
        <div className="modal-header">
          <span className="modal-header-icon">
            <IconBuilding width={18} height={18} />
          </span>
          <h3>{mode === 'create' ? t('organizations.createTitle') : t('organizations.editTitle')}</h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label={t('common.close')}>
            <IconClose width={18} height={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <p className="form-error">{error}</p>}
            <label className="modal-field">
              <span>{t('organizations.name')}</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('organizations.namePlaceholder')}
                required
                autoFocus
              />
            </label>
            <label className="modal-field">
              <span>{t('organizations.description')}</span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('organizations.descriptionPlaceholder')}
                rows={3}
              />
            </label>
            <label className="modal-field modal-field--color">
              <span>{t('organizations.colorTag')}</span>
              <div className="color-tag-input">
                <input
                  type="color"
                  value={colorTag || '#8a6a1f'}
                  onChange={(e) => setColorTag(e.target.value)}
                />
                {colorTag && (
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setColorTag('')}>
                    {t('organizations.clear')}
                  </button>
                )}
              </div>
            </label>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSaving}>
              {t('common.cancel')}
            </button>
            <button className="btn btn-primary" type="submit" disabled={disabled}>
              {isSaving ? t('common.saving') : t('common.save')}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}

export function OrganizationsPage() {
  const { t } = useLanguage();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>('create');
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [orgToDelete, setOrgToDelete] = useState<Organization | null>(null);

  const load = () => {
    setIsLoading(true);
    api
      .get('/admin/organizations')
      .then((res) => setOrganizations(res.data.data))
      .finally(() => setIsLoading(false));
  };

  useEffect(load, []);

  const openCreateModal = () => {
    setModalMode('create');
    setEditingOrg(null);
    setModalError(null);
    setModalOpen(true);
  };

  const openEditModal = (org: Organization) => {
    setModalMode('edit');
    setEditingOrg(org);
    setModalError(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    if (isSaving) return;
    setModalOpen(false);
  };

  const handleModalSubmit = async (values: OrganizationFormValues) => {
    setIsSaving(true);
    setModalError(null);
    const payload = {
      name: values.name,
      description: values.description || null,
      colorTag: values.colorTag || null,
    };
    try {
      if (modalMode === 'create') {
        await api.post('/admin/organizations', payload);
      } else if (editingOrg) {
        await api.patch(`/admin/organizations/${editingOrg.id}`, payload);
      }
      setModalOpen(false);
      load();
    } catch {
      setModalError(modalMode === 'create' ? t('organizations.createError') : t('organizations.editError'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (org: Organization) => {
    await api.patch(`/admin/organizations/${org.id}`, { isActive: !org.isActive });
    load();
  };

  const handleDelete = async () => {
    if (!orgToDelete) return;
    const org = orgToDelete;
    setOrgToDelete(null);
    try {
      await api.delete(`/admin/organizations/${org.id}`);
      setOrganizations((prev) => prev.filter((o) => o.id !== org.id));
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message ?? t('organizations.deleteError');
      setError(message);
    }
  };

  return (
    <AppShell title={t('organizations.title')} breadcrumb={t('organizations.breadcrumb')}>
      <div className="toolbar">
        <button className="btn btn-primary" type="button" onClick={openCreateModal}>
          <IconPlus width={15} height={15} />
          {t('organizations.add')}
        </button>
      </div>
      {error && <p className="form-error">{error}</p>}

      {isLoading ? (
        <TableSkeleton rows={4} cols={3} />
      ) : organizations.length === 0 ? (
        <EmptyState
          icon={<IconBuilding width={24} height={24} />}
          title={t('organizations.empty')}
          description={t('organizations.emptyDescription')}
        />
      ) : (
        <div className="table-wrap">
          <table className="tickets-table tickets-table--equal organizations-table">
            <thead>
              <tr>
                <th>{t('organizations.colName')}</th>
                <th>{t('organizations.colStatus')}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {organizations.map((o) => (
                <tr key={o.id}>
                  <td>
                    <div className="cell-user">
                      <span className="avatar avatar--sm">
                        <IconBuilding width={12} height={12} />
                      </span>
                      {o.colorTag && (
                        <span className="color-tag-dot" style={{ background: o.colorTag }} title={o.colorTag} />
                      )}
                      <div className="cell-user-info">
                        <span className="cell-primary">{o.name}</span>
                        {o.description && <span className="cell-description">{o.description}</span>}
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`status status--${o.isActive ? 'active' : 'inactive'}`}>
                      {o.isActive ? t('organizations.active') : t('organizations.inactive')}
                    </span>
                  </td>
                  <td className="table-actions">
                    <button onClick={() => openEditModal(o)}>
                      <IconEdit width={13} height={13} />
                      {t('organizations.edit')}
                    </button>
                    <button onClick={() => handleToggleActive(o)}>
                      <IconPower width={13} height={13} />
                      {o.isActive ? t('organizations.deactivate') : t('organizations.activate')}
                    </button>
                    <button className="danger" onClick={() => setOrgToDelete(o)}>
                      <IconTrash width={13} height={13} />
                      {t('organizations.delete')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <OrganizationModal
        isOpen={modalOpen}
        mode={modalMode}
        initial={
          modalMode === 'edit' && editingOrg
            ? {
                name: editingOrg.name,
                description: editingOrg.description ?? '',
                colorTag: editingOrg.colorTag ?? '',
              }
            : { name: '', description: '', colorTag: '' }
        }
        onClose={closeModal}
        onSubmit={handleModalSubmit}
        isSaving={isSaving}
        error={modalError}
      />

      <ConfirmModal
        isOpen={!!orgToDelete}
        title={t('organizations.deleteTitle')}
        message={
          orgToDelete ? t('organizations.deleteConfirmTemplate').replace('{name}', orgToDelete.name) : ''
        }
        onConfirm={handleDelete}
        onCancel={() => setOrgToDelete(null)}
      />
    </AppShell>
  );
}
