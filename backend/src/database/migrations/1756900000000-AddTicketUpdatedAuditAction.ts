import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Murojaat kartochkasidan mavzu/tavsif/kategoriya/muhimlikni birgalikda tahrirlash uchun
 * yangi PATCH endpoint audit yozuvi yaratadi (AuditAction.TICKET_UPDATED). Oldingi
 * AddTicketPriorityChangedAuditAction bilan bir xil naqsh: Postgres enum turiga yangi qiymat qo'shish.
 */
export class AddTicketUpdatedAuditAction1756900000000 implements MigrationInterface {
  name = 'AddTicketUpdatedAuditAction1756900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TYPE "audit_logs_action_enum" ADD VALUE IF NOT EXISTS 'ticket_updated';
    `);
  }

  public async down(): Promise<void> {
    // Postgres enum qiymatini olib tashlashni to'g'ridan-to'g'ri qo'llab-quvvatlamaydi.
  }
}
