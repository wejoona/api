import { IPaymentGateway } from '../../../shared/domain/gateways/payment.gateway';
import { WalletRepository } from '../../infrastructure/repositories/wallet.repository';
export interface GetKycStatusInput {
    userId: string;
}
export interface GetKycStatusOutput {
    walletId: string;
    kycStatus: string;
    providerStatus?: string;
    rejectionReason?: string;
    verifiedAt?: Date;
}
export declare class GetKycStatusUseCase {
    private readonly paymentGateway;
    private readonly walletRepository;
    constructor(paymentGateway: IPaymentGateway, walletRepository: WalletRepository);
    execute(input: GetKycStatusInput): Promise<GetKycStatusOutput>;
}
