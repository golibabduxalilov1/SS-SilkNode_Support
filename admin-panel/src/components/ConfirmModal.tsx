import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { IconAlert, IconClose } from './icons';

export function ConfirmModal({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
}: {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return createPortal(
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="modal-card">
        <div className="modal-header">
          <span className="modal-header-icon" style={{ background: 'var(--danger-soft)', color: 'var(--danger-soft-text)' }}>
            <IconAlert width={18} height={18} />
          </span>
          <h3>{title}</h3>
          <button type="button" className="modal-close" onClick={onCancel} aria-label="Yopish">
            <IconClose width={18} height={18} />
          </button>
        </div>
        <div className="modal-body">
          <p>{message}</p>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-danger" onClick={onConfirm}>
            O'chirish
          </button>
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Bekor qilish
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
