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
exports.TransactionOrmEntity = void 0;
const typeorm_1 = require("typeorm");
const orm_entities_1 = require("../../../wallet/infrastructure/orm-entities");
let TransactionOrmEntity = class TransactionOrmEntity {
};
exports.TransactionOrmEntity = TransactionOrmEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], TransactionOrmEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'wallet_id', type: 'uuid' }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], TransactionOrmEntity.prototype, "walletId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 20 }),
    __metadata("design:type", String)
], TransactionOrmEntity.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 18, scale: 2 }),
    __metadata("design:type", Number)
], TransactionOrmEntity.prototype, "amount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 10 }),
    __metadata("design:type", String)
], TransactionOrmEntity.prototype, "currency", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 20, default: 'pending' }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], TransactionOrmEntity.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'yellow_card_ref',
        type: 'varchar',
        length: 100,
        nullable: true,
    }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], TransactionOrmEntity.prototype, "yellowCardRef", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'recipient_address',
        type: 'varchar',
        length: 255,
        nullable: true,
    }),
    __metadata("design:type", String)
], TransactionOrmEntity.prototype, "recipientAddress", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'recipient_phone',
        type: 'varchar',
        length: 20,
        nullable: true,
    }),
    __metadata("design:type", String)
], TransactionOrmEntity.prototype, "recipientPhone", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'recipient_wallet_id', type: 'uuid', nullable: true }),
    __metadata("design:type", String)
], TransactionOrmEntity.prototype, "recipientWalletId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], TransactionOrmEntity.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'failure_reason', type: 'text', nullable: true }),
    __metadata("design:type", String)
], TransactionOrmEntity.prototype, "failureReason", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], TransactionOrmEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'completed_at', type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], TransactionOrmEntity.prototype, "completedAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => orm_entities_1.WalletOrmEntity),
    (0, typeorm_1.JoinColumn)({ name: 'wallet_id' }),
    __metadata("design:type", orm_entities_1.WalletOrmEntity)
], TransactionOrmEntity.prototype, "wallet", void 0);
exports.TransactionOrmEntity = TransactionOrmEntity = __decorate([
    (0, typeorm_1.Entity)('transactions')
], TransactionOrmEntity);
//# sourceMappingURL=transaction.orm-entity.js.map