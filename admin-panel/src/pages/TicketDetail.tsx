import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { AppShell } from '../components/AppShell';
import { IconChevronLeft, IconFileText, IconInbox, IconPaperclip, IconSend } from '../components/icons';
import { Avatar, EmptyState } from '../components/ui';
import { formatFileSize } from '../utils/formatFileSize';

interface Attachment {
  id: string;
  fileName: string;
  fileUrl: string;
  mimeType?: string;
  sizeBytes?: string | number;
  createdAt?: string;
  messageId?: string | null;
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
  categoryEntity?: { id: string; name: string } | null;
  priority: string;
  status: string;
  createdAt: string;
  closedAt: string | null;
  resolutionMinutes: number | null;
  organization?: { name: string } | null;
  createdBy?: { fullname: string | null; phoneNumber: string | null } | null;
  requesterName?: string | null;
  requesterPhone?: string | null;
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

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} daq.`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours} soat ${mins} daq.` : `${hours} soat`;
}

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
    const res = await api.patch(`/admin/tickets/${ticket.id}/assign`, {
      assignedToId: assignedToId || null,
    });
    setTicket(res.data.data);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0] ?? null);
  };

  const handleDownload = async (attachment: Attachment) => {
    try {
      const res = await api.get(
        `/admin/tickets/${id}/attachments/${attachment.id}/download`,
        { responseType: 'blob' },
      );
      const blobUrl = URL.createObjectURL(res.data);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = attachment.fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(blobUrl);
    } catch {
      setError('Faylni yuklab bo\'lmadi.');
    }
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

  if (isLoading) {
    return (
      <AppShell title="Yuklanmoqda…" breadcrumb="Dashboard / Murojaat">
        <div className="table-wrap" style={{ padding: 24 }}>
          <div className="skeleton skeleton-line" style={{ width: '40%', marginBottom: 12 }} />
          <div className="skeleton skeleton-line" style={{ width: '70%', marginBottom: 12 }} />
          <div className="skeleton skeleton-line" style={{ width: '55%' }} />
        </div>
      </AppShell>
    );
  }

  if (!ticket) {
    return (
      <AppShell title="Murojaat" breadcrumb="Dashboard / Murojaat">
        <EmptyState
          icon={<IconInbox width={24} height={24} />}
          title="Murojaat topilmadi"
          description="Bu murojaat o'chirilgan yoki mavjud emas bo'lishi mumkin."
        />
      </AppShell>
    );
  }

  return (
    <AppShell title={`#${ticket.number}`} breadcrumb="Dashboard / Murojaatlar">
      <div className="ticket-detail-page">
      <button className="btn btn-ghost btn-sm page-back-btn" onClick={() => navigate('/tickets')}>
        <IconChevronLeft width={15} height={15} />
        Murojaatlar
      </button>
      <div className="ticket-summary-card">
        <div className="ticket-summary-top">
          <div className="ticket-summary-heading">
            <span className="ticket-summary-number">#{ticket.number}</span>
            <h2 className="ticket-summary-title">{ticket.title}</h2>
          </div>
          <div className="ticket-summary-badges ticket-summary-controls">
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
          </div>
        </div>

        <div className="ticket-summary-meta">
          <div className="ticket-summary-meta-item">
            <span className="ticket-summary-meta-label">Tashkilot</span>
            <span className="ticket-summary-meta-value">{ticket.organization?.name ?? '—'}</span>
          </div>
          <div className="ticket-summary-meta-item">
            <span className="ticket-summary-meta-label">Foydalanuvchi</span>
            <span className="ticket-summary-meta-value">
              {ticket.requesterName ?? ticket.createdBy?.fullname ?? '—'}
              {(ticket.requesterPhone ?? ticket.createdBy?.phoneNumber) && (
                <span className="ticket-summary-meta-sub">
                  {' '}
                  · {ticket.requesterPhone ?? ticket.createdBy?.phoneNumber}
                </span>
              )}
            </span>
          </div>
          <div className="ticket-summary-meta-item">
            <span className="ticket-summary-meta-label">Kategoriya</span>
            <span className="ticket-summary-meta-value">{ticket.categoryEntity?.name ?? '—'}</span>
          </div>
          <div className="ticket-summary-meta-item">
            <span className="ticket-summary-meta-label">Yaratildi</span>
            <span className="ticket-summary-meta-value">
              {new Date(ticket.createdAt).toLocaleString('uz-UZ')}
            </span>
          </div>
          <div className="ticket-summary-meta-item">
            <span className="ticket-summary-meta-label">Yakunlangan vaqti</span>
            <span className="ticket-summary-meta-value">
              {ticket.closedAt ? new Date(ticket.closedAt).toLocaleString('uz-UZ') : '—'}
            </span>
          </div>
          <div className="ticket-summary-meta-item">
            <span className="ticket-summary-meta-label">Yopilish vaqti</span>
            <span className="ticket-summary-meta-value">
              {ticket.resolutionMinutes != null ? formatDuration(ticket.resolutionMinutes) : '—'}
            </span>
          </div>
        </div>

        <div className="ticket-summary-description">
          <span className="ticket-summary-meta-label">Tavsif</span>
          <p>{ticket.description}</p>
        </div>
      </div>

      {messages.length === 0 ? (
        <EmptyState
          icon={<IconInbox width={22} height={22} />}
          title="Hozircha xabarlar yo'q"
          description="Suhbat boshlanishi bilan xabarlar shu yerda ko'rinadi."
        />
      ) : (
        <div className="chat">
          {messages.map((m) => {
            const isAdmin = m.sender && m.sender.role !== 'user';
            return (
              <div
                key={m.id}
                className={`chat-message ${isAdmin ? 'chat-message--admin' : 'chat-message--user'}`}
              >
                <div className="chat-message-meta">
                  <Avatar name={m.sender?.fullname ?? (isAdmin ? 'Admin' : 'Foydalanuvchi')} size="sm" />{' '}
                  {m.sender?.fullname ?? (isAdmin ? 'Admin' : 'Foydalanuvchi')} ·{' '}
                  {new Date(m.createdAt).toLocaleString('uz-UZ')}
                </div>
                <div className="chat-message-text">{m.text}</div>
                {m.attachments && m.attachments.length > 0 && (
                  <div className="chat-message-attachments">
                    <div className="chat-message-attachments-title">
                      <span className="chat-message-attachments-icon">
                        <IconPaperclip width={13} height={13} />
                      </span>
                      Файлы и документы
                    </div>
                    {m.attachments.map((a) => {
                      const isImage = a.mimeType?.startsWith('image/');
                      const size = formatFileSize(a.sizeBytes);
                      const date = a.createdAt ? new Date(a.createdAt).toLocaleDateString('ru-RU') : '';
                      return (
                        <button
                          key={a.id}
                          type="button"
                          className="chat-message-attachment"
                          onClick={() => handleDownload(a)}
                        >
                          {isImage ? (
                            <img className="chat-message-attachment-thumb" src={`${API_ORIGIN}${a.fileUrl}`} alt={a.fileName} />
                          ) : (
                            <span className="chat-message-attachment-icon">
                              <IconFileText width={18} height={18} />
                            </span>
                          )}
                          <span className="chat-message-attachment-info">
                            <span className="chat-message-attachment-name">{a.fileName}</span>
                            <span className="chat-message-attachment-meta">
                              {[size, date].filter(Boolean).join(' · ')}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <form className="chat-form" onSubmit={handleSend}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Javob yozing..."
          rows={3}
        />
        <div className="chat-form-row">
          <label className="file-input">
            <IconPaperclip width={14} height={14} />
            {file ? file.name : 'Fayl biriktirish'}
            <input type="file" onChange={handleFileChange} style={{ display: 'none' }} />
          </label>
          <button className="btn btn-primary btn-sm" type="submit" disabled={isSending}>
            <IconSend width={14} height={14} />
            {isSending ? 'Yuborilmoqda...' : 'Yuborish'}
          </button>
        </div>
        {error && <p className="form-error">{error}</p>}
      </form>
      </div>
    </AppShell>
  );
}
