import { OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { IReconciliationProvider, ILedgerProvider, IWalletProvider } from '@modules/providers/interfaces';
import { IWalletRepository } from '@modules/wallet/domain/repositories/wallet.repository';
export interface BalanceDiscrepancy {
    userId: string;
    walletId: string;
    currency: string;
    blnkBalance: string;
    databaseBalance: string;
    circleBalance: string;
    blnkDiff: string;
    circleDiff: string;
    totalDiff: string;
    timestamp: Date;
    severity: 'low' | 'medium' | 'high' | 'critical';
}
export interface UserReconciliationReport {
    userId: string;
    walletId: string;
    currency: string;
    blnkBalance: string;
    databaseBalance: string;
    circleBalance: string;
    isReconciled: boolean;
    discrepancy?: BalanceDiscrepancy;
    timestamp: Date;
    error?: string;
}
export interface FullReconciliationReport {
    totalWallets: number;
    reconciledWallets: number;
    discrepancies: BalanceDiscrepancy[];
    errors: Array<{
        userId: string;
        walletId: string;
        error: string;
    }>;
    timestamp: Date;
    duration: number;
}
export interface ReconciliationReport {
    source: 'yellowcard' | 'circle';
    reconciliationId: string;
    status: string;
    matchedCount: number;
    unmatchedCount: number;
    timestamp: Date;
}
export declare class ReconciliationService implements OnModuleInit {
    private readonly reconciliationProvider;
    private readonly ledgerProvider;
    private readonly walletProvider;
    private readonly walletRepository;
    private readonly eventEmitter;
    private readonly logger;
    private yellowCardRuleId?;
    private circleRuleId?;
    private readonly CRITICAL_THRESHOLD;
    private readonly HIGH_THRESHOLD;
    private readonly MEDIUM_THRESHOLD;
    private readonly USDC_PRECISION;
    constructor(reconciliationProvider: IReconciliationProvider, ledgerProvider: ILedgerProvider, walletProvider: IWalletProvider, walletRepository: IWalletRepository, eventEmitter: EventEmitter2);
    onModuleInit(): Promise<void>;
    reconcileUserBalance(userId: string): Promise<UserReconciliationReport>;
    reconcileAllBalances(): Promise<FullReconciliationReport>;
    private setupMatchingRules;
    reconcileYellowCard(): Promise<ReconciliationReport | null>;
    reconcileCircle(): Promise<ReconciliationReport | null>;
    runReconciliation(source: 'yellowcard' | 'circle', filePath: string): Promise<ReconciliationReport>;
    getStatus(): {
        yellowCardRuleId?: string;
        circleRuleId?: string;
        initialized: boolean;
    };
    private calculateMaxDifference;
    private calculateSeverity;
    private formatBalance;
}
