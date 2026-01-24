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
var ReportsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const orm_entities_1 = require("../../../transaction/infrastructure/orm-entities");
const orm_entities_2 = require("../../../user/infrastructure/orm-entities");
const orm_entities_3 = require("../../../wallet/infrastructure/orm-entities");
let ReportsService = ReportsService_1 = class ReportsService {
    constructor(transactionRepository, userRepository, walletRepository) {
        this.transactionRepository = transactionRepository;
        this.userRepository = userRepository;
        this.walletRepository = walletRepository;
        this.logger = new common_1.Logger(ReportsService_1.name);
    }
    async getTransactionSummary(dateRange) {
        const queryBuilder = this.transactionRepository.createQueryBuilder('tx');
        if (dateRange) {
            queryBuilder.where('tx.createdAt BETWEEN :startDate AND :endDate', {
                startDate: dateRange.startDate,
                endDate: dateRange.endDate,
            });
        }
        const totalsResult = await queryBuilder
            .select('COUNT(*)', 'totalCount')
            .addSelect('COALESCE(SUM(tx.amount), 0)', 'totalVolume')
            .addSelect('COALESCE(AVG(tx.amount), 0)', 'avgSize')
            .getRawOne();
        const byStatusQueryBuilder = this.transactionRepository.createQueryBuilder('tx');
        if (dateRange) {
            byStatusQueryBuilder.where('tx.createdAt BETWEEN :startDate AND :endDate', {
                startDate: dateRange.startDate,
                endDate: dateRange.endDate,
            });
        }
        const byStatus = await byStatusQueryBuilder
            .select('tx.status', 'status')
            .addSelect('COUNT(*)', 'count')
            .addSelect('COALESCE(SUM(tx.amount), 0)', 'volume')
            .groupBy('tx.status')
            .getRawMany();
        const byTypeQueryBuilder = this.transactionRepository.createQueryBuilder('tx');
        if (dateRange) {
            byTypeQueryBuilder.where('tx.createdAt BETWEEN :startDate AND :endDate', {
                startDate: dateRange.startDate,
                endDate: dateRange.endDate,
            });
        }
        const byType = await byTypeQueryBuilder
            .select('tx.type', 'type')
            .addSelect('COUNT(*)', 'count')
            .addSelect('COALESCE(SUM(tx.amount), 0)', 'volume')
            .groupBy('tx.type')
            .getRawMany();
        const byCurrencyQueryBuilder = this.transactionRepository.createQueryBuilder('tx');
        if (dateRange) {
            byCurrencyQueryBuilder.where('tx.createdAt BETWEEN :startDate AND :endDate', {
                startDate: dateRange.startDate,
                endDate: dateRange.endDate,
            });
        }
        const byCurrency = await byCurrencyQueryBuilder
            .select('tx.currency', 'currency')
            .addSelect('COUNT(*)', 'count')
            .addSelect('COALESCE(SUM(tx.amount), 0)', 'volume')
            .groupBy('tx.currency')
            .getRawMany();
        return {
            totalCount: parseInt(totalsResult.totalCount, 10),
            totalVolume: parseFloat(totalsResult.totalVolume),
            avgTransactionSize: parseFloat(totalsResult.avgSize),
            byStatus: byStatus.map((s) => ({
                status: s.status,
                count: parseInt(s.count, 10),
                volume: parseFloat(s.volume),
            })),
            byType: byType.map((t) => ({
                type: t.type,
                count: parseInt(t.count, 10),
                volume: parseFloat(t.volume),
            })),
            byCurrency: byCurrency.map((c) => ({
                currency: c.currency,
                count: parseInt(c.count, 10),
                volume: parseFloat(c.volume),
            })),
        };
    }
    async getDailyTransactionReport(dateRange) {
        const result = await this.transactionRepository
            .createQueryBuilder('tx')
            .select('DATE(tx.createdAt) as date')
            .addSelect('COUNT(*)', 'totalCount')
            .addSelect('COALESCE(SUM(tx.amount), 0)', 'totalVolume')
            .addSelect("COUNT(*) FILTER (WHERE tx.type = 'deposit')", 'depositCount')
            .addSelect("COALESCE(SUM(tx.amount) FILTER (WHERE tx.type = 'deposit'), 0)", 'depositVolume')
            .addSelect("COUNT(*) FILTER (WHERE tx.type IN ('transfer_internal', 'transfer_external'))", 'transferCount')
            .addSelect("COALESCE(SUM(tx.amount) FILTER (WHERE tx.type IN ('transfer_internal', 'transfer_external')), 0)", 'transferVolume')
            .addSelect("COUNT(*) FILTER (WHERE tx.type = 'withdrawal')", 'withdrawalCount')
            .addSelect("COALESCE(SUM(tx.amount) FILTER (WHERE tx.type = 'withdrawal'), 0)", 'withdrawalVolume')
            .where('tx.createdAt BETWEEN :startDate AND :endDate', {
            startDate: dateRange.startDate,
            endDate: dateRange.endDate,
        })
            .groupBy('DATE(tx.createdAt)')
            .orderBy('date', 'ASC')
            .getRawMany();
        return result.map((row) => ({
            date: row.date,
            totalCount: parseInt(row.totalCount, 10),
            totalVolume: parseFloat(row.totalVolume),
            deposits: {
                count: parseInt(row.depositCount, 10),
                volume: parseFloat(row.depositVolume),
            },
            transfers: {
                count: parseInt(row.transferCount, 10),
                volume: parseFloat(row.transferVolume),
            },
            withdrawals: {
                count: parseInt(row.withdrawalCount, 10),
                volume: parseFloat(row.withdrawalVolume),
            },
        }));
    }
    async getTopUsersByVolume(dateRange, limit = 20) {
        const queryBuilder = this.transactionRepository
            .createQueryBuilder('tx')
            .leftJoin(orm_entities_3.WalletOrmEntity, 'wallet', 'wallet.id = tx.walletId')
            .leftJoin(orm_entities_2.UserOrmEntity, 'user', 'user.id = wallet.userId')
            .select('user.id', 'userId')
            .addSelect('user.phone', 'phone')
            .addSelect('user.firstName', 'firstName')
            .addSelect('user.lastName', 'lastName')
            .addSelect('COUNT(tx.id)', 'totalTransactions')
            .addSelect('COALESCE(SUM(tx.amount), 0)', 'totalVolume')
            .addSelect('MAX(tx.createdAt)', 'lastActivityAt')
            .where("tx.status = 'completed'");
        if (dateRange) {
            queryBuilder.andWhere('tx.createdAt BETWEEN :startDate AND :endDate', {
                startDate: dateRange.startDate,
                endDate: dateRange.endDate,
            });
        }
        const result = await queryBuilder
            .groupBy('user.id')
            .addGroupBy('user.phone')
            .addGroupBy('user.firstName')
            .addGroupBy('user.lastName')
            .orderBy('totalVolume', 'DESC')
            .limit(limit)
            .getRawMany();
        return result.map((row) => ({
            userId: row.userId,
            phone: row.phone,
            firstName: row.firstName,
            lastName: row.lastName,
            totalTransactions: parseInt(row.totalTransactions, 10),
            totalVolume: parseFloat(row.totalVolume),
            lastActivityAt: row.lastActivityAt ? new Date(row.lastActivityAt) : null,
        }));
    }
    async getUserActivitySummary(userId, dateRange) {
        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user) {
            throw new Error(`User ${userId} not found`);
        }
        const wallets = await this.walletRepository.find({
            where: { userId },
        });
        const walletIds = wallets.map((w) => w.id);
        const queryBuilder = this.transactionRepository
            .createQueryBuilder('tx')
            .where('tx.walletId IN (:...walletIds)', { walletIds });
        if (dateRange) {
            queryBuilder.andWhere('tx.createdAt BETWEEN :startDate AND :endDate', {
                startDate: dateRange.startDate,
                endDate: dateRange.endDate,
            });
        }
        const totals = await this.transactionRepository
            .createQueryBuilder('tx')
            .where('tx.walletId IN (:...walletIds)', { walletIds })
            .select('COUNT(*)', 'totalCount')
            .addSelect('COALESCE(SUM(tx.amount), 0)', 'totalVolume')
            .addSelect('COALESCE(AVG(tx.amount), 0)', 'avgSize')
            .getRawOne();
        const byStatus = await this.transactionRepository
            .createQueryBuilder('tx')
            .where('tx.walletId IN (:...walletIds)', { walletIds })
            .select('tx.status', 'status')
            .addSelect('COUNT(*)', 'count')
            .addSelect('COALESCE(SUM(tx.amount), 0)', 'volume')
            .groupBy('tx.status')
            .getRawMany();
        const byType = await this.transactionRepository
            .createQueryBuilder('tx')
            .where('tx.walletId IN (:...walletIds)', { walletIds })
            .select('tx.type', 'type')
            .addSelect('COUNT(*)', 'count')
            .addSelect('COALESCE(SUM(tx.amount), 0)', 'volume')
            .groupBy('tx.type')
            .getRawMany();
        const recentTransactions = await this.transactionRepository.find({
            where: walletIds.map((id) => ({ walletId: id })),
            order: { createdAt: 'DESC' },
            take: 20,
        });
        return {
            user: {
                id: user.id,
                phone: user.phone,
                name: user.firstName || user.lastName
                    ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
                    : null,
            },
            summary: {
                totalCount: parseInt(totals.totalCount, 10),
                totalVolume: parseFloat(totals.totalVolume),
                avgTransactionSize: parseFloat(totals.avgSize),
                byStatus: byStatus.map((s) => ({
                    status: s.status,
                    count: parseInt(s.count, 10),
                    volume: parseFloat(s.volume),
                })),
                byType: byType.map((t) => ({
                    type: t.type,
                    count: parseInt(t.count, 10),
                    volume: parseFloat(t.volume),
                })),
                byCurrency: [],
            },
            recentTransactions,
        };
    }
    async getReconciliationReport(dateRange) {
        const deposits = await this.transactionRepository
            .createQueryBuilder('tx')
            .where('tx.createdAt BETWEEN :startDate AND :endDate', {
            startDate: dateRange.startDate,
            endDate: dateRange.endDate,
        })
            .andWhere("tx.type = 'deposit'")
            .andWhere("tx.status = 'completed'")
            .select('COUNT(*)', 'count')
            .addSelect('COALESCE(SUM(tx.amount), 0)', 'volume')
            .getRawOne();
        const withdrawals = await this.transactionRepository
            .createQueryBuilder('tx')
            .where('tx.createdAt BETWEEN :startDate AND :endDate', {
            startDate: dateRange.startDate,
            endDate: dateRange.endDate,
        })
            .andWhere("tx.type = 'withdrawal'")
            .andWhere("tx.status = 'completed'")
            .select('COUNT(*)', 'count')
            .addSelect('COALESCE(SUM(tx.amount), 0)', 'volume')
            .getRawOne();
        const transfers = await this.transactionRepository
            .createQueryBuilder('tx')
            .where('tx.createdAt BETWEEN :startDate AND :endDate', {
            startDate: dateRange.startDate,
            endDate: dateRange.endDate,
        })
            .andWhere("tx.type IN ('transfer_internal', 'transfer_external')")
            .andWhere("tx.status = 'completed'")
            .select('COUNT(*)', 'count')
            .addSelect('COALESCE(SUM(tx.amount), 0)', 'volume')
            .getRawOne();
        const pending = await this.transactionRepository
            .createQueryBuilder('tx')
            .where('tx.createdAt BETWEEN :startDate AND :endDate', {
            startDate: dateRange.startDate,
            endDate: dateRange.endDate,
        })
            .andWhere("tx.status IN ('pending', 'processing')")
            .select('COUNT(*)', 'count')
            .addSelect('COALESCE(SUM(tx.amount), 0)', 'volume')
            .getRawOne();
        const failed = await this.transactionRepository
            .createQueryBuilder('tx')
            .where('tx.createdAt BETWEEN :startDate AND :endDate', {
            startDate: dateRange.startDate,
            endDate: dateRange.endDate,
        })
            .andWhere("tx.status = 'failed'")
            .select('COUNT(*)', 'count')
            .addSelect('COALESCE(SUM(tx.amount), 0)', 'volume')
            .getRawOne();
        const depositVolume = parseFloat(deposits.volume);
        const withdrawalVolume = parseFloat(withdrawals.volume);
        return {
            period: dateRange,
            totalDeposits: {
                count: parseInt(deposits.count, 10),
                volume: depositVolume,
            },
            totalWithdrawals: {
                count: parseInt(withdrawals.count, 10),
                volume: withdrawalVolume,
            },
            totalTransfers: {
                count: parseInt(transfers.count, 10),
                volume: parseFloat(transfers.volume),
            },
            pendingTransactions: {
                count: parseInt(pending.count, 10),
                volume: parseFloat(pending.volume),
            },
            failedTransactions: {
                count: parseInt(failed.count, 10),
                volume: parseFloat(failed.volume),
            },
            netFlow: depositVolume - withdrawalVolume,
        };
    }
    async exportTransactions(dateRange, format = 'json') {
        const transactions = await this.transactionRepository.find({
            where: {
                createdAt: (0, typeorm_2.Between)(dateRange.startDate, dateRange.endDate),
            },
            order: { createdAt: 'DESC' },
        });
        const filename = `transactions_${dateRange.startDate.toISOString().split('T')[0]}_${dateRange.endDate.toISOString().split('T')[0]}`;
        if (format === 'csv') {
            const headers = [
                'ID',
                'Type',
                'Amount',
                'Currency',
                'Status',
                'Created At',
                'Completed At',
            ];
            const rows = transactions.map((tx) => [
                tx.id,
                tx.type,
                tx.amount,
                tx.currency,
                tx.status,
                tx.createdAt.toISOString(),
                tx.completedAt?.toISOString() || '',
            ]);
            const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
            return { data: csv, filename: `${filename}.csv` };
        }
        return {
            data: JSON.stringify(transactions, null, 2),
            filename: `${filename}.json`,
        };
    }
};
exports.ReportsService = ReportsService;
exports.ReportsService = ReportsService = ReportsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(orm_entities_1.TransactionOrmEntity)),
    __param(1, (0, typeorm_1.InjectRepository)(orm_entities_2.UserOrmEntity)),
    __param(2, (0, typeorm_1.InjectRepository)(orm_entities_3.WalletOrmEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], ReportsService);
//# sourceMappingURL=reports.service.js.map