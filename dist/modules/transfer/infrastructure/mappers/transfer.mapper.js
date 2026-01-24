"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransferMapper = void 0;
const common_1 = require("@nestjs/common");
const transfer_orm_entity_1 = require("../orm-entities/transfer.orm-entity");
const transfer_entity_1 = require("../../application/domain/entities/transfer.entity");
let TransferMapper = class TransferMapper {
    toOrmEntity(domainEntity) {
        if (!domainEntity) {
            throw new Error('Domain entity is required');
        }
        const ormEntity = new transfer_orm_entity_1.TransferOrmEntity();
        ormEntity.id = domainEntity.id;
        ormEntity.reference = domainEntity.reference;
        ormEntity.type = domainEntity.type;
        ormEntity.status = domainEntity.status;
        ormEntity.senderId = domainEntity.senderId;
        ormEntity.senderWalletId = domainEntity.senderWalletId;
        ormEntity.senderPhone = domainEntity.senderPhone;
        ormEntity.recipientId = domainEntity.recipientId;
        ormEntity.recipientWalletId = domainEntity.recipientWalletId;
        ormEntity.recipientPhone = domainEntity.recipientPhone;
        ormEntity.recipientAddress = domainEntity.recipientAddress;
        ormEntity.recipientBlockchain = domainEntity.recipientBlockchain;
        ormEntity.amount = domainEntity.amount;
        ormEntity.fee = domainEntity.fee;
        ormEntity.currency = domainEntity.currency;
        ormEntity.note = domainEntity.note;
        ormEntity.providerTransferId = domainEntity.providerTransferId;
        ormEntity.providerName = domainEntity.providerName;
        ormEntity.ledgerTransactionId = domainEntity.ledgerTransactionId;
        ormEntity.txHash = domainEntity.txHash;
        ormEntity.errorMessage = domainEntity.errorMessage;
        ormEntity.metadata = domainEntity.metadata;
        ormEntity.createdAt = domainEntity.createdAt;
        ormEntity.updatedAt = domainEntity.updatedAt;
        ormEntity.completedAt = domainEntity.completedAt;
        return ormEntity;
    }
    toDomainEntity(ormEntity) {
        if (!ormEntity) {
            throw new Error('ORM entity is required');
        }
        return transfer_entity_1.TransferEntity.reconstitute({
            id: ormEntity.id,
            reference: ormEntity.reference,
            type: ormEntity.type,
            status: ormEntity.status,
            senderId: ormEntity.senderId,
            senderWalletId: ormEntity.senderWalletId,
            senderPhone: ormEntity.senderPhone,
            recipientId: ormEntity.recipientId,
            recipientWalletId: ormEntity.recipientWalletId,
            recipientPhone: ormEntity.recipientPhone,
            recipientAddress: ormEntity.recipientAddress,
            recipientBlockchain: ormEntity.recipientBlockchain,
            amount: Number(ormEntity.amount) || 0,
            fee: Number(ormEntity.fee) || 0,
            currency: ormEntity.currency,
            note: ormEntity.note,
            providerTransferId: ormEntity.providerTransferId,
            providerName: ormEntity.providerName,
            ledgerTransactionId: ormEntity.ledgerTransactionId,
            txHash: ormEntity.txHash,
            errorMessage: ormEntity.errorMessage,
            metadata: ormEntity.metadata,
            createdAt: ormEntity.createdAt,
            updatedAt: ormEntity.updatedAt,
            completedAt: ormEntity.completedAt,
        });
    }
    toDomainEntities(ormEntities) {
        return ormEntities.map((ormEntity) => this.toDomainEntity(ormEntity));
    }
};
exports.TransferMapper = TransferMapper;
exports.TransferMapper = TransferMapper = __decorate([
    (0, common_1.Injectable)()
], TransferMapper);
//# sourceMappingURL=transfer.mapper.js.map