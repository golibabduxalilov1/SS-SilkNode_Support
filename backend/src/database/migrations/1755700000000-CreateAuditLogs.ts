import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Admin panel "Loglar" bo'limi — superadmin/admin tomonidan qilingan muhim
 * amallarni kuzatish uchun audit_logs jadvali. actor_id/actor_name FK emas
 * (snapshot) — xodim keyinchalik o'chirilsa ham audit tarixi o'qilishi kerak.
 */
export class CreateAuditLogs1755700000000 implements MigrationInterface {
  name = 'CreateAuditLogs1755700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE EXTENSION IF NOT EXISTS pgcrypto;

      CREATE TYPE "audit_logs_action_enum" AS ENUM (
        'ticket_status_changed',
        'ticket_assigned',
        'employee_created',
        'employee_updated',
        'employee_role_changed',
        'employee_deleted',
        'organization_created',
        'organization_updated',
        'organization_deleted',
        'category_created',
        'category_updated',
        'category_deleted'
      );

      CREATE TABLE "audit_logs" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "actor_id" BIGINT,
        "actor_name" VARCHAR(255) NOT NULL,
        "action" "audit_logs_action_enum" NOT NULL,
        "entity_type" VARCHAR(100) NOT NULL,
        "entity_id" VARCHAR(100),
        "metadata" JSONB,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE INDEX "idx_audit_logs_actor_id" ON "audit_logs"("actor_id");
      CREATE INDEX "idx_audit_logs_entity" ON "audit_logs"("entity_type", "entity_id");
      CREATE INDEX "idx_audit_logs_action" ON "audit_logs"("action");
      CREATE INDEX "idx_audit_logs_created_at" ON "audit_logs"("created_at");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS "audit_logs";
      DROP TYPE IF EXISTS "audit_logs_action_enum";
    `);
  }
}
