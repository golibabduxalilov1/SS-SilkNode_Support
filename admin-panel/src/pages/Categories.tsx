import { FormEvent, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../api/client';
import { AppShell } from '../components/AppShell';
import { ConfirmModal } from '../components/ConfirmModal';
import { IconClose, IconEdit, IconLayers, IconPlus, IconPower, IconTrash } from '../components/icons';
import { EmptyState, TableSkeleton } from '../components/ui';

interface Category {
  id: string;
  name: string;
  isActive: boolean;
}

type ModalMode = 'create' | 'edit';

function CategoryModal({
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
            <IconLayers width={18} height={18} />
          </span>
          <h3>{mode === 'create' ? 'Yangi kategoriya' : 'Kategoriyani tahrirlash'}</h3>
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
                placeholder="Kategoriya nomi"
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

export function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>('create');
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);

  const load = () => {
    setIsLoading(true);
    api
      .get('/admin/categories')
      .then((res) => setCategories(res.data.data))
      .finally(() => setIsLoading(false));
  };

  useEffect(load, []);

  const openCreateModal = () => {
    setModalMode('create');
    setEditingCategory(null);
    setModalError(null);
    setModalOpen(true);
  };

  const openEditModal = (category: Category) => {
    setModalMode('edit');
    setEditingCategory(category);
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
        await api.post('/admin/categories', { name });
      } else if (editingCategory) {
        await api.patch(`/admin/categories/${editingCategory.id}`, { name });
      }
      setModalOpen(false);
      load();
    } catch {
      setModalError(
        modalMode === 'create' ? "Kategoriya yasab bo'lmadi." : "Kategoriya nomini o'zgartirib bo'lmadi.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (category: Category) => {
    await api.patch(`/admin/categories/${category.id}`, { isActive: !category.isActive });
    load();
  };

  const handleDelete = async () => {
    if (!categoryToDelete) return;
    const category = categoryToDelete;
    setCategoryToDelete(null);
    try {
      await api.delete(`/admin/categories/${category.id}`);
      load();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message ?? "Kategoriyani o'chirib bo'lmadi.";
      setError(message);
    }
  };

  return (
    <AppShell title="Kategoriyalar" breadcrumb="Dashboard / Kategoriyalar">
      <div className="toolbar">
        <button className="btn btn-primary" type="button" onClick={openCreateModal}>
          <IconPlus width={15} height={15} />
          Qo'shish
        </button>
      </div>
      {error && <p className="form-error">{error}</p>}

      {isLoading ? (
        <TableSkeleton rows={4} cols={3} />
      ) : categories.length === 0 ? (
        <EmptyState
          icon={<IconLayers width={24} height={24} />}
          title="Hozircha kategoriyalar yo'q"
          description="Yuqoridagi tugma orqali birinchi kategoriyani qo'shing."
        />
      ) : (
        <div className="table-wrap">
          <table className="tickets-table tickets-table--equal">
            <thead>
              <tr>
                <th>Nomi</th>
                <th>Holati</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => (
                <tr key={c.id}>
                  <td>
                    <div className="cell-user">
                      <span className="avatar avatar--sm">
                        <IconLayers width={12} height={12} />
                      </span>
                      <span className="cell-primary">{c.name}</span>
                    </div>
                  </td>
                  <td>
                    <span className={`status status--${c.isActive ? 'active' : 'inactive'}`}>
                      {c.isActive ? 'Faol' : 'Nofaol'}
                    </span>
                  </td>
                  <td className="table-actions">
                    <button onClick={() => openEditModal(c)}>
                      <IconEdit width={13} height={13} />
                      Tahrirlash
                    </button>
                    <button onClick={() => handleToggleActive(c)}>
                      <IconPower width={13} height={13} />
                      {c.isActive ? 'Nofaollashtirish' : 'Faollashtirish'}
                    </button>
                    <button className="danger" onClick={() => setCategoryToDelete(c)}>
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

      <CategoryModal
        isOpen={modalOpen}
        mode={modalMode}
        initialName={modalMode === 'edit' ? editingCategory?.name ?? '' : ''}
        onClose={closeModal}
        onSubmit={handleModalSubmit}
        isSaving={isSaving}
        error={modalError}
      />

      <ConfirmModal
        isOpen={!!categoryToDelete}
        title="Kategoriyani o'chirish"
        message={
          categoryToDelete
            ? `"${categoryToDelete.name}" kategoriyasini o'chirmoqchimisiz? Bu amalni ortga qaytarib bo'lmaydi.`
            : ''
        }
        onConfirm={handleDelete}
        onCancel={() => setCategoryToDelete(null)}
      />
    </AppShell>
  );
}
