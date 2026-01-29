import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TransactionMapper } from '../mappers/transaction.mapper';
import { TransactionOrmEntity } from '../orm-entities/transaction.orm-entity';
import { TransactionEntity } from '../../domain/entities/transaction.entity';
import { TransactionFilters } from '../../application/dto/requests';
import { Injectable } from '@nestjs/common';
import {
  validateSortColumn,
  validateSortOrder,
  escapeLikePattern,
  ALLOWED_SORT_COLUMNS,
} from '../../../../common/utils/sql-utils';

@Injectable()
export class TransactionRepository {
  constructor(
    @InjectRepository(TransactionOrmEntity)
    private readonly repository: Repository<TransactionOrmEntity>,
    private readonly mapper: TransactionMapper,
  ) {}

  async save(entity: TransactionEntity): Promise<TransactionEntity> {
    const ormEntity = this.mapper.toOrmEntity(entity);
    const savedOrmEntity = await this.repository.save(ormEntity);
    return this.mapper.toDomainEntity(savedOrmEntity);
  }

  async findById(id: string): Promise<TransactionEntity | null> {
    const ormEntity = await this.repository.findOne({
      where: { id },
    });
    if (!ormEntity) {
      return null;
    }
    return this.mapper.toDomainEntity(ormEntity);
  }

  async findByWalletId(walletId: string): Promise<TransactionEntity[]> {
    const ormEntities = await this.repository.find({
      where: { walletId },
      order: { createdAt: 'DESC' },
    });
    return ormEntities.map((ormEntity) =>
      this.mapper.toDomainEntity(ormEntity),
    );
  }

  async findByYellowCardRef(
    yellowCardRef: string,
  ): Promise<TransactionEntity | null> {
    const ormEntity = await this.repository.findOne({
      where: { yellowCardRef },
    });
    if (!ormEntity) {
      return null;
    }
    return this.mapper.toDomainEntity(ormEntity);
  }

  // Generic alias for provider reference lookup (decoupled from Yellow Card naming)
  async findByProviderRef(
    providerRef: string,
  ): Promise<TransactionEntity | null> {
    return this.findByYellowCardRef(providerRef);
  }

  async findPendingByWalletId(walletId: string): Promise<TransactionEntity[]> {
    const ormEntities = await this.repository.find({
      where: { walletId, status: 'pending' },
      order: { createdAt: 'DESC' },
    });
    return ormEntities.map((ormEntity) =>
      this.mapper.toDomainEntity(ormEntity),
    );
  }

  async findAll(): Promise<TransactionEntity[]> {
    const ormEntities = await this.repository.find({
      order: { createdAt: 'DESC' },
    });
    if (!ormEntities) {
      return [];
    }
    return ormEntities.map((ormEntity) =>
      this.mapper.toDomainEntity(ormEntity),
    );
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  /**
   * Update transaction by ID with partial data
   * Used for updating status, external references, and metadata
   */
  async update(
    id: string,
    data: Partial<{
      status: string;
      yellowCardRef: string | null;
      metadata: Record<string, unknown>;
    }>,
  ): Promise<void> {
    await this.repository.update(id, data);
  }

  /**
   * Update transaction status
   */
  async updateStatus(id: string, status: string): Promise<void> {
    await this.repository.update(id, { status });
  }

  /**
   * SECURITY: Get total transfer volume for a user since a given date
   * Used for KYC-based daily transfer limit enforcement
   * Note: This provides application-level limits on top of Blnk ledger
   */
  async getDailyTransferVolume(
    userId: string,
    sinceDate: Date,
  ): Promise<number> {
    // First get the user's wallet ID
    const result = await this.repository
      .createQueryBuilder('transaction')
      .innerJoin('wallets', 'wallet', 'wallet.id = transaction.walletId')
      .select('COALESCE(SUM(ABS(transaction.amount)), 0)', 'totalVolume')
      .where('wallet.userId = :userId', { userId })
      .andWhere('transaction.createdAt >= :sinceDate', { sinceDate })
      .andWhere('transaction.type IN (:...types)', {
        types: ['internal_transfer', 'external_transfer', 'withdrawal'],
      })
      .andWhere('transaction.status IN (:...statuses)', {
        statuses: ['completed', 'pending', 'processing'],
      })
      .getRawOne();

    return parseFloat(result?.totalVolume || '0');
  }

  /**
   * PERFORMANCE: Find transactions by wallet ID with database-level pagination
   * Fixes N+1 query issue by applying filters and pagination at the database level
   * Uses composite index: idx_transactions_wallet_date for optimal performance
   */
  async findByWalletIdPaginated(
    walletId: string,
    options: {
      type?: string;
      status?: string;
      limit: number;
      offset: number;
    },
  ): Promise<{ transactions: TransactionEntity[]; total: number }> {
    const query = this.repository
      .createQueryBuilder('transaction')
      .where('transaction.walletId = :walletId', { walletId })
      .orderBy('transaction.createdAt', 'DESC');

    // Apply optional filters
    if (options.type) {
      query.andWhere('transaction.type = :type', { type: options.type });
    }
    if (options.status) {
      query.andWhere('transaction.status = :status', {
        status: options.status,
      });
    }

    // Execute paginated query with count
    const [ormEntities, total] = await query
      .take(options.limit)
      .skip(options.offset)
      .getManyAndCount();

    return {
      transactions: ormEntities.map((orm) => this.mapper.toDomainEntity(orm)),
      total,
    };
  }

  /**
   * PERFORMANCE: Find transactions by wallet ID with advanced filtering
   * Supports type, status, date range, amount range, text search, and sorting
   * Uses database-level filtering and pagination for optimal performance
   */
  async findByWalletIdFiltered(
    walletId: string,
    filters: TransactionFilters,
  ): Promise<{ transactions: TransactionEntity[]; total: number }> {
    const query = this.repository
      .createQueryBuilder('tx')
      .where('tx.walletId = :walletId', { walletId });

    // Apply type filter
    if (filters.type) {
      query.andWhere('tx.type = :type', { type: filters.type });
    }

    // Apply status filter
    if (filters.status) {
      query.andWhere('tx.status = :status', { status: filters.status });
    }

    // Apply date range filters
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

    // Apply amount range filters
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

    // Apply text search (ILIKE for case-insensitive search)
    // SECURITY: Escape LIKE wildcards to prevent pattern injection
    if (filters.search) {
      const escapedSearch = escapeLikePattern(filters.search);
      const searchPattern = `%${escapedSearch}%`;
      query.andWhere(
        '(tx.yellowCardRef ILIKE :search OR tx.recipientPhone ILIKE :search OR tx.recipientAddress ILIKE :search)',
        { search: searchPattern },
      );
    }

    // Apply sorting
    // SECURITY: Validate sort column against allowlist to prevent SQL injection
    const validSortBy = validateSortColumn(
      filters.sortBy,
      ALLOWED_SORT_COLUMNS.transaction,
      'createdAt',
    );
    const validSortOrder = validateSortOrder(filters.sortOrder, 'DESC');
    query.orderBy(`tx.${validSortBy}`, validSortOrder);

    // Execute paginated query with count
    const [ormEntities, total] = await query
      .take(filters.limit)
      .skip(filters.offset)
      .getManyAndCount();

    return {
      transactions: ormEntities.map((orm) => this.mapper.toDomainEntity(orm)),
      total,
    };
  }

  /**
   * Find transactions by wallet ID with optional date range filtering
   * Used for export functionality
   */
  async findByWalletIdWithDateRange(
    walletId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<TransactionEntity[]> {
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

  /**
   * ADMIN: Get comprehensive transaction statistics
   * Used for admin dashboard metrics
   */
  async getTransactionStats(): Promise<{
    total: number;
    pending: number;
    completed: number;
    failed: number;
    totalVolume: number;
    todayVolume: number;
  }> {
    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );

    // Get all stats in parallel for performance
    const [countStats, volumeStats, todayVolumeStats] = await Promise.all([
      // Count by status
      this.repository
        .createQueryBuilder('transaction')
        .select('transaction.status', 'status')
        .addSelect('COUNT(*)', 'count')
        .groupBy('transaction.status')
        .getRawMany(),

      // Total volume (all completed transactions)
      this.repository
        .createQueryBuilder('transaction')
        .select('COALESCE(SUM(ABS(transaction.amount)), 0)', 'totalVolume')
        .where('transaction.status = :status', { status: 'completed' })
        .getRawOne(),

      // Today's volume
      this.repository
        .createQueryBuilder('transaction')
        .select('COALESCE(SUM(ABS(transaction.amount)), 0)', 'todayVolume')
        .where('transaction.status = :status', { status: 'completed' })
        .andWhere('transaction.createdAt >= :todayStart', { todayStart })
        .getRawOne(),
    ]);

    // Aggregate counts by status
    const statusCounts = countStats.reduce(
      (acc, row) => {
        acc[row.status] = parseInt(row.count, 10);
        return acc;
      },
      {} as Record<string, number>,
    );

    const total: number = Object.values(statusCounts).reduce(
      (sum, count) => sum + count,
      0,
    );
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

  /**
   * ADMIN: Get total transaction volume for a date range
   * Used for time-series analytics
   */
  async getVolumeByDateRange(startDate: Date, endDate: Date): Promise<number> {
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

  /**
   * ADMIN: Get transaction count grouped by status
   * Used for status distribution charts
   */
  async getTransactionCountByStatus(): Promise<Record<string, number>> {
    const result = await this.repository
      .createQueryBuilder('transaction')
      .select('transaction.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('transaction.status')
      .getRawMany();

    return result.reduce(
      (acc, row) => {
        acc[row.status] = parseInt(row.count, 10);
        return acc;
      },
      {} as Record<string, number>,
    );
  }

  /**
   * ADMIN: Get transaction time-series data for charts
   * Returns daily transaction count and volume for the last N days
   */
  async getTransactionTimeSeries(
    days: number,
  ): Promise<{ date: string; count: number; volume: number }[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const result = await this.repository
      .createQueryBuilder('transaction')
      .select('DATE(transaction.createdAt)', 'date')
      .addSelect('COUNT(*)', 'count')
      .addSelect(
        'COALESCE(SUM(CASE WHEN transaction.status = :status THEN ABS(transaction.amount) ELSE 0 END), 0)',
        'volume',
      )
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

  /**
   * ADMIN: Get transaction count by type
   * Used for transaction type distribution
   */
  async getTransactionCountByType(): Promise<Record<string, number>> {
    const result = await this.repository
      .createQueryBuilder('transaction')
      .select('transaction.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .groupBy('transaction.type')
      .getRawMany();

    return result.reduce(
      (acc, row) => {
        acc[row.type] = parseInt(row.count, 10);
        return acc;
      },
      {} as Record<string, number>,
    );
  }
}
