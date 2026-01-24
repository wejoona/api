import { ConfigService } from '@nestjs/config';
import { ITransferProvider, InternalTransferData, ExternalTransferData, TransferResult } from '../../interfaces';
export declare class CircleTransferAdapter implements ITransferProvider {
    private readonly configService;
    private readonly logger;
    private readonly config;
    private readonly defaultBlockchain;
    private readonly usdcTokenId;
    readonly providerName = "circle";
    constructor(configService: ConfigService);
    internalTransfer(data: InternalTransferData): Promise<TransferResult>;
    externalTransfer(data: ExternalTransferData): Promise<TransferResult>;
    getTransferStatus(providerTransferId: string): Promise<TransferResult>;
    estimateFee(data: Partial<ExternalTransferData>): Promise<{
        fee: string;
        currency: string;
    }>;
    private mapCircleTransfer;
}
