import { IsIn } from 'class-validator';

export type TicketUserStatusAction = 'resolve' | 'reopen';

/**
 * Foydalanuvchi tomonidan cheklangan status o'tishi — admin PATCH
 * /admin/tickets/:id/status'dan farqli, foydalanuvchi ixtiyoriy statusga
 * o'ta olmaydi, faqat 'resolve' ("Yechildi") yoki 'reopen' ("Hal bo'lmadi").
 */
export class UpdateTicketUserStatusDto {
  @IsIn(['resolve', 'reopen'])
  action: TicketUserStatusAction;
}
