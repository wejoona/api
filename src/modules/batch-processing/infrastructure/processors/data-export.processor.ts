import { Injectable, Logger } from '@nestjs/common';
import {
  IBatchProcessor,
  BatchProcessorResult,
} from '../../domain/interfaces/batch-processor.interface';
import { BatchJob } from '../../domain/entities/batch-job.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { UserOrmEntity } from '../../../user/infrastructure/orm-entities/user.orm-entity';
import { TransactionOrmEntity } from '../../../transaction/infrastructure/orm-entities/transaction.orm-entity';
import * as fs from 'fs';
import * as path from 'path';

interface DataExportPayload {
  exportType:
    | 'user_data'
    | 'transaction_history'
    | 'wallet_statements'
    | 'kyc_documents'
    | 'full_account';
  userId?: string;
  userIds?: string[];
  format: 'json' | 'csv' | 'xlsx';
  includeAttachments?: boolean;
  dateRange?: {
    startDate: string;
    endDate: string;
  };
  encryption?: {
    enabled: boolean;
    password?: string;
  };
}

@Injectable()
export class DataExportProcessor implements IBatchProcessor {
  private readonly logger = new Logger(DataExportProcessor.name);
  private readonly exportDir = path.join(process.cwd(), 'exports');

  constructor(
    @InjectRepository(UserOrmEntity)
    private readonly userRepository: Repository<UserOrmEntity>,
    @InjectRepository(TransactionOrmEntity)
    private readonly transactionRepository: Repository<TransactionOrmEntity>,
  ) {
    // Ensure export directory exists
    if (!fs.existsSync(this.exportDir)) {
      fs.mkdirSync(this.exportDir, { recursive: true });
    }
  }

  async process(job: BatchJob): Promise<BatchProcessorResult> {
    this.logger.log(`Processing data export job: ${job.id}`);

    const payload = job.payload as DataExportPayload;
    const results: BatchProcessorResult = {
      success: true,
      processedCount: 0,
      successCount: 0,
      failedCount: 0,
      skippedCount: 0,
      errors: [],
      results: {
        exportFiles: [],
        totalSize: 0,
      },
    };

    const targetUsers = this.getTargetUsers(payload);

    for (const userId of targetUsers) {
      try {
        // Export data for user
        const exportData = await this.exportUserData(userId, payload);

        // Generate export file
        const fileUrl = await this.generateExportFile(
          userId,
          exportData,
          payload,
        );

        results.processedCount++;
        results.successCount++;
        results.results.exportFiles.push({
          userId,
          fileUrl,
          size: exportData.size || 0,
        });
        results.results.totalSize += exportData.size || 0;
      } catch (error) {
        this.logger.error(
          `Failed to export data for user ${userId}: ${error.message}`,
        );
        results.processedCount++;
        results.failedCount++;
        results.errors.push({
          item: userId,
          error: error.message,
        });
      }
    }

    results.success = results.failedCount === 0;
    return results;
  }

  async validatePayload(payload: any): Promise<boolean> {
    const data = payload as DataExportPayload;

    if (!data.exportType) {
      throw new Error('Export type is required');
    }

    if (!data.userId && !data.userIds) {
      throw new Error('Either userId or userIds must be provided');
    }

    if (!data.format || !['json', 'csv', 'xlsx'].includes(data.format)) {
      throw new Error('Invalid format');
    }

    if (data.encryption?.enabled && !data.encryption?.password) {
      throw new Error(
        'Encryption password is required when encryption is enabled',
      );
    }

    return true;
  }

  getEstimatedDuration(itemCount: number): number {
    // Estimate 5 seconds per user export
    return itemCount * 5;
  }

  private getTargetUsers(payload: DataExportPayload): string[] {
    if (payload.userId) {
      return [payload.userId];
    }
    return payload.userIds || [];
  }

  private async exportUserData(
    userId: string,
    payload: DataExportPayload,
  ): Promise<any> {
    const data: Record<string, any> = {};

    // Fetch user profile
    if (
      payload.exportType === 'user_data' ||
      payload.exportType === 'full_account'
    ) {
      const user = await this.userRepository.findOne({
        where: { id: userId },
      });
      if (user) {
        data.profile = {
          id: user.id,
          phone: user.phone,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          countryCode: user.countryCode,
          kycStatus: user.kycStatus,
          role: user.role,
          status: user.status,
          preferredLocale: user.preferredLocale,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        };
      }
    }

    // Fetch transactions
    if (
      payload.exportType === 'transaction_history' ||
      payload.exportType === 'full_account' ||
      payload.exportType === 'wallet_statements'
    ) {
      const whereClause: any = [
        { walletId: userId },
        { recipientWalletId: userId },
      ];

      if (payload.dateRange) {
        const dateFilter = Between(
          new Date(payload.dateRange.startDate),
          new Date(payload.dateRange.endDate),
        );
        whereClause[0].createdAt = dateFilter;
        whereClause[1].createdAt = dateFilter;
      }

      const transactions = await this.transactionRepository.find({
        where: whereClause,
        order: { createdAt: 'DESC' },
        take: 10000, // Safety limit
      });

      data.transactions = transactions.map((tx) => ({
        id: tx.id,
        type: tx.type,
        status: tx.status,
        amount: tx.amount,
        currency: tx.currency,
        walletId: tx.walletId,
        recipientWalletId: tx.recipientWalletId,
        failureReason: tx.failureReason,
        createdAt: tx.createdAt,
      }));
    }

    const jsonStr = JSON.stringify(data);
    return {
      userId,
      data,
      size: Buffer.byteLength(jsonStr, 'utf-8'),
    };
  }

  private async generateExportFile(
    userId: string,
    exportData: any,
    payload: DataExportPayload,
  ): Promise<string> {
    const timestamp = Date.now();
    const filename = `${userId}_${timestamp}.${payload.format}`;
    const filePath = path.join(this.exportDir, filename);

    if (payload.format === 'json') {
      const content = JSON.stringify(exportData.data, null, 2);
      fs.writeFileSync(filePath, content, 'utf-8');
    } else if (payload.format === 'csv') {
      // Convert each data section to CSV
      const csvParts: string[] = [];

      for (const [section, records] of Object.entries(exportData.data)) {
        if (Array.isArray(records) && records.length > 0) {
          const headers = Object.keys(records[0]);
          csvParts.push(`# ${section}`);
          csvParts.push(headers.join(','));
          for (const record of records) {
            const row = headers.map((h) => {
              const val = record[h];
              if (val === null || val === undefined) return '';
              const str = String(val);
              // Escape CSV values containing commas or quotes
              if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                return `"${str.replace(/"/g, '""')}"`;
              }
              return str;
            });
            csvParts.push(row.join(','));
          }
          csvParts.push('');
        } else if (records && typeof records === 'object' && !Array.isArray(records)) {
          csvParts.push(`# ${section}`);
          const obj = records as Record<string, any>;
          csvParts.push('field,value');
          for (const [key, value] of Object.entries(obj)) {
            csvParts.push(`${key},"${String(value ?? '').replace(/"/g, '""')}"`);
          }
          csvParts.push('');
        }
      }

      fs.writeFileSync(filePath, csvParts.join('\n'), 'utf-8');
    } else {
      // xlsx not supported without additional dependency - fall back to JSON
      const content = JSON.stringify(exportData.data, null, 2);
      fs.writeFileSync(filePath, content, 'utf-8');
    }

    this.logger.log(`Export file generated: ${filePath}`);

    // In production, upload to S3 and return signed URL
    // For now, return local file path
    return filePath;
  }
}
