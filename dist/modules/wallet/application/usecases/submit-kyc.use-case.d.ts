import { IPaymentGateway } from '../../../shared/domain/gateways/payment.gateway';
import { WalletRepository } from '../../infrastructure/repositories/wallet.repository';
export interface SubmitKycInput {
    userId: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    country: string;
    idType: 'passport' | 'national_id' | 'drivers_license';
    idNumber: string;
    idExpiryDate?: string;
    address?: {
        street: string;
        city: string;
        state?: string;
        postalCode?: string;
        country: string;
    };
}
export interface SubmitKycOutput {
    walletId: string;
    kycStatus: string;
    message: string;
    submittedAt: Date;
}
export declare class SubmitKycUseCase {
    private readonly paymentGateway;
    private readonly walletRepository;
    constructor(paymentGateway: IPaymentGateway, walletRepository: WalletRepository);
    execute(input: SubmitKycInput): Promise<SubmitKycOutput>;
}
