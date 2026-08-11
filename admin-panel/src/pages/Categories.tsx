import { FormEvent, useEffect, useState } from 'react';
import { api } from '../api/client';
import { AppShell } from '../components/AppShell';
import { IconEdit, IconLayers, IconPlus, IconPower, IconTrash } from '../components/icons';
import { EmptyState, TableSkeleton } from '../components/ui';

interface Category {
  id: string;
  name: string;
  isActive: boolean;
}

export function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setIsLoading(true);
    api
      .get('/admin/categories')
      .then((res) => setCategories(res.data.data))
      .finally(() => setIsLoading(false));
  };

  useEffect(load, []);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    setIsCreating(true);
    setError(null);
    try {
      await api.post('/admin/categories', { name: newName.trim() });
      setNewName('');
      load();
    } catch {
      setError('Kategoriya yaratib bo\'lmadi.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleRename = async (category: Category) => {
    const name = window.prompt('Kategoriya nomi:', category.name);
    if (!name || name === category.name) return;
    await api.patch(`/admin/categories/${category.id}`, { name });
    load();
  };

  const handleToggleActive = async (category: Category) => {
    await api.patch(`/admin/categories/${category.id}`, { isActive: !category.isActive });
    load();
  };

  const handleDelete = async (category: Category) => {
    if (!window.confirm(`"${category.name}" kategoriyasini o'chirmoqchimisiz? Bu amalni ortga qaytarib bo'lmaydi.`)) return;
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
      <form className="inline-form" onSubmit={handleCreate}>
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Yangi kategoriya nomi"
        />
        <button className="btn btn-primary" type="submit" disabled={isCreating}>
          <IconPlus width={15} height={15} />
          {isCreating ? 'Qo\'shilmoqda...' : "Qo'shish"}
        </button>
      </form>
      {error && <p className="form-error">{error}</p>}

      {isLoading ? (
        <TableSkeleton rows={4} cols={3} />
      ) : categories.length === 0 ? (
        <EmptyState
          icon={<IconLayers width={24} height={24} />}
          title="Hozircha kategoriyalar yo'q"
          description="Yuqoridagi forma orqali birinchi kategoriyani qo'shing."
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
                    <button onClick={() => handleRename(c)}>
                      <IconEdit width={13} height={13} />
                      Tahrirlash
                    </button>
                    <button onClick={() => handleToggleActive(c)}>
                      <IconPower width={13} height={13} />
                      {c.isActive ? 'Nofaollashtirish' : 'Faollashtirish'}
                    </button>
                    <button className="danger" onClick={() => handleDelete(c)}>
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
    </AppShell>
  );
}
