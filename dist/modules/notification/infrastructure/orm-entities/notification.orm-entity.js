"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationOrmEntity = void 0;
const typeorm_1 = require("typeorm");
let NotificationOrmEntity = class NotificationOrmEntity {
};
exports.NotificationOrmEntity = NotificationOrmEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], NotificationOrmEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'user_id', type: 'uuid' }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], NotificationOrmEntity.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: [
            'transfer_received',
            'transfer_sent',
            'transfer_failed',
            'transfer_complete',
            'deposit_completed',
            'deposit_complete',
            'deposit_failed',
            'withdrawal_completed',
            'withdrawal_complete',
            'withdrawal_failed',
            'withdrawal_pending',
            'kyc_approved',
            'kyc_rejected',
            'kyc_update',
            'low_balance',
            'system',
            'promotional',
            'new_device_login',
            'large_transaction',
            'address_whitelisted',
            'security_alert',
            'price_alert',
            'weekly_summary',
        ],
    }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], NotificationOrmEntity.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ['pending', 'sent', 'delivered', 'read', 'failed'],
        default: 'pending',
    }),
    __metadata("design:type", String)
], NotificationOrmEntity.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255 }),
    __metadata("design:type", String)
], NotificationOrmEntity.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], NotificationOrmEntity.prototype, "body", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', default: '{}' }),
    __metadata("design:type", Object)
], NotificationOrmEntity.prototype, "data", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'reference_type',
        type: 'varchar',
        length: 50,
        nullable: true,
    }),
    __metadata("design:type", Object)
], NotificationOrmEntity.prototype, "referenceType", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'reference_id', type: 'uuid', nullable: true }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", Object)
], NotificationOrmEntity.prototype, "referenceId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'sent_at', type: 'timestamp', nullable: true }),
    __metadata("design:type", Object)
], NotificationOrmEntity.prototype, "sentAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'delivered_at', type: 'timestamp', nullable: true }),
    __metadata("design:type", Object)
], NotificationOrmEntity.prototype, "deliveredAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'read_at', type: 'timestamp', nullable: true }),
    __metadata("design:type", Object)
], NotificationOrmEntity.prototype, "readAt", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], NotificationOrmEntity.prototype, "createdAt", void 0);
exports.NotificationOrmEntity = NotificationOrmEntity = __decorate([
    (0, typeorm_1.Entity)('notifications')
], NotificationOrmEntity);
//# sourceMappingURL=notification.orm-entity.js.map