import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * AuditAction.TICKET_CLOSED_AT_CHANGED ('ticket_closed_at_changed') TypeScript enum'iga
 * qo'shilgan edi (tickets.service.ts -> updateClosedAt), lekin CreateAuditLogs1755700000000
 * migratsiyasida yaratilgan Postgres "audit_logs_action_enum" turiga hech qachon
 * qo'shilmagan edi. Natijada "Yopilish vaqti"ni qo'lda tahrirlashda audit yozuvi
 * "invalid input value for enum audit_logs_action_enum" xatosi bilan yozilmay qolardi
 * (AuditLogService.log() bu xatoni ushlab, faqat log qiladi — foydalanuvchiga 500
 * qaytmaydi, lekin audit tarixida bo'shliq qoladi).
 */
export class AddTicketClosedAtChangedAuditAction1756100000000 implements MigrationInterface {
  name = 'AddTicketClosedAtChangedAuditAction1756100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TYPE "audit_logs_action_enum" ADD VALUE IF NOT EXISTS 'ticket_closed_at_changed';
    `);
  }

  public async down(): Promise<void> {
    // Postgres enum qiymatini olib tashlashni to'g'ridan-to'g'ri qo'llab-quvvatlamaydi
    // (butun turni qayta yaratishni talab qiladi) — shuning uchun down() bo'sh qoldiriladi.
  }
}
