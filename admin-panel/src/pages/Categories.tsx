import { FormEvent, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../api/client';
import { AppShell } from '../components/AppShell';
import { ConfirmModal } from '../components/ConfirmModal';
import { IconClose, IconEdit, IconLayers, IconPlus, IconPower, IconTrash } from '../components/icons';
import { EmptyState, TableSkeleton } from '../components/ui';
import { TranslationKey, useLanguage } from '../i18n/LanguageContext';

type Cluster = 'yonalish' | 'mahsulot';

export const CLUSTER_ORDER: Cluster[] = ['yonalish', 'mahsulot'];

function getClusterLabels(t: (key: TranslationKey) => string): Record<Cluster, string> {
  return {
    yonalish: t('categories.clusterDirection'),
    mahsulot: t('categories.clusterProduct'),
  };
}

interface Category {
  id: string;
  name: string;
  isActive: boolean;
  description: string | null;
  colorTag: string | null;
  cluster: Cluster;
}

export interface CategoryFormValues {
  name: string;
  description: string;
  colorTag: string;
  cluster: Cluster;
}

type ModalMode = 'create' | 'edit';

function CategoryModal({
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
  initial: CategoryFormValues;
  onClose: () => void;
  onSubmit: (values: CategoryFormValues) => void;
  isSaving: boolean;
  error: string | null;
}) {
  const { t } = useLanguage();
  const CLUSTER_LABELS = getClusterLabels(t);
  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description);
  const [colorTag, setColorTag] = useState(initial.colorTag);
  const [cluster, setCluster] = useState<Cluster>(initial.cluster);

  useEffect(() => {
    if (isOpen) {
      setName(initial.name);
      setDescription(initial.description);
      setColorTag(initial.colorTag);
      setCluster(initial.cluster);
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
    onSubmit({ name: trimmed, description: description.trim(), colorTag, cluster });
  };

  return createPortal(
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-card">
        <div className="modal-header">
          <span className="modal-header-icon">
            <IconLayers width={18} height={18} />
          </span>
          <h3>{mode === 'create' ? t('categories.createTitle') : t('categories.editTitle')}</h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label={t('common.close')}>
            <IconClose width={18} height={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <p className="form-error">{error}</p>}
            <label className="modal-field">
              <span>{t('categories.name')}</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('categories.namePlaceholder')}
                required
                autoFocus
              />
            </label>
            <label className="modal-field">
              <span>{t('categories.cluster')}</span>
              <select value={cluster} onChange={(e) => setCluster(e.target.value as Cluster)}>
                {CLUSTER_ORDER.map((c) => (
                  <option key={c} value={c}>
                    {CLUSTER_LABELS[c]}
                  </option>
                ))}
              </select>
            </label>
            <label className="modal-field">
              <span>{t('categories.description')}</span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('categories.descriptionPlaceholder')}
                rows={3}
              />
            </label>
            <label className="modal-field modal-field--color">
              <span>{t('categories.colorTag')}</span>
              <div className="color-tag-input">
                <input
                  type="color"
                  value={colorTag || '#8a6a1f'}
                  onChange={(e) => setColorTag(e.target.value)}
                />
                {colorTag && (
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setColorTag('')}>
                    {t('categories.clear')}
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

export function CategoriesPage() {
  const { t } = useLanguage();
  const CLUSTER_LABELS = getClusterLabels(t);
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

  const handleModalSubmit = async (values: CategoryFormValues) => {
    setIsSaving(true);
    setModalError(null);
    const payload = {
      name: values.name,
      description: values.description || null,
      colorTag: values.colorTag || null,
      cluster: values.cluster,
    };
    try {
      if (modalMode === 'create') {
        await api.post('/admin/categories', payload);
      } else if (editingCategory) {
        await api.patch(`/admin/categories/${editingCategory.id}`, payload);
      }
      setModalOpen(false);
      load();
    } catch {
      setModalError(modalMode === 'create' ? t('categories.createError') : t('categories.editError'));
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
      setCategories((prev) => prev.filter((c) => c.id !== category.id));
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message ?? t('categories.deleteError');
      setError(message);
    }
  };

  function CategoryRow({ category: c }: { category: Category }) {
    return (
      <tr>
        <td>
          <div className="cell-user">
            <span className="avatar avatar--sm">
              <IconLayers width={12} height={12} />
            </span>
            {c.colorTag && <span className="color-tag-dot" style={{ background: c.colorTag }} title={c.colorTag} />}
            <div className="cell-user-info">
              <span className="cell-primary">{c.name}</span>
              {c.description && <span className="cell-description">{c.description}</span>}
            </div>
          </div>
        </td>
        <td>
          <span className={`status status--${c.isActive ? 'active' : 'inactive'}`}>
            {c.isActive ? t('categories.active') : t('categories.inactive')}
          </span>
        </td>
        <td className="table-actions">
          <button onClick={() => openEditModal(c)}>
            <IconEdit width={13} height={13} />
            {t('categories.edit')}
          </button>
          <button onClick={() => handleToggleActive(c)}>
            <IconPower width={13} height={13} />
            {c.isActive ? t('categories.deactivate') : t('categories.activate')}
          </button>
          <button className="danger" onClick={() => setCategoryToDelete(c)}>
            <IconTrash width={13} height={13} />
            {t('categories.delete')}
          </button>
        </td>
      </tr>
    );
  }

  return (
    <AppShell title={t('categories.title')} breadcrumb={t('categories.breadcrumb')}>
      <div className="toolbar">
        <button className="btn btn-primary" type="button" onClick={openCreateModal}>
          <IconPlus width={15} height={15} />
          {t('categories.add')}
        </button>
      </div>
      {error && <p className="form-error">{error}</p>}

      {isLoading ? (
        <TableSkeleton rows={4} cols={3} />
      ) : categories.length === 0 ? (
        <EmptyState
          icon={<IconLayers width={24} height={24} />}
          title={t('categories.empty')}
          description={t('categories.emptyDescription')}
        />
      ) : (
        CLUSTER_ORDER.map((cluster) => {
          const items = categories.filter((c) => c.cluster === cluster);
          if (items.length === 0) return null;
          return (
            <div key={cluster} className="category-cluster-group">
              <h3 className="category-cluster-title">{CLUSTER_LABELS[cluster]}</h3>
              <div className="table-wrap">
                <table className="tickets-table tickets-table--equal categories-table">
                  <thead>
                    <tr>
                      <th>{t('categories.colName')}</th>
                      <th>{t('categories.colStatus')}</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((c) => (
                      <CategoryRow key={c.id} category={c} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })
      )}

      <CategoryModal
        isOpen={modalOpen}
        mode={modalMode}
        initial={
          modalMode === 'edit' && editingCategory
            ? {
                name: editingCategory.name,
                description: editingCategory.description ?? '',
                colorTag: editingCategory.colorTag ?? '',
                cluster: editingCategory.cluster,
              }
            : { name: '', description: '', colorTag: '', cluster: 'mahsulot' }
        }
        onClose={closeModal}
        onSubmit={handleModalSubmit}
        isSaving={isSaving}
        error={modalError}
      />

      <ConfirmModal
        isOpen={!!categoryToDelete}
        title={t('categories.deleteTitle')}
        message={
          categoryToDelete
            ? t('categories.deleteConfirmTemplate').replace('{name}', categoryToDelete.name)
            : ''
        }
        onConfirm={handleDelete}
        onCancel={() => setCategoryToDelete(null)}
      />
    </AppShell>
  );
}
