import { IsISO8601 } from 'class-validator';

/** Admin panelda "Yopilish vaqti" (resolutionMinutes) hisoblanadigan closedAt'ni qo'lda tuzatish uchun. */
export class UpdateTicketClosedAtDto {
  @IsISO8601()
  closedAt: string;
}
