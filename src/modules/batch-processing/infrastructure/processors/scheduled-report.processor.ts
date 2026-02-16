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

interface ScheduledReportPayload {
  reportType:
    | 'transaction'
    | 'user_activity'
    | 'kyc_summary'
    | 'compliance'
    | 'revenue';
  format: 'csv' | 'xlsx' | 'pdf' | 'json';
  dateRange: {
    startDate: string;
    endDate: string;
  };
  filters?: Record<string, any>;
  recipients?: string[]; // Email addresses
  includeCharts?: boolean;
  groupBy?: string[];
}

@Injectable()
export class ScheduledReportProcessor implements IBatchProcessor {
  private readonly logger = new Logger(ScheduledReportProcessor.name);
  private readonly reportsDir = path.join(process.cwd(), 'reports');

  constructor(
    @InjectRepository(UserOrmEntity)
    private readonly userRepository: Repository<UserOrmEntity>,
    @InjectRepository(TransactionOrmEntity)
    private readonly transactionRepository: Repository<TransactionOrmEntity>,
  ) {
    if (!fs.existsSync(this.reportsDir)) {
      fs.mkdirSync(this.reportsDir, { recursive: true });
    }
  }

  async process(job: BatchJob): Promise<BatchProcessorResult> {
    this.logger.log(`Processing scheduled report job: ${job.id}`);

    const payload = job.payload as ScheduledReportPayload;
    const results: BatchProcessorResult = {
      success: true,
      processedCount: 0,
      successCount: 0,
      failedCount: 0,
      skippedCount: 0,
      results: {
        reportUrl: null,
        rowCount: 0,
        generatedAt: new Date().toISOString(),
      },
    };

    try {
      // Fetch data for report
      const data = await this.fetchReportData(payload);
      results.results.rowCount = data.length;

      // Generate report file
      const reportUrl = await this.generateReportFile(payload, data);
      results.results.reportUrl = reportUrl;

      // Send to recipients if specified
      if (payload.recipients && payload.recipients.length > 0) {
        await this.sendReportToRecipients(
          payload.recipients,
          reportUrl,
          payload.reportType,
        );
      }

      results.processedCount = 1;
      results.successCount = 1;
      results.success = true;
    } catch (error) {
      this.logger.error(`Failed to generate report: ${error.message}`);
      results.processedCount = 1;
      results.failedCount = 1;
      results.success = false;
      results.errors = [
        {
          item: 'report',
          error: error.message,
        },
      ];
    }

    return results;
  }

  async validatePayload(payload: any): Promise<boolean> {
    const data = payload as ScheduledReportPayload;

    if (
      !data.reportType ||
      ![
        'transaction',
        'user_activity',
        'kyc_summary',
        'compliance',
        'revenue',
      ].includes(data.reportType)
    ) {
      throw new Error('Invalid report type');
    }

    if (!data.format || !['csv', 'xlsx', 'pdf', 'json'].includes(data.format)) {
      throw new Error('Invalid format');
    }

    if (
      !data.dateRange ||
      !data.dateRange.startDate ||
      !data.dateRange.endDate
    ) {
      throw new Error('Date range with startDate and endDate is required');
    }

    return true;
  }

  getEstimatedDuration(_itemCount: number): number {
    // Reports typically take 10-30 seconds depending on data volume
    return 20;
  }

  private async fetchReportData(
    payload: ScheduledReportPayload,
  ): Promise<any[]> {
    const dateRange = {
      start: new Date(payload.dateRange.startDate),
      end: new Date(payload.dateRange.endDate),
    };

    switch (payload.reportType) {
      case 'transaction': {
        const qb = this.transactionRepository.createQueryBuilder('tx');
        qb.where('tx.createdAt BETWEEN :start AND :end', dateRange);

        if (payload.filters?.status) {
          qb.andWhere('tx.status = :status', {
            status: payload.filters.status,
          });
        }
        if (payload.filters?.type) {
          qb.andWhere('tx.type = :type', { type: payload.filters.type });
        }

        if (payload.groupBy?.includes('status')) {
          qb.select('tx.status', 'status')
            .addSelect('COUNT(*)', 'count')
            .addSelect('SUM(tx.amount)', 'totalAmount')
            .groupBy('tx.status');
          return qb.getRawMany();
        }

        return qb.orderBy('tx.createdAt', 'DESC').take(50000).getMany();
      }

      case 'user_activity': {
        const users = await this.userRepository
          .createQueryBuilder('user')
          .where('user.createdAt BETWEEN :start AND :end', dateRange)
          .select([
            'user.id',
            'user.phone',
            'user.kycStatus',
            'user.countryCode',
            'user.status',
            'user.createdAt',
          ])
          .orderBy('user.createdAt', 'DESC')
          .getMany();
        return users;
      }

      case 'kyc_summary': {
        return this.userRepository
          .createQueryBuilder('user')
          .select('user.kycStatus', 'kycStatus')
          .addSelect('user.countryCode', 'country')
          .addSelect('COUNT(*)', 'count')
          .where('user.createdAt BETWEEN :start AND :end', dateRange)
          .groupBy('user.kycStatus')
          .addGroupBy('user.countryCode')
          .getRawMany();
      }

      case 'revenue':
      case 'compliance': {
        // Aggregate transaction data
        return this.transactionRepository
          .createQueryBuilder('tx')
          .select('tx.type', 'type')
          .addSelect('tx.status', 'status')
          .addSelect('COUNT(*)', 'count')
          .addSelect('SUM(tx.amount)', 'totalAmount')
          .where('tx.createdAt BETWEEN :start AND :end', dateRange)
          .groupBy('tx.type')
          .addGroupBy('tx.status')
          .getRawMany();
      }

      default:
        return [];
    }
  }

  private async generateReportFile(
    payload: ScheduledReportPayload,
    data: any[],
  ): Promise<string> {
    const timestamp = Date.now();
    const filename = `${payload.reportType}_${timestamp}.${payload.format}`;
    const filePath = path.join(this.reportsDir, filename);

    if (payload.format === 'json') {
      const content = JSON.stringify(
        {
          reportType: payload.reportType,
          dateRange: payload.dateRange,
          generatedAt: new Date().toISOString(),
          rowCount: data.length,
          data,
        },
        null,
        2,
      );
      fs.writeFileSync(filePath, content, 'utf-8');
    } else if (payload.format === 'csv') {
      if (data.length === 0) {
        fs.writeFileSync(filePath, '', 'utf-8');
      } else {
        const headers = Object.keys(data[0]);
        const lines = [headers.join(',')];
        for (const row of data) {
          const values = headers.map((h) => {
            const val = row[h];
            if (val === null || val === undefined) return '';
            const str = String(val);
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
              return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
          });
          lines.push(values.join(','));
        }
        fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
      }
    } else {
      // Fallback to JSON for unsupported formats
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    }

    this.logger.log(
      `Report generated: ${filePath} (${data.length} rows)`,
    );

    // In production, upload to S3 and return signed URL
    return filePath;
  }

  private async sendReportToRecipients(
    recipients: string[],
    reportUrl: string,
    reportType: string,
  ): Promise<void> {
    // Log for now; in production wire to email service
    this.logger.log(
      `Report "${reportType}" available at ${reportUrl} — notifying ${recipients.length} recipients: ${recipients.join(', ')}`,
    );
  }
}
