import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * T06 — kartochkadan tahrirlanadigan Muhimlik (priority) uchun yangi PATCH endpoint audit
 * yozuvi yaratadi (AuditAction.TICKET_PRIORITY_CHANGED). 1756100000000-AddTicketClosedAtChangedAuditAction
 * bilan bir xil naqsh: Postgres enum turiga yangi qiymat qo'shish.
 */
export class AddTicketPriorityChangedAuditAction1756300000000 implements MigrationInterface {
  name = 'AddTicketPriorityChangedAuditAction1756300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TYPE "audit_logs_action_enum" ADD VALUE IF NOT EXISTS 'ticket_priority_changed';
    `);
  }

  public async down(): Promise<void> {
    // Postgres enum qiymatini olib tashlashni to'g'ridan-to'g'ri qo'llab-quvvatlamaydi.
  }
}
