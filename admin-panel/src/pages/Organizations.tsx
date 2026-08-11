import { FormEvent, useEffect, useState } from 'react';
import { api } from '../api/client';
import { AppShell } from '../components/AppShell';
import { IconBuilding, IconEdit, IconPlus, IconPower, IconTrash } from '../components/icons';
import { EmptyState, TableSkeleton } from '../components/ui';

interface Organization {
  id: string;
  name: string;
  isActive: boolean;
}

export function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setIsLoading(true);
    api
      .get('/admin/organizations')
      .then((res) => setOrganizations(res.data.data))
      .finally(() => setIsLoading(false));
  };

  useEffect(load, []);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    setIsCreating(true);
    setError(null);
    try {
      await api.post('/admin/organizations', { name: newName.trim() });
      setNewName('');
      load();
    } catch {
      setError('Tashkilot yaratib bo\'lmadi.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleRename = async (org: Organization) => {
    const name = window.prompt("Tashkilot nomi:", org.name);
    if (!name || name === org.name) return;
    await api.patch(`/admin/organizations/${org.id}`, { name });
    load();
  };

  const handleToggleActive = async (org: Organization) => {
    await api.patch(`/admin/organizations/${org.id}`, { isActive: !org.isActive });
    load();
  };

  const handleDelete = async (org: Organization) => {
    if (!window.confirm(`"${org.name}" tashkilotini o'chirmoqchimisiz? Bu amalni ortga qaytarib bo'lmaydi.`)) return;
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
      <form className="inline-form" onSubmit={handleCreate}>
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Yangi tashkilot nomi"
        />
        <button className="btn btn-primary" type="submit" disabled={isCreating}>
          <IconPlus width={15} height={15} />
          {isCreating ? 'Qo\'shilmoqda...' : "Qo'shish"}
        </button>
      </form>
      {error && <p className="form-error">{error}</p>}

      {isLoading ? (
        <TableSkeleton rows={4} cols={3} />
      ) : organizations.length === 0 ? (
        <EmptyState
          icon={<IconBuilding width={24} height={24} />}
          title="Hozircha tashkilotlar yo'q"
          description="Yuqoridagi forma orqali birinchi tashkilotni qo'shing."
        />
      ) : (
        <div className="table-wrap">
          <table className="tickets-table">
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
                    <button onClick={() => handleRename(o)}>
                      <IconEdit width={13} height={13} />
                      Tahrirlash
                    </button>
                    <button onClick={() => handleToggleActive(o)}>
                      <IconPower width={13} height={13} />
                      {o.isActive ? 'Nofaollashtirish' : 'Faollashtirish'}
                    </button>
                    <button className="danger" onClick={() => handleDelete(o)}>
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
