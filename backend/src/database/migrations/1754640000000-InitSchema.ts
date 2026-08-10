import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Boshlang'ich sxema: Organizations, Users (TALAB 3 ustunlari bilan),
 * Tickets, Messages, Attachments.
 * Users jadvalidagi is_started/started_at/phone_number/is_phone_verified/
 * phone_verified_at ustunlari — Silknode Support Texnik Yechim hujjati,
 * bo'lim 3.
 */
export class InitSchema1754640000000 implements MigrationInterface {
  name = 'InitSchema1754640000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "users_role_enum" AS ENUM ('user', 'admin', 'superadmin');
      CREATE TYPE "tickets_priority_enum" AS ENUM ('low', 'medium', 'high', 'critical');
      CREATE TYPE "tickets_status_enum" AS ENUM ('new', 'in_progress', 'resolved', 'closed');

      CREATE TABLE "organizations" (
        "id" BIGSERIAL PRIMARY KEY,
        "name" VARCHAR(255) NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE TABLE "users" (
        "id" BIGSERIAL PRIMARY KEY,
        "telegram_id" BIGINT NOT NULL,
        "fullname" VARCHAR(255),
        "username" VARCHAR(255),
        "role" "users_role_enum" NOT NULL DEFAULT 'user',
        "is_started" BOOLEAN NOT NULL DEFAULT false,
        "started_at" TIMESTAMPTZ,
        "phone_number" VARCHAR(20),
        "is_phone_verified" BOOLEAN NOT NULL DEFAULT false,
        "phone_verified_at" TIMESTAMPTZ,
        "password_hash" VARCHAR(255),
        "admin_login" VARCHAR(255),
        "organization_id" BIGINT REFERENCES "organizations"("id"),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "uq_users_telegram_id" UNIQUE ("telegram_id"),
        CONSTRAINT "uq_users_admin_login" UNIQUE ("admin_login")
      );
      CREATE INDEX "idx_users_telegram_id" ON "users"("telegram_id");
      CREATE INDEX "idx_users_verification" ON "users"("is_started", "is_phone_verified");

      CREATE TABLE "tickets" (
        "id" BIGSERIAL PRIMARY KEY,
        "number" VARCHAR(32) NOT NULL UNIQUE,
        "title" VARCHAR(255) NOT NULL,
        "description" TEXT NOT NULL,
        "category" VARCHAR(100) NOT NULL,
        "priority" "tickets_priority_enum" NOT NULL DEFAULT 'medium',
        "status" "tickets_status_enum" NOT NULL DEFAULT 'new',
        "organization_id" BIGINT REFERENCES "organizations"("id"),
        "created_by_id" BIGINT NOT NULL REFERENCES "users"("id"),
        "assigned_to_id" BIGINT REFERENCES "users"("id"),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX "idx_tickets_created_by" ON "tickets"("created_by_id");
      CREATE INDEX "idx_tickets_status" ON "tickets"("status");

      CREATE TABLE "messages" (
        "id" BIGSERIAL PRIMARY KEY,
        "ticket_id" BIGINT NOT NULL REFERENCES "tickets"("id"),
        "sender_id" BIGINT NOT NULL REFERENCES "users"("id"),
        "text" TEXT NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX "idx_messages_ticket_id" ON "messages"("ticket_id");

      CREATE TABLE "attachments" (
        "id" BIGSERIAL PRIMARY KEY,
        "message_id" BIGINT NOT NULL REFERENCES "messages"("id"),
        "file_name" VARCHAR(255) NOT NULL,
        "file_url" VARCHAR(1024) NOT NULL,
        "mime_type" VARCHAR(128) NOT NULL,
        "size_bytes" BIGINT NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS "attachments";
      DROP TABLE IF EXISTS "messages";
      DROP TABLE IF EXISTS "tickets";
      DROP TABLE IF EXISTS "users";
      DROP TABLE IF EXISTS "organizations";
      DROP TYPE IF EXISTS "tickets_status_enum";
      DROP TYPE IF EXISTS "tickets_priority_enum";
      DROP TYPE IF EXISTS "users_role_enum";
    `);
  }
}
