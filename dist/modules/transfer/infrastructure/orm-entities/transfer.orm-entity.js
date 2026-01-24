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
exports.TransferOrmEntity = void 0;
const typeorm_1 = require("typeorm");
const orm_entities_1 = require("../../../user/infrastructure/orm-entities");
const orm_entities_2 = require("../../../wallet/infrastructure/orm-entities");
let TransferOrmEntity = class TransferOrmEntity {
};
exports.TransferOrmEntity = TransferOrmEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], TransferOrmEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 50, unique: true }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], TransferOrmEntity.prototype, "reference", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ['internal', 'external'],
    }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], TransferOrmEntity.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: [
            'pending',
            'processing',
            'completed',
            'failed',
            'cancelled',
            'refunded',
        ],
        default: 'pending',
    }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], TransferOrmEntity.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'sender_id', type: 'uuid' }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], TransferOrmEntity.prototype, "senderId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'sender_wallet_id', type: 'uuid' }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], TransferOrmEntity.prototype, "senderWalletId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'sender_phone', type: 'varchar', length: 20, nullable: true }),
    __metadata("design:type", String)
], TransferOrmEntity.prototype, "senderPhone", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'recipient_id', type: 'uuid', nullable: true }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], TransferOrmEntity.prototype, "recipientId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'recipient_wallet_id', type: 'uuid', nullable: true }),
    __metadata("design:type", String)
], TransferOrmEntity.prototype, "recipientWalletId", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'recipient_phone',
        type: 'varchar',
        length: 20,
        nullable: true,
    }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], TransferOrmEntity.prototype, "recipientPhone", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'recipient_address',
        type: 'varchar',
        length: 255,
        nullable: true,
    }),
    __metadata("design:type", String)
], TransferOrmEntity.prototype, "recipientAddress", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'recipient_blockchain',
        type: 'varchar',
        length: 20,
        nullable: true,
    }),
    __metadata("design:type", String)
], TransferOrmEntity.prototype, "recipientBlockchain", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'bigint' }),
    __metadata("design:type", Number)
], TransferOrmEntity.prototype, "amount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'bigint', default: 0 }),
    __metadata("design:type", Number)
], TransferOrmEntity.prototype, "fee", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 10, default: 'USDC' }),
    __metadata("design:type", String)
], TransferOrmEntity.prototype, "currency", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 500, nullable: true }),
    __metadata("design:type", String)
], TransferOrmEntity.prototype, "note", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'provider_transfer_id',
        type: 'varchar',
        length: 255,
        nullable: true,
    }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], TransferOrmEntity.prototype, "providerTransferId", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'provider_name',
        type: 'varchar',
        length: 50,
        nullable: true,
    }),
    __metadata("design:type", String)
], TransferOrmEntity.prototype, "providerName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'ledger_transaction_id', type: 'uuid', nullable: true }),
    __metadata("design:type", String)
], TransferOrmEntity.prototype, "ledgerTransactionId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tx_hash', type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", String)
], TransferOrmEntity.prototype, "txHash", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'error_message',
        type: 'varchar',
        length: 500,
        nullable: true,
    }),
    __metadata("design:type", String)
], TransferOrmEntity.prototype, "errorMessage", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true, default: '{}' }),
    __metadata("design:type", Object)
], TransferOrmEntity.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], TransferOrmEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], TransferOrmEntity.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'completed_at', type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], TransferOrmEntity.prototype, "completedAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => orm_entities_1.UserOrmEntity),
    (0, typeorm_1.JoinColumn)({ name: 'sender_id' }),
    __metadata("design:type", orm_entities_1.UserOrmEntity)
], TransferOrmEntity.prototype, "sender", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => orm_entities_1.UserOrmEntity),
    (0, typeorm_1.JoinColumn)({ name: 'recipient_id' }),
    __metadata("design:type", orm_entities_1.UserOrmEntity)
], TransferOrmEntity.prototype, "recipient", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => orm_entities_2.WalletOrmEntity),
    (0, typeorm_1.JoinColumn)({ name: 'sender_wallet_id' }),
    __metadata("design:type", orm_entities_2.WalletOrmEntity)
], TransferOrmEntity.prototype, "senderWallet", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => orm_entities_2.WalletOrmEntity),
    (0, typeorm_1.JoinColumn)({ name: 'recipient_wallet_id' }),
    __metadata("design:type", orm_entities_2.WalletOrmEntity)
], TransferOrmEntity.prototype, "recipientWallet", void 0);
exports.TransferOrmEntity = TransferOrmEntity = __decorate([
    (0, typeorm_1.Entity)('transfers')
], TransferOrmEntity);
//# sourceMappingURL=transfer.orm-entity.js.map