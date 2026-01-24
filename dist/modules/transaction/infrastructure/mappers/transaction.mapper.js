"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionMapper = void 0;
const transaction_orm_entity_1 = require("../orm-entities/transaction.orm-entity");
const transaction_entity_1 = require("../../domain/entities/transaction.entity");
const common_1 = require("@nestjs/common");
let TransactionMapper = class TransactionMapper {
    toOrmEntity(domainEntity) {
        if (!domainEntity) {
            throw new Error('Domain entity is required');
        }
        const ormEntity = new transaction_orm_entity_1.TransactionOrmEntity();
        ormEntity.id = domainEntity.id;
        ormEntity.walletId = domainEntity.walletId;
        ormEntity.type = domainEntity.type;
        ormEntity.amount = domainEntity.amount;
        ormEntity.currency = domainEntity.currency;
        ormEntity.status = domainEntity.status;
        ormEntity.yellowCardRef = domainEntity.yellowCardRef;
        ormEntity.recipientAddress = domainEntity.recipientAddress;
        ormEntity.recipientPhone = domainEntity.recipientPhone;
        ormEntity.recipientWalletId = domainEntity.recipientWalletId;
        ormEntity.metadata = domainEntity.metadata;
        ormEntity.failureReason = domainEntity.failureReason;
        ormEntity.createdAt = domainEntity.createdAt;
        ormEntity.completedAt = domainEntity.completedAt;
        return ormEntity;
    }
    toDomainEntity(ormEntity) {
        return transaction_entity_1.TransactionEntity.reconstitute({
            id: ormEntity.id,
            walletId: ormEntity.walletId,
            type: ormEntity.type,
            amount: Number(ormEntity.amount),
            currency: ormEntity.currency,
            status: ormEntity.status,
            yellowCardRef: ormEntity.yellowCardRef,
            recipientAddress: ormEntity.recipientAddress,
            recipientPhone: ormEntity.recipientPhone,
            recipientWalletId: ormEntity.recipientWalletId,
            metadata: ormEntity.metadata,
            failureReason: ormEntity.failureReason,
            createdAt: ormEntity.createdAt,
            completedAt: ormEntity.completedAt,
        });
    }
};
exports.TransactionMapper = TransactionMapper;
exports.TransactionMapper = TransactionMapper = __decorate([
    (0, common_1.Injectable)()
], TransactionMapper);
//# sourceMappingURL=transaction.mapper.js.map