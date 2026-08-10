import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';

interface Attachment {
  id: string;
  fileName: string;
  fileUrl: string;
}

interface Message {
  id: string;
  text: string;
  createdAt: string;
  sender?: { id: string; fullname: string | null; role: string };
  attachments?: Attachment[];
}

interface AdminUser {
  id: string;
  fullname: string | null;
  role: string;
}

interface Ticket {
  id: string;
  number: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  createdAt: string;
  firstResponseMinutes: number | null;
  resolutionMinutes: number | null;
  organization?: { name: string } | null;
  createdBy?: { fullname: string | null; phoneNumber: string | null } | null;
  assignedTo?: { id: string; fullname: string | null } | null;
}

const STATUS_OPTIONS = [
  { value: 'new', label: 'Yangi' },
  { value: 'in_progress', label: 'Jarayonda' },
  { value: 'waiting_user', label: 'Foydalanuvchi javobi kutilmoqda' },
  { value: 'resolved', label: 'Yechilgan' },
  { value: 'closed', label: 'Yopilgan' },
];

const API_ORIGIN = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1').replace(
  /\/api\/v1\/?$/,
  '',
);

export function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setIsLoading(true);
    Promise.all([
      api.get(`/admin/tickets/${id}`),
      api.get(`/admin/tickets/${id}/messages`),
      api.get('/admin/users'),
    ])
      .then(([ticketRes, messagesRes, adminsRes]) => {
        setTicket(ticketRes.data.data);
        setMessages(messagesRes.data.data);
        setAdmins(adminsRes.data.data);
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(load, [id]);

  const handleStatusChange = async (status: string) => {
    if (!ticket) return;
    const res = await api.patch(`/admin/tickets/${ticket.id}/status`, { status });
    setTicket(res.data.data);
  };

  const handleAssign = async (assignedToId: string) => {
    if (!ticket) return;
    const res = await api.patch(`/admin/tickets/${ticket.id}/assign`, { assignedToId });
    setTicket(res.data.data);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0] ?? null);
  };

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim() && !file) return;

    setIsSending(true);
    setError(null);
    try {
      if (text.trim()) {
        await api.post(`/admin/tickets/${id}/messages`, { text });
      }
      if (file) {
        const formData = new FormData();
        formData.append('file', file);
        await api.post(`/admin/tickets/${id}/attachments`, formData);
      }
      setText('');
      setFile(null);
      const messagesRes = await api.get(`/admin/tickets/${id}/messages`);
      setMessages(messagesRes.data.data);
    } catch (err: any) {
      setError(err?.response?.data?.error?.message ?? 'Xatolik yuz berdi.');
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) return <p className="dashboard">Yuklanmoqda...</p>;
  if (!ticket) return <p className="dashboard">Murojaat topilmadi.</p>;

  return (
    <div className="dashboard ticket-detail-page">
      <header className="dashboard-header">
        <div>
          <button className="back-link" onClick={() => navigate('/dashboard')}>
            ← Dashboard
          </button>
          <h1>
            #{ticket.number} — {ticket.title}
          </h1>
          <p className="subtitle">
            {ticket.organization?.name ?? '—'} · {ticket.createdBy?.fullname ?? '—'} ·{' '}
            {ticket.createdBy?.phoneNumber ?? '—'}
          </p>
        </div>
      </header>

      <div className="ticket-detail-controls">
        <label>
          Holat
          <select value={ticket.status} onChange={(e) => handleStatusChange(e.target.value)}>
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          Ijrochi
          <select
            value={ticket.assignedTo?.id ?? ''}
            onChange={(e) => handleAssign(e.target.value)}
          >
            <option value="">Tayinlanmagan</option>
            {admins.map((a) => (
              <option key={a.id} value={a.id}>
                {a.fullname ?? a.id} ({a.role})
              </option>
            ))}
          </select>
        </label>

        <div className="ticket-detail-time">
          <span>Birinchi javob: {ticket.firstResponseMinutes ?? '—'} daq.</span>
          <span>Yopilish: {ticket.resolutionMinutes ?? '—'} daq.</span>
        </div>
      </div>

      <p className="ticket-detail-description">{ticket.description}</p>

      <div className="chat">
        {messages.map((m) => {
          const isAdmin = m.sender && m.sender.role !== 'user';
          return (
            <div
              key={m.id}
              className={`chat-message ${isAdmin ? 'chat-message--admin' : 'chat-message--user'}`}
            >
              <div className="chat-message-meta">
                {m.sender?.fullname ?? (isAdmin ? 'Admin' : 'Foydalanuvchi')} ·{' '}
                {new Date(m.createdAt).toLocaleString('uz-UZ')}
              </div>
              <div className="chat-message-text">{m.text}</div>
              {m.attachments && m.attachments.length > 0 && (
                <div className="chat-message-attachments">
                  {m.attachments.map((a) => (
                    <a key={a.id} href={`${API_ORIGIN}${a.fileUrl}`} target="_blank" rel="noreferrer">
                      📎 {a.fileName}
                    </a>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {messages.length === 0 && <p>Hozircha xabarlar yo'q.</p>}
      </div>

      <form className="chat-form" onSubmit={handleSend}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Javob yozing..."
          rows={3}
        />
        <input type="file" onChange={handleFileChange} />
        {error && <p className="form-error">{error}</p>}
        <button type="submit" disabled={isSending}>
          {isSending ? 'Yuborilmoqda...' : 'Yuborish'}
        </button>
      </form>
    </div>
  );
}
