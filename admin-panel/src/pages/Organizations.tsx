import { FormEvent, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../api/client';
import { AppShell } from '../components/AppShell';
import { ConfirmModal } from '../components/ConfirmModal';
import { IconBuilding, IconClose, IconEdit, IconPlus, IconPower, IconTrash } from '../components/icons';
import { EmptyState, TableSkeleton } from '../components/ui';

interface Organization {
  id: string;
  name: string;
  isActive: boolean;
}

type ModalMode = 'create' | 'edit';

function OrganizationModal({
  isOpen,
  mode,
  initialName,
  onClose,
  onSubmit,
  isSaving,
  error,
}: {
  isOpen: boolean;
  mode: ModalMode;
  initialName: string;
  onClose: () => void;
  onSubmit: (name: string) => void;
  isSaving: boolean;
  error: string | null;
}) {
  const [name, setName] = useState(initialName);

  useEffect(() => {
    if (isOpen) setName(initialName);
  }, [isOpen, initialName]);

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
  const unchanged = mode === 'edit' && trimmed === initialName.trim();
  const disabled = isSaving || !trimmed || unchanged;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (disabled) return;
    onSubmit(trimmed);
  };

  return createPortal(
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-card">
        <div className="modal-header">
          <span className="modal-header-icon">
            <IconBuilding width={18} height={18} />
          </span>
          <h3>{mode === 'create' ? 'Yangi tashkilot' : 'Tashkilotni tahrirlash'}</h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Yopish">
            <IconClose width={18} height={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <p className="form-error">{error}</p>}
            <label className="modal-field">
              <span>Nomi</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tashkilot nomi"
                required
                autoFocus
              />
            </label>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSaving}>
              Bekor qilish
            </button>
            <button className="btn btn-primary" type="submit" disabled={disabled}>
              {isSaving ? 'Saqlanmoqda...' : 'Saqlash'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}

export function OrganizationsPage() {
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

  const handleModalSubmit = async (name: string) => {
    setIsSaving(true);
    setModalError(null);
    try {
      if (modalMode === 'create') {
        await api.post('/admin/organizations', { name });
      } else if (editingOrg) {
        await api.patch(`/admin/organizations/${editingOrg.id}`, { name });
      }
      setModalOpen(false);
      load();
    } catch {
      setModalError(
        modalMode === 'create' ? "Tashkilot yasab bo'lmadi." : "Tashkilot nomini o'zgartirib bo'lmadi.",
      );
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
      load();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message ?? "Tashkilotni o'chirib bo'lmadi.";
      setError(message);
    }
  };

  return (
    <AppShell title="Tashkilotlar" breadcrumb="Dashboard / Tashkilotlar">
      <div className="toolbar">
        <button className="btn btn-primary" type="button" onClick={openCreateModal}>
          <IconPlus width={15} height={15} />
          Qo'shish
        </button>
      </div>
      {error && <p className="form-error">{error}</p>}

      {isLoading ? (
        <TableSkeleton rows={4} cols={3} />
      ) : organizations.length === 0 ? (
        <EmptyState
          icon={<IconBuilding width={24} height={24} />}
          title="Hozircha tashkilotlar yo'q"
          description="Yuqoridagi tugma orqali birinchi tashkilotni qo'shing."
        />
      ) : (
        <div className="table-wrap">
          <table className="tickets-table tickets-table--equal organizations-table">
            <thead>
              <tr>
                <th>Nomi</th>
                <th>Holati</th>
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
                      <span className="cell-primary">{o.name}</span>
                    </div>
                  </td>
                  <td>
                    <span className={`status status--${o.isActive ? 'active' : 'inactive'}`}>
                      {o.isActive ? 'Faol' : "Nofaol"}
                    </span>
                  </td>
                  <td className="table-actions">
                    <button onClick={() => openEditModal(o)}>
                      <IconEdit width={13} height={13} />
                      Tahrirlash
                    </button>
                    <button onClick={() => handleToggleActive(o)}>
                      <IconPower width={13} height={13} />
                      {o.isActive ? 'Nofaollashtirish' : 'Faollashtirish'}
                    </button>
                    <button className="danger" onClick={() => setOrgToDelete(o)}>
                      <IconTrash width={13} height={13} />
                      O'chirish
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
        initialName={modalMode === 'edit' ? editingOrg?.name ?? '' : ''}
        onClose={closeModal}
        onSubmit={handleModalSubmit}
        isSaving={isSaving}
        error={modalError}
      />

      <ConfirmModal
        isOpen={!!orgToDelete}
        title="Tashkilotni o'chirish"
        message={
          orgToDelete
            ? `"${orgToDelete.name}" tashkilotini o'chirmoqchimisiz? Bu amalni ortga qaytarib bo'lmaydi.`
            : ''
        }
        onConfirm={handleDelete}
        onCancel={() => setOrgToDelete(null)}
      />
    </AppShell>
  );
}
