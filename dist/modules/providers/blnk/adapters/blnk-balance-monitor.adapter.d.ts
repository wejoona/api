import { ConfigService } from '@nestjs/config';
import { IBalanceMonitorProvider, CreateMonitorParams, BalanceMonitorInfo } from '@modules/providers/interfaces/ledger.interface';
export declare class BlnkBalanceMonitorAdapter implements IBalanceMonitorProvider {
    private readonly configService;
    private readonly logger;
    private readonly client;
    private readonly USDC_PRECISION;
    constructor(configService: ConfigService);
    createMonitor(params: CreateMonitorParams): Promise<BalanceMonitorInfo>;
    getMonitor(monitorId: string): Promise<BalanceMonitorInfo | null>;
    listMonitors(): Promise<BalanceMonitorInfo[]>;
    updateMonitor(monitorId: string, params: Partial<CreateMonitorParams>): Promise<BalanceMonitorInfo>;
    deleteMonitor(_monitorId: string): Promise<void>;
    private mapToMonitorInfo;
}
