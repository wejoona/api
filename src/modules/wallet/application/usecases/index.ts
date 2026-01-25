import { CreateWalletUseCase } from './create-wallet.use-case';
import { UpdateWalletUseCase } from './update-wallet.use-case';
import { DeleteWalletUseCase } from './delete-wallet.use-case';
import { GetBalanceUseCase } from './get-balance.use-case';
import { GetDepositChannelsUseCase } from './get-deposit-channels.use-case';
import { InitiateDepositUseCase } from './initiate-deposit.use-case';
import { InternalTransferUseCase } from './internal-transfer.use-case';
import { ExternalTransferUseCase } from './external-transfer.use-case';
import { GetRateUseCase } from './get-rate.use-case';
import { SubmitKycUseCase } from './submit-kyc.use-case';
import { GetKycStatusUseCase } from './get-kyc-status.use-case';
import { VerifyPinUseCase } from './verify-pin.use-case';
import { SetPinUseCase } from './set-pin.use-case';
import { ExportTransactionsUseCase } from './export-transactions.use-case';

export {
  CreateWalletUseCase,
  UpdateWalletUseCase,
  DeleteWalletUseCase,
  GetBalanceUseCase,
  GetDepositChannelsUseCase,
  InitiateDepositUseCase,
  InternalTransferUseCase,
  ExternalTransferUseCase,
  GetRateUseCase,
  SubmitKycUseCase,
  GetKycStatusUseCase,
  VerifyPinUseCase,
  SetPinUseCase,
  ExportTransactionsUseCase,
};

export const UseCases = [
  CreateWalletUseCase,
  UpdateWalletUseCase,
  DeleteWalletUseCase,
  GetBalanceUseCase,
  GetDepositChannelsUseCase,
  InitiateDepositUseCase,
  InternalTransferUseCase,
  ExternalTransferUseCase,
  GetRateUseCase,
  SubmitKycUseCase,
  GetKycStatusUseCase,
  VerifyPinUseCase,
  SetPinUseCase,
  ExportTransactionsUseCase,
];
