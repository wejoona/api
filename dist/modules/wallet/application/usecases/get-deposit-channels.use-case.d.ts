import { WalletRepository } from '../../infrastructure/repositories/wallet.repository';
import { IPaymentGateway, OnRampChannel } from '../../../shared/domain/gateways';
export interface GetDepositChannelsInput {
    userId: string;
    currency?: string;
}
export interface GetDepositChannelsOutput {
    channels: OnRampChannel[];
}
export declare class GetDepositChannelsUseCase {
    private readonly walletRepository;
    private readonly paymentGateway;
    constructor(walletRepository: WalletRepository, paymentGateway: IPaymentGateway);
    execute(input: GetDepositChannelsInput): Promise<GetDepositChannelsOutput>;
}
