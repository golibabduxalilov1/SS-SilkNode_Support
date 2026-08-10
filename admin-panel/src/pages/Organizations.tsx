import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';

interface Organization {
  id: string;
  name: string;
  isActive: boolean;
}

export function OrganizationsPage() {
  const navigate = useNavigate();
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

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <button className="back-link" onClick={() => navigate('/dashboard')}>
            ← Dashboard
          </button>
          <h1>Tashkilotlar</h1>
        </div>
      </header>

      <form className="inline-form" onSubmit={handleCreate}>
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Yangi tashkilot nomi"
        />
        <button type="submit" disabled={isCreating}>
          {isCreating ? 'Qo\'shilmoqda...' : "Qo'shish"}
        </button>
      </form>
      {error && <p className="form-error">{error}</p>}

      {isLoading ? (
        <p>Yuklanmoqda...</p>
      ) : organizations.length === 0 ? (
        <p>Hozircha tashkilotlar yo'q.</p>
      ) : (
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
                <td>{o.name}</td>
                <td>
                  <span className={`status status--${o.isActive ? 'active' : 'inactive'}`}>
                    {o.isActive ? 'Faol' : "Nofaol"}
                  </span>
                </td>
                <td className="table-actions">
                  <button onClick={() => handleRename(o)}>Tahrirlash</button>
                  <button onClick={() => handleToggleActive(o)}>
                    {o.isActive ? "O'chirish" : 'Yoqish'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
