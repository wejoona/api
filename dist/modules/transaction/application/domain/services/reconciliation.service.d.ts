import { OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { IReconciliationProvider } from '@modules/providers/interfaces';
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
    private readonly eventEmitter;
    private readonly logger;
    private yellowCardRuleId?;
    private circleRuleId?;
    constructor(reconciliationProvider: IReconciliationProvider, eventEmitter: EventEmitter2);
    onModuleInit(): Promise<void>;
    private setupMatchingRules;
    reconcileYellowCard(): Promise<ReconciliationReport | null>;
    reconcileCircle(): Promise<ReconciliationReport | null>;
    runReconciliation(source: 'yellowcard' | 'circle', filePath: string): Promise<ReconciliationReport>;
    getStatus(): {
        yellowCardRuleId?: string;
        circleRuleId?: string;
        initialized: boolean;
    };
}
