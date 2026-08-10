import { FormEvent, useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { AppShell } from '../components/AppShell';
import { IconEdit, IconPlus, IconPower, IconUsers } from '../components/icons';
import { EmptyState, TableSkeleton } from '../components/ui';

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
}

const emptyForm = {
  fullname: '',
  adminLogin: '',
  password: '',
  role: 'admin' as 'admin' | 'superadmin',
  organizationId: '',
};

export function EmployeesPage() {
  const { user } = useAuth();
  const isSuperadmin = user?.role === 'superadmin';

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingId && (!form.fullname.trim() || !form.adminLogin.trim() || form.password.length < 6)) {
      setError("Barcha maydonlarni to'ldiring, parol kamida 6 belgi bo'lishi kerak.");
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        fullname: form.fullname.trim(),
        role: form.role,
        organizationId: form.organizationId || null,
      };
      if (form.password) payload.password = form.password;

      if (editingId) {
        await api.patch(`/admin/users/${editingId}`, payload);
      } else {
        await api.post('/admin/users', { ...payload, adminLogin: form.adminLogin.trim() });
      }
      resetForm();
      load();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message ?? "Saqlab bo'lmadi.";
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (employee: Employee) => {
    setEditingId(employee.id);
    setForm({
      fullname: employee.fullname ?? '',
      adminLogin: employee.adminLogin ?? '',
      password: '',
      role: employee.role,
      organizationId: employee.organization?.id ?? '',
    });
  };

  const handleToggleActive = async (employee: Employee) => {
    await api.patch(`/admin/users/${employee.id}`, { isActive: !employee.isActive });
    load();
  };

  if (!isSuperadmin) {
    return (
      <AppShell title="Xodimlar" breadcrumb="Dashboard / Xodimlar">
        <EmptyState
          icon={<IconUsers width={24} height={24} />}
          title="Ruxsat yo'q"
          description="Bu sahifa faqat superadmin uchun mavjud."
        />
      </AppShell>
    );
  }

  return (
    <AppShell title="Xodimlar" breadcrumb="Dashboard / Xodimlar">
      <form className="inline-form inline-form--wrap" onSubmit={handleSubmit}>
        <input
          value={form.fullname}
          onChange={(e) => setForm({ ...form, fullname: e.target.value })}
          placeholder="F.I.Sh"
        />
        <input
          value={form.adminLogin}
          onChange={(e) => setForm({ ...form, adminLogin: e.target.value })}
          placeholder="Login"
          disabled={!!editingId}
        />
        <input
          type="password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          placeholder={editingId ? 'Yangi parol (ixtiyoriy)' : 'Parol'}
        />
        <select
          value={form.role}
          onChange={(e) => setForm({ ...form, role: e.target.value as 'admin' | 'superadmin' })}
        >
          <option value="admin">Admin</option>
          <option value="superadmin">Superadmin</option>
        </select>
        <select
          value={form.organizationId}
          onChange={(e) => setForm({ ...form, organizationId: e.target.value })}
        >
          <option value="">Tashkilotsiz</option>
          {organizations.map((org) => (
            <option key={org.id} value={org.id}>
              {org.name}
            </option>
          ))}
        </select>
        <button className="btn btn-primary" type="submit" disabled={isSaving}>
          <IconPlus width={15} height={15} />
          {isSaving ? 'Saqlanmoqda...' : editingId ? 'Saqlash' : "Qo'shish"}
        </button>
        {editingId && (
          <button className="btn btn-secondary" type="button" onClick={resetForm}>
            Bekor qilish
          </button>
        )}
      </form>
      {error && <p className="form-error">{error}</p>}

      {isLoading ? (
        <TableSkeleton rows={4} cols={5} />
      ) : employees.length === 0 ? (
        <EmptyState
          icon={<IconUsers width={24} height={24} />}
          title="Hozircha xodimlar yo'q"
          description="Yuqoridagi forma orqali birinchi xodimni qo'shing."
        />
      ) : (
        <div className="table-wrap">
          <table className="tickets-table">
            <thead>
              <tr>
                <th>F.I.Sh</th>
                <th>Login</th>
                <th>Rol</th>
                <th>Tashkilot</th>
                <th>Holati</th>
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
                  <td>{emp.role === 'superadmin' ? 'Superadmin' : 'Admin'}</td>
                  <td>{emp.organization?.name ?? '—'}</td>
                  <td>
                    <span className={`status status--${emp.isActive ? 'active' : 'inactive'}`}>
                      {emp.isActive ? 'Faol' : 'Nofaol'}
                    </span>
                  </td>
                  <td className="table-actions">
                    <button onClick={() => handleEdit(emp)}>
                      <IconEdit width={13} height={13} />
                      Tahrirlash
                    </button>
                    <button onClick={() => handleToggleActive(emp)}>
                      <IconPower width={13} height={13} />
                      {emp.isActive ? "O'chirish" : 'Yoqish'}
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
