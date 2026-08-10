import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';

interface Ticket {
  id: string;
  number: string;
  title: string;
  category: string;
  priority: string;
  status: string;
  createdAt: string;
  organization?: { name: string } | null;
  createdBy?: { fullname: string | null; phoneNumber: string | null } | null;
}

const STATUS_LABELS: Record<string, string> = {
  new: 'Yangi',
  in_progress: 'Jarayonda',
  resolved: 'Yechilgan',
  closed: 'Yopilgan',
};

/** Asosiy TZ bo'lim 6 dagi Dashboard funksiyasi — faqat Web Admin Panel'da (bo'lim 5.3). */
export function DashboardPage() {
  const { user, logout } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api
      .get('/admin/tickets')
      .then((res) => setTickets(res.data.data))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1>Dashboard</h1>
          <p className="subtitle">
            {user?.fullname ?? 'Admin'} — {user?.role}
          </p>
        </div>
        <button onClick={logout}>Chiqish</button>
      </header>

      {isLoading ? (
        <p>Yuklanmoqda...</p>
      ) : tickets.length === 0 ? (
        <p>Hozircha murojaatlar yo'q.</p>
      ) : (
        <table className="tickets-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Mavzu</th>
              <th>Tashkilot</th>
              <th>Kategoriya</th>
              <th>Muhimlik</th>
              <th>Holat</th>
              <th>Yaratildi</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((t) => (
              <tr key={t.id}>
                <td>{t.number}</td>
                <td>{t.title}</td>
                <td>{t.organization?.name ?? '—'}</td>
                <td>{t.category}</td>
                <td>{t.priority}</td>
                <td>
                  <span className={`status status--${t.status}`}>
                    {STATUS_LABELS[t.status] ?? t.status}
                  </span>
                </td>
                <td>{new Date(t.createdAt).toLocaleString('uz-UZ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
