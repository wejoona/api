import { Response } from 'express';
import { ReportsService, TransactionSummary, DailyTransactionReport, UserActivityReport, ReconciliationReport } from '../services/reports.service';
declare class DateRangeQueryDto {
    startDate?: string;
    endDate?: string;
}
declare class ExportQueryDto {
    startDate: string;
    endDate: string;
    format?: 'json' | 'csv';
}
export declare class ReportsController {
    private readonly reportsService;
    constructor(reportsService: ReportsService);
    private parseDateRange;
    private parseRequiredDateRange;
    getTransactionSummary(query: DateRangeQueryDto): Promise<TransactionSummary>;
    getDailyTransactionReport(startDate: string, endDate: string): Promise<{
        data: DailyTransactionReport[];
    }>;
    getTopUsersByVolume(query: DateRangeQueryDto, limit?: number): Promise<{
        data: UserActivityReport[];
    }>;
    getUserActivitySummary(userId: string, query: DateRangeQueryDto): Promise<{
        user: {
            id: string;
            phone: string;
            name: string | null;
        };
        summary: TransactionSummary;
        recentTransactions: import("../../../transaction/infrastructure/orm-entities").TransactionOrmEntity[];
    }>;
    getReconciliationReport(startDate: string, endDate: string): Promise<ReconciliationReport>;
    exportTransactions(query: ExportQueryDto, res: Response): Promise<void>;
    getQuickStats(): Promise<{
        today: {
            transactions: number;
            volume: number;
        };
        week: {
            transactions: number;
            volume: number;
        };
        month: {
            transactions: number;
            volume: number;
        };
    }>;
}
export {};
