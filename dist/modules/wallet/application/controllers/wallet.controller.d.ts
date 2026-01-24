import { AuthenticatedRequest } from '../../../../common/guards';
import { InitiateDepositDto, InternalTransferDto, ExternalTransferDto, GetRateDto, SubmitKycDto, VerifyPinDto, SetPinDto } from '../dto/requests';
import { GetBalanceUseCase, GetDepositChannelsUseCase, InitiateDepositUseCase, InternalTransferUseCase, ExternalTransferUseCase, GetRateUseCase, SubmitKycUseCase, GetKycStatusUseCase, VerifyPinUseCase, SetPinUseCase } from '../usecases';
export declare class WalletController {
    private readonly getBalanceUseCase;
    private readonly getDepositChannelsUseCase;
    private readonly initiateDepositUseCase;
    private readonly internalTransferUseCase;
    private readonly externalTransferUseCase;
    private readonly getRateUseCase;
    private readonly submitKycUseCase;
    private readonly getKycStatusUseCase;
    private readonly verifyPinUseCase;
    private readonly setPinUseCase;
    constructor(getBalanceUseCase: GetBalanceUseCase, getDepositChannelsUseCase: GetDepositChannelsUseCase, initiateDepositUseCase: InitiateDepositUseCase, internalTransferUseCase: InternalTransferUseCase, externalTransferUseCase: ExternalTransferUseCase, getRateUseCase: GetRateUseCase, submitKycUseCase: SubmitKycUseCase, getKycStatusUseCase: GetKycStatusUseCase, verifyPinUseCase: VerifyPinUseCase, setPinUseCase: SetPinUseCase);
    getBalance(req: AuthenticatedRequest): Promise<import("../usecases/get-balance.use-case").GetBalanceOutput>;
    getDepositChannels(req: AuthenticatedRequest, currency?: string): Promise<import("../usecases/get-deposit-channels.use-case").GetDepositChannelsOutput>;
    initiateDeposit(req: AuthenticatedRequest, dto: InitiateDepositDto): Promise<import("../usecases/initiate-deposit.use-case").InitiateDepositOutput>;
    internalTransfer(req: AuthenticatedRequest, dto: InternalTransferDto): Promise<import("../usecases/internal-transfer.use-case").InternalTransferOutput>;
    externalTransfer(req: AuthenticatedRequest, dto: ExternalTransferDto): Promise<import("../usecases/external-transfer.use-case").ExternalTransferOutput>;
    getRate(query: GetRateDto): Promise<import("../../../shared/domain/gateways").RateResponse>;
    getKycStatus(req: AuthenticatedRequest): Promise<import("../usecases/get-kyc-status.use-case").GetKycStatusOutput>;
    submitKyc(req: AuthenticatedRequest, dto: SubmitKycDto): Promise<import("../usecases/submit-kyc.use-case").SubmitKycOutput>;
    verifyPin(req: AuthenticatedRequest, dto: VerifyPinDto): Promise<import("../usecases/verify-pin.use-case").VerifyPinOutput>;
    setPin(req: AuthenticatedRequest, dto: SetPinDto): Promise<import("../usecases/set-pin.use-case").SetPinOutput>;
}
