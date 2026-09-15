/**
 * TZ "Ticket list: sorting and row highlighting" band 3 — qator holatlari.
 * Tekshiruv yuqoridan pastga, birinchi mos kelgan holat qo'llanadi.
 * Loyihada TZ'dagi 4 statusdan farqli 5 tasi bor — "resolved" TZ'da yo'q, lekin
 * closed emas va hali kuzatilayotgani uchun "in_progress" guruhiga (amber) qo'shilgan.
 */
export type TicketRowState = 'overdue' | 'new' | 'in-progress' | 'closed';

export function isTicketOverdue(
  status: string,
  slaDueAt: string | null | undefined,
  nowMs: number,
): boolean {
  if (status === 'closed' || !slaDueAt) return false;
  return new Date(slaDueAt).getTime() < nowMs;
}

export function getTicketRowState(
  status: string,
  slaDueAt: string | null | undefined,
  nowMs: number,
): TicketRowState {
  if (isTicketOverdue(status, slaDueAt, nowMs)) return 'overdue';
  if (status === 'new') return 'new';
  if (status === 'closed') return 'closed';
  return 'in-progress'; // in_progress, waiting_user, resolved
}

/** TZ band 3 modifikator — hali ochilmagan (opened_at yo'q) va yopilmagan murojaat. */
export function isTicketUnopened(openedAt: string | null | undefined, status: string): boolean {
  return !openedAt && status !== 'closed';
}
