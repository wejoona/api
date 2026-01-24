import { ConfigService } from '@nestjs/config';
import { ILedgerIdentityProvider, CreateLedgerIdentityParams, LedgerIdentityInfo } from '@modules/providers/interfaces/ledger.interface';
export declare class BlnkIdentityAdapter implements ILedgerIdentityProvider {
    private readonly configService;
    private readonly logger;
    private readonly client;
    constructor(configService: ConfigService);
    createLedgerIdentity(params: CreateLedgerIdentityParams): Promise<LedgerIdentityInfo>;
    getLedgerIdentity(identityId: string): Promise<LedgerIdentityInfo | null>;
    updateLedgerIdentity(identityId: string, params: Partial<CreateLedgerIdentityParams>): Promise<LedgerIdentityInfo>;
    listLedgerIdentities(): Promise<LedgerIdentityInfo[]>;
    private mapToIdentityInfo;
}
