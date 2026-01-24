import { ConfigService } from '@nestjs/config';
import { IReconciliationProvider, CreateMatchingRuleParams, RunReconciliationParams, ReconciliationResultInfo } from '@modules/providers/interfaces/ledger.interface';
export declare class BlnkReconciliationAdapter implements IReconciliationProvider {
    private readonly configService;
    private readonly logger;
    private readonly client;
    constructor(configService: ConfigService);
    uploadExternalData(filePath: string, source: string): Promise<string>;
    createMatchingRule(params: CreateMatchingRuleParams): Promise<string>;
    runReconciliation(params: RunReconciliationParams): Promise<ReconciliationResultInfo>;
}
