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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WalletRepository = void 0;
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const wallet_mapper_1 = require("../mappers/wallet.mapper");
const wallet_orm_entity_1 = require("../orm-entities/wallet.orm-entity");
const common_1 = require("@nestjs/common");
let WalletRepository = class WalletRepository {
    constructor(repository, mapper) {
        this.repository = repository;
        this.mapper = mapper;
    }
    async save(entity) {
        const ormEntity = this.mapper.toOrmEntity(entity);
        const savedOrmEntity = await this.repository.save(ormEntity);
        return this.mapper.toDomainEntity(savedOrmEntity);
    }
    async findById(id) {
        const ormEntity = await this.repository.findOne({
            where: { id },
        });
        if (!ormEntity) {
            return null;
        }
        return this.mapper.toDomainEntity(ormEntity);
    }
    async findByUserId(userId) {
        const ormEntity = await this.repository.findOne({
            where: { userId },
        });
        if (!ormEntity) {
            return null;
        }
        return this.mapper.toDomainEntity(ormEntity);
    }
    async findByYellowCardWalletId(yellowCardWalletId) {
        const ormEntity = await this.repository.findOne({
            where: { yellowCardWalletId },
        });
        if (!ormEntity) {
            return null;
        }
        return this.mapper.toDomainEntity(ormEntity);
    }
    async findByCircleWalletId(circleWalletId) {
        const ormEntity = await this.repository.findOne({
            where: { circleWalletId },
        });
        if (!ormEntity) {
            return null;
        }
        return this.mapper.toDomainEntity(ormEntity);
    }
    async findByProviderWalletId(providerWalletId) {
        const circleWallet = await this.findByCircleWalletId(providerWalletId);
        if (circleWallet) {
            return circleWallet;
        }
        return this.findByYellowCardWalletId(providerWalletId);
    }
    async findAll() {
        const ormEntities = await this.repository.find();
        if (!ormEntities) {
            return [];
        }
        return ormEntities.map((ormEntity) => this.mapper.toDomainEntity(ormEntity));
    }
    async delete(id) {
        await this.repository.delete(id);
    }
};
exports.WalletRepository = WalletRepository;
exports.WalletRepository = WalletRepository = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(wallet_orm_entity_1.WalletOrmEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        wallet_mapper_1.WalletMapper])
], WalletRepository);
//# sourceMappingURL=wallet.repository.js.map