import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * tickets.service.ts'dagi diffMinutes() ish vaqti (Dushanba-Shanba, 10:00-18:00) hisobiga
 * o'tkazildi (28b0c19). O'zgarish faqat kod darajasida bo'lgani uchun avvalgi migratsiya
 * (AddTicketProcessingResolution) orqali kalendar-vaqt formulasi bilan backfill qilingan eski
 * yopiq tiketlar bazadagi qiymati o'zgarmagan holda qolgan edi — bu esa ro'yxat/detail
 * sahifasidagi "Yopilish vaqti" (saqlangan ustun) bilan Dashboard'dagi "Qayta ishlash vaqti"
 * (har so'rovda diffMinutes() bilan jonli hisoblanadigan) o'rtasida nomuvofiqlikka olib
 * kelgan edi. Bu migratsiya barcha yopilgan/yechilgan tiketlar uchun resolution_minutes va
 * processing_resolution_minutes'ni xuddi shu ish-vaqti formulasi bilan qayta hisoblab, ikkala
 * joyni ham bir xil qiymatga tenglashtiradi.
 */

const MIN_RESOLUTION_MINUTES = 5;
const WORK_START_HOUR = 10;
const WORK_END_HOUR = 18;
const WORKING_WEEKDAYS = new Set([1, 2, 3, 4, 5, 6]); // 0 = yakshanba (dam olish kuni)

function isWorkingDay(date: Date): boolean {
  return WORKING_WEEKDAYS.has(date.getDay());
}

// tickets.service.ts'dagi diffMinutes() bilan bir xil (ish kunlari + 10:00-18:00 oynasi).
function diffMinutes(from: Date, to: Date): number {
  if (to.getTime() <= from.getTime()) return MIN_RESOLUTION_MINUTES;

  let totalMs = 0;
  const cursor = new Date(from);
  cursor.setHours(0, 0, 0, 0);
  const lastDay = new Date(to);
  lastDay.setHours(0, 0, 0, 0);

  while (cursor.getTime() <= lastDay.getTime()) {
    if (isWorkingDay(cursor)) {
      const windowStart = new Date(cursor);
      windowStart.setHours(WORK_START_HOUR, 0, 0, 0);
      const windowEnd = new Date(cursor);
      windowEnd.setHours(WORK_END_HOUR, 0, 0, 0);

      const segmentStart = Math.max(windowStart.getTime(), from.getTime());
      const segmentEnd = Math.min(windowEnd.getTime(), to.getTime());
      if (segmentEnd > segmentStart) {
        totalMs += segmentEnd - segmentStart;
      }
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  const minutes = Math.round(totalMs / 60000);
  return Math.max(minutes, MIN_RESOLUTION_MINUTES);
}

interface TicketRow {
  id: string;
  created_at: Date;
  closed_at: Date;
  processing_started_at: Date | null;
  resolution_minutes: number | null;
  processing_resolution_minutes: number | null;
}

export class RecalculateResolutionWorkHours1756000000000 implements MigrationInterface {
  name = 'RecalculateResolutionWorkHours1756000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const rows: TicketRow[] = await queryRunner.query(`
      SELECT id, created_at, closed_at, processing_started_at, resolution_minutes, processing_resolution_minutes
      FROM "tickets"
      WHERE "closed_at" IS NOT NULL
    `);

    for (const row of rows) {
      const createdAt = new Date(row.created_at);
      const closedAt = new Date(row.closed_at);
      const processingStartedAt = row.processing_started_at ? new Date(row.processing_started_at) : createdAt;

      const resolutionMinutes = diffMinutes(createdAt, closedAt);
      const processingResolutionMinutes = diffMinutes(processingStartedAt, closedAt);

      if (
        resolutionMinutes === row.resolution_minutes &&
        processingResolutionMinutes === row.processing_resolution_minutes
      ) {
        continue;
      }

      await queryRunner.query(
        `UPDATE "tickets" SET "resolution_minutes" = $1, "processing_resolution_minutes" = $2 WHERE "id" = $3`,
        [resolutionMinutes, processingResolutionMinutes, row.id],
      );
    }
  }

  public async down(): Promise<void> {
    // Asl (eski formuladagi) qiymatlar saqlanmagani uchun qaytarib bo'lmaydi.
  }
}
