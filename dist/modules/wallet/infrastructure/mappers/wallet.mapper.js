"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WalletMapper = void 0;
const wallet_orm_entity_1 = require("../orm-entities/wallet.orm-entity");
const wallet_entity_1 = require("../../domain/entities/wallet.entity");
const common_1 = require("@nestjs/common");
let WalletMapper = class WalletMapper {
    toOrmEntity(domainEntity) {
        if (!domainEntity) {
            throw new Error('Domain entity is required');
        }
        const ormEntity = new wallet_orm_entity_1.WalletOrmEntity();
        ormEntity.id = domainEntity.id;
        ormEntity.userId = domainEntity.userId;
        ormEntity.yellowCardWalletId = domainEntity.yellowCardWalletId;
        ormEntity.circleWalletId = domainEntity.circleWalletId;
        ormEntity.circleWalletAddress = domainEntity.circleWalletAddress;
        ormEntity.currency = domainEntity.currency;
        ormEntity.balance = domainEntity.balance;
        ormEntity.kycStatus = domainEntity.kycStatus;
        ormEntity.status = domainEntity.status;
        ormEntity.createdAt = domainEntity.createdAt;
        ormEntity.updatedAt = domainEntity.updatedAt;
        return ormEntity;
    }
    toDomainEntity(ormEntity) {
        return wallet_entity_1.WalletEntity.reconstitute({
            id: ormEntity.id,
            userId: ormEntity.userId,
            yellowCardWalletId: ormEntity.yellowCardWalletId,
            circleWalletId: ormEntity.circleWalletId,
            circleWalletAddress: ormEntity.circleWalletAddress,
            currency: ormEntity.currency,
            balance: Number(ormEntity.balance) || 0,
            kycStatus: ormEntity.kycStatus || 'none',
            status: ormEntity.status,
            createdAt: ormEntity.createdAt,
            updatedAt: ormEntity.updatedAt,
        });
    }
};
exports.WalletMapper = WalletMapper;
exports.WalletMapper = WalletMapper = __decorate([
    (0, common_1.Injectable)()
], WalletMapper);
//# sourceMappingURL=wallet.mapper.js.map