"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UseCases = exports.ExportTransactionsUseCase = exports.SetPinUseCase = exports.VerifyPinUseCase = exports.GetKycStatusUseCase = exports.SubmitKycUseCase = exports.GetRateUseCase = exports.ExternalTransferUseCase = exports.InternalTransferUseCase = exports.InitiateDepositUseCase = exports.GetDepositChannelsUseCase = exports.GetBalanceUseCase = exports.DeleteWalletUseCase = exports.UpdateWalletUseCase = exports.CreateWalletUseCase = void 0;
const create_wallet_use_case_1 = require("./create-wallet.use-case");
Object.defineProperty(exports, "CreateWalletUseCase", { enumerable: true, get: function () { return create_wallet_use_case_1.CreateWalletUseCase; } });
const update_wallet_use_case_1 = require("./update-wallet.use-case");
Object.defineProperty(exports, "UpdateWalletUseCase", { enumerable: true, get: function () { return update_wallet_use_case_1.UpdateWalletUseCase; } });
const delete_wallet_use_case_1 = require("./delete-wallet.use-case");
Object.defineProperty(exports, "DeleteWalletUseCase", { enumerable: true, get: function () { return delete_wallet_use_case_1.DeleteWalletUseCase; } });
const get_balance_use_case_1 = require("./get-balance.use-case");
Object.defineProperty(exports, "GetBalanceUseCase", { enumerable: true, get: function () { return get_balance_use_case_1.GetBalanceUseCase; } });
const get_deposit_channels_use_case_1 = require("./get-deposit-channels.use-case");
Object.defineProperty(exports, "GetDepositChannelsUseCase", { enumerable: true, get: function () { return get_deposit_channels_use_case_1.GetDepositChannelsUseCase; } });
const initiate_deposit_use_case_1 = require("./initiate-deposit.use-case");
Object.defineProperty(exports, "InitiateDepositUseCase", { enumerable: true, get: function () { return initiate_deposit_use_case_1.InitiateDepositUseCase; } });
const internal_transfer_use_case_1 = require("./internal-transfer.use-case");
Object.defineProperty(exports, "InternalTransferUseCase", { enumerable: true, get: function () { return internal_transfer_use_case_1.InternalTransferUseCase; } });
const external_transfer_use_case_1 = require("./external-transfer.use-case");
Object.defineProperty(exports, "ExternalTransferUseCase", { enumerable: true, get: function () { return external_transfer_use_case_1.ExternalTransferUseCase; } });
const get_rate_use_case_1 = require("./get-rate.use-case");
Object.defineProperty(exports, "GetRateUseCase", { enumerable: true, get: function () { return get_rate_use_case_1.GetRateUseCase; } });
const submit_kyc_use_case_1 = require("./submit-kyc.use-case");
Object.defineProperty(exports, "SubmitKycUseCase", { enumerable: true, get: function () { return submit_kyc_use_case_1.SubmitKycUseCase; } });
const get_kyc_status_use_case_1 = require("./get-kyc-status.use-case");
Object.defineProperty(exports, "GetKycStatusUseCase", { enumerable: true, get: function () { return get_kyc_status_use_case_1.GetKycStatusUseCase; } });
const verify_pin_use_case_1 = require("./verify-pin.use-case");
Object.defineProperty(exports, "VerifyPinUseCase", { enumerable: true, get: function () { return verify_pin_use_case_1.VerifyPinUseCase; } });
const set_pin_use_case_1 = require("./set-pin.use-case");
Object.defineProperty(exports, "SetPinUseCase", { enumerable: true, get: function () { return set_pin_use_case_1.SetPinUseCase; } });
const export_transactions_use_case_1 = require("./export-transactions.use-case");
Object.defineProperty(exports, "ExportTransactionsUseCase", { enumerable: true, get: function () { return export_transactions_use_case_1.ExportTransactionsUseCase; } });
exports.UseCases = [
    create_wallet_use_case_1.CreateWalletUseCase,
    update_wallet_use_case_1.UpdateWalletUseCase,
    delete_wallet_use_case_1.DeleteWalletUseCase,
    get_balance_use_case_1.GetBalanceUseCase,
    get_deposit_channels_use_case_1.GetDepositChannelsUseCase,
    initiate_deposit_use_case_1.InitiateDepositUseCase,
    internal_transfer_use_case_1.InternalTransferUseCase,
    external_transfer_use_case_1.ExternalTransferUseCase,
    get_rate_use_case_1.GetRateUseCase,
    submit_kyc_use_case_1.SubmitKycUseCase,
    get_kyc_status_use_case_1.GetKycStatusUseCase,
    verify_pin_use_case_1.VerifyPinUseCase,
    set_pin_use_case_1.SetPinUseCase,
    export_transactions_use_case_1.ExportTransactionsUseCase,
];
//# sourceMappingURL=index.js.map