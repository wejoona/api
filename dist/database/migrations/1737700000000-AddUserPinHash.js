"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddUserPinHash1737700000000 = void 0;
const typeorm_1 = require("typeorm");
class AddUserPinHash1737700000000 {
    constructor() {
        this.name = 'AddUserPinHash1737700000000';
    }
    async up(queryRunner) {
        await queryRunner.addColumn('users', new typeorm_1.TableColumn({
            name: 'pin_hash',
            type: 'varchar',
            length: '255',
            isNullable: true,
        }));
        await queryRunner.addColumn('users', new typeorm_1.TableColumn({
            name: 'pin_set_at',
            type: 'timestamp',
            isNullable: true,
        }));
        await queryRunner.addColumn('users', new typeorm_1.TableColumn({
            name: 'pin_attempts',
            type: 'integer',
            default: 0,
        }));
        await queryRunner.addColumn('users', new typeorm_1.TableColumn({
            name: 'pin_locked_until',
            type: 'timestamp',
            isNullable: true,
        }));
    }
    async down(queryRunner) {
        await queryRunner.dropColumn('users', 'pin_locked_until');
        await queryRunner.dropColumn('users', 'pin_attempts');
        await queryRunner.dropColumn('users', 'pin_set_at');
        await queryRunner.dropColumn('users', 'pin_hash');
    }
}
exports.AddUserPinHash1737700000000 = AddUserPinHash1737700000000;
//# sourceMappingURL=1737700000000-AddUserPinHash.js.map