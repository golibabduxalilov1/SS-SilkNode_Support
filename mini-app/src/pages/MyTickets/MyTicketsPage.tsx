import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { IconSpinner } from '../../components/icons';

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
  waiting_user: 'Javobingiz kutilmoqda',
  resolved: 'Yechilgan',
  closed: 'Yopilgan',
};

interface MyTicketsPageProps {
  refreshKey: number;
  onOpenTicket: (ticketId: string) => void;
}

export function MyTicketsPage({ refreshKey, onOpenTicket }: MyTicketsPageProps) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    api
      .get('/tickets')
      .then((res) => setTickets(res.data.data))
      .finally(() => setIsLoading(false));
  }, [refreshKey]);

  if (isLoading) {
    return (
      <div className="inline-loading">
        <IconSpinner width={18} height={18} />
        Yuklanmoqda...
      </div>
    );
  }
  if (tickets.length === 0) return <p>Hozircha murojaatlar yo'q.</p>;

  return (
    <ul className="ticket-list">
      {tickets.map((t) => (
        <li key={t.id} className="ticket-list-item" onClick={() => onOpenTicket(t.id)}>
          <div className="ticket-list-item-main">
            <span className="ticket-number">#{t.number}</span>
            <span className="ticket-title">{t.title}</span>
            <span className="ticket-date">{new Date(t.createdAt).toLocaleString('uz-UZ')}</span>
          </div>
          <span className={`ticket-status ticket-status--${t.status}`}>
            {STATUS_LABELS[t.status] ?? t.status}
          </span>
        </li>
      ))}
    </ul>
  );
}
