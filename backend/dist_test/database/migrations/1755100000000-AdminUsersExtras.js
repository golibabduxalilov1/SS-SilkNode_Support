"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminUsersExtras1755100000000 = void 0;
class AdminUsersExtras1755100000000 {
    constructor() {
        this.name = 'AdminUsersExtras1755100000000';
    }
    async up(queryRunner) {
        await queryRunner.query(`
      ALTER TABLE "users"
        ALTER COLUMN "telegram_id" DROP NOT NULL;

      ALTER TABLE "users"
        ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true;
    `);
    }
    async down(queryRunner) {
        await queryRunner.query(`
      ALTER TABLE "users"
        DROP COLUMN "is_active";

      ALTER TABLE "users"
        ALTER COLUMN "telegram_id" SET NOT NULL;
    `);
    }
}
exports.AdminUsersExtras1755100000000 = AdminUsersExtras1755100000000;
//# sourceMappingURL=1755100000000-AdminUsersExtras.js.map