import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import { api } from '../../api/client';
import { IconChevronLeft, IconFileText, IconPaperclip, IconSend, IconSpinner } from '../../components/icons';
import { formatFileSize } from '../../utils/formatFileSize';

interface Ticket {
  id: string;
  number: string;
  title: string;
  description: string;
  categoryEntity?: { id: string; name: string } | null;
  priority: string;
  status: string;
  createdAt: string;
}

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
  senderId: string;
  createdAt: string;
  sender?: { id: string; role: string; fullname: string | null };
  attachments?: Attachment[];
}

const STATUS_LABELS: Record<string, string> = {
  new: 'Yangi',
  in_progress: 'Jarayonda',
  waiting_user: 'Javobingiz kutilmoqda',
  resolved: 'Yechilgan',
  closed: 'Yopilgan',
};

const API_ORIGIN = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1').replace(
  /\/api\/v1\/?$/,
  '',
);

interface TicketDetailPageProps {
  ticketId: string;
  onBack: () => void;
}

export function TicketDetailPage({ ticketId, onBack }: TicketDetailPageProps) {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectComment, setRejectComment] = useState('');

  const load = () => {
    setIsLoading(true);
    Promise.all([
      api.get(`/tickets/${ticketId}`),
      api.get(`/tickets/${ticketId}/messages`),
    ])
      .then(([ticketRes, messagesRes]) => {
        setTicket(ticketRes.data.data);
        setMessages(messagesRes.data.data);
      })
      .catch(() => setError('Murojaatni yuklab bo\'lmadi.'))
      .finally(() => setIsLoading(false));
  };

  useEffect(load, [ticketId]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0] ?? null);
  };

  // Telegram Mini App WebView'da brauzer-download (blob/<a download>) ba'zi
  // klientlarda ishlamaydi yoki tashqi saytga chiqib ketadi — shuning uchun
  // fayl botning o'zi orqali foydalanuvchi Telegram chatiga yuboriladi.
  const handleDownload = async (attachment: Attachment) => {
    setError(null);
    setNotice(null);
    setDownloadingId(attachment.id);
    try {
      await api.post(`/tickets/${ticketId}/attachments/${attachment.id}/deliver`);
      setNotice(`"${attachment.fileName}" Telegram chatingizga yuborildi.`);
    } catch (err: any) {
      setError(err?.response?.data?.error?.message ?? 'Faylni yuborib bo\'lmadi.');
    } finally {
      setDownloadingId(null);
    }
  };

  const canConfirmResolution = ticket?.status === 'waiting_user' || ticket?.status === 'resolved';

  const handleResolve = async () => {
    setError(null);
    setNotice(null);
    setIsUpdatingStatus(true);
    try {
      const res = await api.patch(`/tickets/${ticketId}/user-status`, { action: 'resolve' });
      setTicket(res.data.data);
      setShowRejectForm(false);
    } catch (err: any) {
      setError(err?.response?.data?.error?.message ?? 'Xatolik yuz berdi.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleRejectSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!rejectComment.trim()) return;

    setError(null);
    setNotice(null);
    setIsUpdatingStatus(true);
    try {
      await api.post(`/tickets/${ticketId}/messages`, { text: rejectComment });
      const res = await api.patch(`/tickets/${ticketId}/user-status`, { action: 'reopen' });
      setTicket(res.data.data);
      setRejectComment('');
      setShowRejectForm(false);
      const messagesRes = await api.get(`/tickets/${ticketId}/messages`);
      setMessages(messagesRes.data.data);
    } catch (err: any) {
      setError(err?.response?.data?.error?.message ?? 'Xatolik yuz berdi.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim() && !file) return;

    setIsSending(true);
    setError(null);
    try {
      if (text.trim()) {
        await api.post(`/tickets/${ticketId}/messages`, { text });
      }
      if (file) {
        const formData = new FormData();
        formData.append('file', file);
        await api.post(`/tickets/${ticketId}/attachments`, formData);
      }
      setText('');
      setFile(null);
      const messagesRes = await api.get(`/tickets/${ticketId}/messages`);
      setMessages(messagesRes.data.data);
    } catch (err: any) {
      setError(err?.response?.data?.error?.message ?? 'Xatolik yuz berdi.');
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) {
    return (
      <div className="inline-loading">
        <IconSpinner width={18} height={18} />
        Yuklanmoqda...
      </div>
    );
  }
  if (error && !ticket) return <p className="form-error">{error}</p>;
  if (!ticket) return null;

  return (
    <div className="ticket-detail">
      <button type="button" className="back-button" onClick={onBack}>
        <IconChevronLeft width={16} height={16} />
        Orqaga
      </button>

      <div className="ticket-detail-header">
        <span className="ticket-number">#{ticket.number}</span>
        <h2>{ticket.title}</h2>
        <span className={`ticket-status ticket-status--${ticket.status}`}>
          {STATUS_LABELS[ticket.status] ?? ticket.status}
        </span>
      </div>
      <p className="ticket-detail-description">{ticket.description}</p>
      {notice && <p className="form-notice">{notice}</p>}

      {canConfirmResolution && (
        <div className="ticket-confirm-resolution">
          {!showRejectForm ? (
            <div className="ticket-confirm-resolution-actions">
              <button type="button" disabled={isUpdatingStatus} onClick={handleResolve}>
                Yechildi
              </button>
              <button
                type="button"
                className="ticket-confirm-resolution-reject"
                disabled={isUpdatingStatus}
                onClick={() => setShowRejectForm(true)}
              >
                Hal bo'lmadi
              </button>
            </div>
          ) : (
            <form className="ticket-confirm-resolution-form" onSubmit={handleRejectSubmit}>
              <textarea
                value={rejectComment}
                onChange={(e) => setRejectComment(e.target.value)}
                placeholder="Nima uchun hal bo'lmaganini yozing..."
                rows={3}
              />
              <div className="ticket-confirm-resolution-actions">
                <button type="submit" disabled={isUpdatingStatus || !rejectComment.trim()}>
                  Yuborish
                </button>
                <button
                  type="button"
                  className="ticket-confirm-resolution-reject"
                  disabled={isUpdatingStatus}
                  onClick={() => setShowRejectForm(false)}
                >
                  Bekor qilish
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      <div className="chat">
        {messages.map((m) => {
          const isAdmin = m.sender && m.sender.role !== 'user';
          return (
            <div key={m.id} className={`chat-message ${isAdmin ? 'chat-message--admin' : 'chat-message--user'}`}>
              <div className="chat-message-meta">
                {isAdmin ? 'Texnik mutaxassis' : 'Siz'} ·{' '}
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
                        disabled={downloadingId === a.id}
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
                            {downloadingId === a.id
                              ? 'Yuborilmoqda...'
                              : [size, date].filter(Boolean).join(' · ')}
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
        {messages.length === 0 && <p>Hozircha xabarlar yo'q.</p>}
      </div>

      <form className="chat-form" onSubmit={handleSend}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Xabar yozing..."
          rows={3}
        />
        <input type="file" onChange={handleFileChange} />
        {error && <p className="form-error">{error}</p>}
        <button type="submit" disabled={isSending}>
          <IconSend width={15} height={15} />
          {isSending ? 'Yuborilmoqda...' : 'Yuborish'}
        </button>
      </form>
    </div>
  );
}
