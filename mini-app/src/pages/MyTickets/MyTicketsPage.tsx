import { useEffect, useState } from 'react';
import { api } from '../../api/client';

interface Ticket {
  id: string;
  number: string;
  title: string;
  status: string;
  priority: string;
  createdAt: string;
}

const STATUS_LABELS: Record<string, string> = {
  new: 'Yangi',
  in_progress: 'Jarayonda',
  resolved: 'Yechilgan',
  closed: 'Yopilgan',
};

export function MyTicketsPage({ refreshKey }: { refreshKey: number }) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    api
      .get('/tickets')
      .then((res) => setTickets(res.data.data))
      .finally(() => setIsLoading(false));
  }, [refreshKey]);

  if (isLoading) return <p>Yuklanmoqda...</p>;
  if (tickets.length === 0) return <p>Hozircha murojaatlar yo'q.</p>;

  return (
    <ul className="ticket-list">
      {tickets.map((t) => (
        <li key={t.id} className="ticket-list-item">
          <span className="ticket-number">#{t.number}</span>
          <span className="ticket-title">{t.title}</span>
          <span className={`ticket-status ticket-status--${t.status}`}>
            {STATUS_LABELS[t.status] ?? t.status}
          </span>
        </li>
      ))}
    </ul>
  );
}
