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
exports.TransactionRepository = void 0;
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const transaction_mapper_1 = require("../mappers/transaction.mapper");
const transaction_orm_entity_1 = require("../orm-entities/transaction.orm-entity");
const common_1 = require("@nestjs/common");
let TransactionRepository = class TransactionRepository {
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
    async findByWalletId(walletId) {
        const ormEntities = await this.repository.find({
            where: { walletId },
            order: { createdAt: 'DESC' },
        });
        return ormEntities.map((ormEntity) => this.mapper.toDomainEntity(ormEntity));
    }
    async findByYellowCardRef(yellowCardRef) {
        const ormEntity = await this.repository.findOne({
            where: { yellowCardRef },
        });
        if (!ormEntity) {
            return null;
        }
        return this.mapper.toDomainEntity(ormEntity);
    }
    async findByProviderRef(providerRef) {
        return this.findByYellowCardRef(providerRef);
    }
    async findPendingByWalletId(walletId) {
        const ormEntities = await this.repository.find({
            where: { walletId, status: 'pending' },
            order: { createdAt: 'DESC' },
        });
        return ormEntities.map((ormEntity) => this.mapper.toDomainEntity(ormEntity));
    }
    async findAll() {
        const ormEntities = await this.repository.find({
            order: { createdAt: 'DESC' },
        });
        if (!ormEntities) {
            return [];
        }
        return ormEntities.map((ormEntity) => this.mapper.toDomainEntity(ormEntity));
    }
    async delete(id) {
        await this.repository.delete(id);
    }
    async update(id, data) {
        await this.repository.update(id, data);
    }
    async updateStatus(id, status) {
        await this.repository.update(id, { status });
    }
    async getDailyTransferVolume(userId, sinceDate) {
        const result = await this.repository
            .createQueryBuilder('transaction')
            .innerJoin('wallets', 'wallet', 'wallet.id = transaction.walletId')
            .select('COALESCE(SUM(ABS(transaction.amount)), 0)', 'totalVolume')
            .where('wallet.userId = :userId', { userId })
            .andWhere('transaction.createdAt >= :sinceDate', { sinceDate })
            .andWhere('transaction.type IN (:...types)', {
            types: ['internal_transfer', 'external_transfer', 'withdrawal']
        })
            .andWhere('transaction.status IN (:...statuses)', {
            statuses: ['completed', 'pending', 'processing']
        })
            .getRawOne();
        return parseFloat(result?.totalVolume || '0');
    }
    async findByWalletIdPaginated(walletId, options) {
        const query = this.repository
            .createQueryBuilder('transaction')
            .where('transaction.walletId = :walletId', { walletId })
            .orderBy('transaction.createdAt', 'DESC');
        if (options.type) {
            query.andWhere('transaction.type = :type', { type: options.type });
        }
        if (options.status) {
            query.andWhere('transaction.status = :status', { status: options.status });
        }
        const [ormEntities, total] = await query
            .take(options.limit)
            .skip(options.offset)
            .getManyAndCount();
        return {
            transactions: ormEntities.map((orm) => this.mapper.toDomainEntity(orm)),
            total,
        };
    }
    async findByWalletIdFiltered(walletId, filters) {
        const query = this.repository
            .createQueryBuilder('tx')
            .where('tx.walletId = :walletId', { walletId });
        if (filters.type) {
            query.andWhere('tx.type = :type', { type: filters.type });
        }
        if (filters.status) {
            query.andWhere('tx.status = :status', { status: filters.status });
        }
        if (filters.startDate) {
            query.andWhere('tx.createdAt >= :startDate', {
                startDate: filters.startDate,
            });
        }
        if (filters.endDate) {
            query.andWhere('tx.createdAt <= :endDate', {
                endDate: filters.endDate,
            });
        }
        if (filters.minAmount !== undefined && filters.minAmount !== null) {
            query.andWhere('ABS(tx.amount) >= :minAmount', {
                minAmount: filters.minAmount,
            });
        }
        if (filters.maxAmount !== undefined && filters.maxAmount !== null) {
            query.andWhere('ABS(tx.amount) <= :maxAmount', {
                maxAmount: filters.maxAmount,
            });
        }
        if (filters.search) {
            const searchPattern = `%${filters.search}%`;
            query.andWhere('(tx.yellowCardRef ILIKE :search OR tx.recipientPhone ILIKE :search OR tx.recipientAddress ILIKE :search)', { search: searchPattern });
        }
        const sortBy = filters.sortBy || 'createdAt';
        const sortOrder = filters.sortOrder || 'DESC';
        query.orderBy(`tx.${sortBy}`, sortOrder);
        const [ormEntities, total] = await query
            .take(filters.limit)
            .skip(filters.offset)
            .getManyAndCount();
        return {
            transactions: ormEntities.map((orm) => this.mapper.toDomainEntity(orm)),
            total,
        };
    }
    async findByWalletIdWithDateRange(walletId, startDate, endDate) {
        const query = this.repository
            .createQueryBuilder('transaction')
            .where('transaction.walletId = :walletId', { walletId })
            .orderBy('transaction.createdAt', 'DESC');
        if (startDate) {
            query.andWhere('transaction.createdAt >= :startDate', { startDate });
        }
        if (endDate) {
            query.andWhere('transaction.createdAt <= :endDate', { endDate });
        }
        const ormEntities = await query.getMany();
        return ormEntities.map((orm) => this.mapper.toDomainEntity(orm));
    }
    async getTransactionStats() {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const [countStats, volumeStats, todayVolumeStats] = await Promise.all([
            this.repository
                .createQueryBuilder('transaction')
                .select('transaction.status', 'status')
                .addSelect('COUNT(*)', 'count')
                .groupBy('transaction.status')
                .getRawMany(),
            this.repository
                .createQueryBuilder('transaction')
                .select('COALESCE(SUM(ABS(transaction.amount)), 0)', 'totalVolume')
                .where('transaction.status = :status', { status: 'completed' })
                .getRawOne(),
            this.repository
                .createQueryBuilder('transaction')
                .select('COALESCE(SUM(ABS(transaction.amount)), 0)', 'todayVolume')
                .where('transaction.status = :status', { status: 'completed' })
                .andWhere('transaction.createdAt >= :todayStart', { todayStart })
                .getRawOne(),
        ]);
        const statusCounts = countStats.reduce((acc, row) => {
            acc[row.status] = parseInt(row.count, 10);
            return acc;
        }, {});
        const total = Object.values(statusCounts).reduce((sum, count) => sum + count, 0);
        const pending = statusCounts['pending'] || 0;
        const completed = statusCounts['completed'] || 0;
        const failed = statusCounts['failed'] || 0;
        const totalVolume = parseFloat(volumeStats?.totalVolume || '0');
        const todayVolume = parseFloat(todayVolumeStats?.todayVolume || '0');
        return {
            total,
            pending,
            completed,
            failed,
            totalVolume,
            todayVolume,
        };
    }
    async getVolumeByDateRange(startDate, endDate) {
        const result = await this.repository
            .createQueryBuilder('transaction')
            .select('COALESCE(SUM(ABS(transaction.amount)), 0)', 'volume')
            .where('transaction.status = :status', { status: 'completed' })
            .andWhere('transaction.createdAt BETWEEN :startDate AND :endDate', {
            startDate,
            endDate,
        })
            .getRawOne();
        return parseFloat(result?.volume || '0');
    }
    async getTransactionCountByStatus() {
        const result = await this.repository
            .createQueryBuilder('transaction')
            .select('transaction.status', 'status')
            .addSelect('COUNT(*)', 'count')
            .groupBy('transaction.status')
            .getRawMany();
        return result.reduce((acc, row) => {
            acc[row.status] = parseInt(row.count, 10);
            return acc;
        }, {});
    }
    async getTransactionTimeSeries(days) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        const result = await this.repository
            .createQueryBuilder('transaction')
            .select('DATE(transaction.createdAt)', 'date')
            .addSelect('COUNT(*)', 'count')
            .addSelect('COALESCE(SUM(CASE WHEN transaction.status = :status THEN ABS(transaction.amount) ELSE 0 END), 0)', 'volume')
            .where('transaction.createdAt >= :startDate', { startDate })
            .setParameter('status', 'completed')
            .groupBy('DATE(transaction.createdAt)')
            .orderBy('date', 'ASC')
            .getRawMany();
        return result.map((row) => ({
            date: row.date,
            count: parseInt(row.count, 10),
            volume: parseFloat(row.volume || '0'),
        }));
    }
    async getTransactionCountByType() {
        const result = await this.repository
            .createQueryBuilder('transaction')
            .select('transaction.type', 'type')
            .addSelect('COUNT(*)', 'count')
            .groupBy('transaction.type')
            .getRawMany();
        return result.reduce((acc, row) => {
            acc[row.type] = parseInt(row.count, 10);
            return acc;
        }, {});
    }
};
exports.TransactionRepository = TransactionRepository;
exports.TransactionRepository = TransactionRepository = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(transaction_orm_entity_1.TransactionOrmEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        transaction_mapper_1.TransactionMapper])
], TransactionRepository);
//# sourceMappingURL=transaction.repository.js.map