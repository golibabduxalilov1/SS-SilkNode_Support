"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TimeTrackingAndExtras1755000000000 = void 0;
class TimeTrackingAndExtras1755000000000 {
    constructor() {
        this.name = 'TimeTrackingAndExtras1755000000000';
    }
    async up(queryRunner) {
        await queryRunner.query(`
      ALTER TYPE "tickets_status_enum" ADD VALUE IF NOT EXISTS 'waiting_user';
    `);
        await queryRunner.query(`
      ALTER TABLE "tickets"
        ADD COLUMN "first_response_at" TIMESTAMPTZ,
        ADD COLUMN "closed_at" TIMESTAMPTZ,
        ADD COLUMN "first_response_minutes" INTEGER,
        ADD COLUMN "resolution_minutes" INTEGER;

      ALTER TABLE "organizations"
        ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true;

      ALTER TABLE "attachments"
        ADD COLUMN "ticket_id" BIGINT REFERENCES "tickets"("id");

      UPDATE "attachments" a
        SET "ticket_id" = m."ticket_id"
        FROM "messages" m
        WHERE a."message_id" = m."id" AND a."ticket_id" IS NULL;

      ALTER TABLE "attachments"
        ALTER COLUMN "ticket_id" SET NOT NULL,
        ALTER COLUMN "message_id" DROP NOT NULL;

      CREATE INDEX "idx_attachments_ticket_id" ON "attachments"("ticket_id");
    `);
    }
    async down(queryRunner) {
        await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_attachments_ticket_id";

      ALTER TABLE "attachments"
        ALTER COLUMN "message_id" SET NOT NULL,
        DROP COLUMN "ticket_id";

      ALTER TABLE "organizations"
        DROP COLUMN "is_active";

      ALTER TABLE "tickets"
        DROP COLUMN "first_response_at",
        DROP COLUMN "closed_at",
        DROP COLUMN "first_response_minutes",
        DROP COLUMN "resolution_minutes";
    `);
    }
}
exports.TimeTrackingAndExtras1755000000000 = TimeTrackingAndExtras1755000000000;
//# sourceMappingURL=1755000000000-TimeTrackingAndExtras.js.map