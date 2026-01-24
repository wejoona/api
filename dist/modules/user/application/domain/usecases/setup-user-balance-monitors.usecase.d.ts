import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { IBalanceMonitorProvider } from '@modules/providers/interfaces';
export interface SetupUserBalanceMonitorsInput {
    userId: string;
    balanceId: string;
    email?: string;
}
export interface SetupUserBalanceMonitorsOutput {
    monitors: {
        type: string;
        monitorId: string;
    }[];
}
export declare class SetupUserBalanceMonitorsUseCase {
    private readonly monitorProvider;
    private readonly configService;
    private readonly eventEmitter;
    private readonly logger;
    private readonly webhookBaseUrl;
    constructor(monitorProvider: IBalanceMonitorProvider, configService: ConfigService, eventEmitter: EventEmitter2);
    execute(input: SetupUserBalanceMonitorsInput): Promise<SetupUserBalanceMonitorsOutput>;
}
