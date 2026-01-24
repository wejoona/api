import { ITransferProvider, InternalTransferData, ExternalTransferData, TransferResult } from '../interfaces';
export declare class MockCircleTransferAdapter implements ITransferProvider {
    private readonly logger;
    private readonly mockData;
    readonly providerName = "circle_mock";
    constructor();
    private loadMockData;
    internalTransfer(data: InternalTransferData): Promise<TransferResult>;
    externalTransfer(data: ExternalTransferData): Promise<TransferResult>;
    getTransferStatus(providerTransferId: string): Promise<TransferResult>;
    estimateFee(_data: Partial<ExternalTransferData>): Promise<{
        fee: string;
        currency: string;
    }>;
    private generateMockTxHash;
}
