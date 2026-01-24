"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddLowBalanceNotificationType1737400000000 = void 0;
class AddLowBalanceNotificationType1737400000000 {
    constructor() {
        this.name = 'AddLowBalanceNotificationType1737400000000';
    }
    async up(queryRunner) {
        await queryRunner.query(`
      ALTER TYPE "notification_type_enum" ADD VALUE IF NOT EXISTS 'low_balance'
    `);
    }
    async down(queryRunner) {
        console.log('Note: Rollback does not remove low_balance from notification_type_enum');
    }
}
exports.AddLowBalanceNotificationType1737400000000 = AddLowBalanceNotificationType1737400000000;
//# sourceMappingURL=1737400000000-AddLowBalanceNotificationType.js.map