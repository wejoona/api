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
exports.TransferRepository = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const transfer_orm_entity_1 = require("../orm-entities/transfer.orm-entity");
const transfer_mapper_1 = require("../mappers/transfer.mapper");
let TransferRepository = class TransferRepository {
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
    async findByReference(reference) {
        const ormEntity = await this.repository.findOne({
            where: { reference },
        });
        if (!ormEntity) {
            return null;
        }
        return this.mapper.toDomainEntity(ormEntity);
    }
    async findByUserId(userId, limit, offset) {
        const query = this.repository
            .createQueryBuilder('transfer')
            .where('transfer.sender_id = :userId OR transfer.recipient_id = :userId', {
            userId,
        })
            .orderBy('transfer.created_at', 'DESC');
        if (limit) {
            query.take(limit);
        }
        if (offset) {
            query.skip(offset);
        }
        const ormEntities = await query.getMany();
        return this.mapper.toDomainEntities(ormEntities);
    }
    async findBySenderId(senderId, limit, offset) {
        const query = this.repository
            .createQueryBuilder('transfer')
            .where('transfer.sender_id = :senderId', { senderId })
            .orderBy('transfer.created_at', 'DESC');
        if (limit) {
            query.take(limit);
        }
        if (offset) {
            query.skip(offset);
        }
        const ormEntities = await query.getMany();
        return this.mapper.toDomainEntities(ormEntities);
    }
    async findByRecipientId(recipientId, limit, offset) {
        const query = this.repository
            .createQueryBuilder('transfer')
            .where('transfer.recipient_id = :recipientId', { recipientId })
            .orderBy('transfer.created_at', 'DESC');
        if (limit) {
            query.take(limit);
        }
        if (offset) {
            query.skip(offset);
        }
        const ormEntities = await query.getMany();
        return this.mapper.toDomainEntities(ormEntities);
    }
    async findByStatus(status) {
        const ormEntities = await this.repository.find({
            where: { status },
            order: { createdAt: 'DESC' },
        });
        return this.mapper.toDomainEntities(ormEntities);
    }
    async findByProviderTransferId(providerTransferId) {
        const ormEntity = await this.repository.findOne({
            where: { providerTransferId },
        });
        if (!ormEntity) {
            return null;
        }
        return this.mapper.toDomainEntity(ormEntity);
    }
    async countByUserId(userId) {
        return this.repository
            .createQueryBuilder('transfer')
            .where('transfer.sender_id = :userId OR transfer.recipient_id = :userId', {
            userId,
        })
            .getCount();
    }
    async findAll(limit, offset) {
        const query = this.repository
            .createQueryBuilder('transfer')
            .orderBy('transfer.created_at', 'DESC');
        if (limit) {
            query.take(limit);
        }
        if (offset) {
            query.skip(offset);
        }
        const ormEntities = await query.getMany();
        return this.mapper.toDomainEntities(ormEntities);
    }
    async delete(id) {
        await this.repository.delete(id);
    }
};
exports.TransferRepository = TransferRepository;
exports.TransferRepository = TransferRepository = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(transfer_orm_entity_1.TransferOrmEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        transfer_mapper_1.TransferMapper])
], TransferRepository);
//# sourceMappingURL=transfer.repository.js.map