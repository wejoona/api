import { Injectable, NotFoundException } from '@nestjs/common';
import { WalletRepository } from '../../infrastructure/repositories/wallet.repository';
import { TransactionRepository } from '../../../transaction/infrastructure/repositories/transaction.repository';

export interface ExportTransactionsInput {
  userId: string;
  startDate?: Date;
  endDate?: Date;
  format: 'csv' | 'json';
}

export interface ExportTransactionsOutput {
  data: string | object;
  filename: string;
  contentType: string;
}

@Injectable()
export class ExportTransactionsUseCase {
  constructor(
    private readonly walletRepository: WalletRepository,
    private readonly transactionRepository: TransactionRepository,
  ) {}

  async execute(input: ExportTransactionsInput): Promise<ExportTransactionsOutput> {
    // Find user's wallet
    const wallet = await this.walletRepository.findByUserId(input.userId);
    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    // Fetch transactions with date range
    const transactions = await this.transactionRepository.findByWalletIdWithDateRange(
      wallet.id,
      input.startDate,
      input.endDate,
    );

    // Generate filename with date range
    const dateRangeStr = this.getDateRangeString(input.startDate, input.endDate);
    const timestamp = new Date().toISOString().split('T')[0];

    if (input.format === 'json') {
      return {
        data: {
          walletId: wallet.id,
          exportDate: new Date().toISOString(),
          startDate: input.startDate?.toISOString() || null,
          endDate: input.endDate?.toISOString() || null,
          totalTransactions: transactions.length,
          transactions: transactions.map(tx => ({
            id: tx.id,
            date: tx.createdAt.toISOString(),
            type: tx.type,
            amount: tx.amount,
            currency: tx.currency,
            status: tx.status,
            reference: tx.yellowCardRef || tx.id,
            description: this.getTransactionDescription(tx.type),
            completedAt: tx.completedAt?.toISOString() || null,
          })),
        },
        filename: `transactions_${dateRangeStr}_${timestamp}.json`,
        contentType: 'application/json',
      };
    }

    // Generate CSV
    const csv = this.generateCSV(transactions);
    return {
      data: csv,
      filename: `transactions_${dateRangeStr}_${timestamp}.csv`,
      contentType: 'text/csv',
    };
  }

  private generateCSV(transactions: any[]): string {
    // CSV Headers
    const headers = [
      'Date',
      'Type',
      'Description',
      'Amount',
      'Currency',
      'Status',
      'Reference',
      'Completed At',
    ];

    // CSV Rows
    const rows = transactions.map(tx => [
      tx.createdAt.toISOString(),
      tx.type,
      this.getTransactionDescription(tx.type),
      tx.amount.toString(),
      tx.currency,
      tx.status,
      tx.yellowCardRef || tx.id,
      tx.completedAt ? tx.completedAt.toISOString() : '',
    ]);

    // Combine headers and rows
    const allRows = [headers, ...rows];

    // Convert to CSV format (properly escape commas and quotes)
    return allRows.map(row =>
      row.map(cell => {
        const cellStr = String(cell);
        // Escape quotes and wrap in quotes if contains comma, quote, or newline
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      }).join(',')
    ).join('\n');
  }

  private getTransactionDescription(type: string): string {
    const descriptions: Record<string, string> = {
      'deposit': 'Deposit (On-ramp)',
      'withdrawal': 'Withdrawal (Off-ramp)',
      'internal_transfer': 'Transfer to User',
      'external_transfer': 'Transfer to Address',
      'transfer_internal': 'Transfer to User',
      'transfer_external': 'Transfer to Address',
    };
    return descriptions[type] || type;
  }

  private getDateRangeString(startDate?: Date, endDate?: Date): string {
    if (startDate && endDate) {
      return `${this.formatDate(startDate)}_to_${this.formatDate(endDate)}`;
    } else if (startDate) {
      return `from_${this.formatDate(startDate)}`;
    } else if (endDate) {
      return `until_${this.formatDate(endDate)}`;
    }
    return 'all_time';
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }
}
