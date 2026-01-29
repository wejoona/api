"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WalletModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const cqrs_1 = require("@nestjs/cqrs");
const wallet_orm_entity_1 = require("./infrastructure/orm-entities/wallet.orm-entity");
const wallet_repository_1 = require("./infrastructure/repositories/wallet.repository");
const wallet_mapper_1 = require("./infrastructure/mappers/wallet.mapper");
const usecases_1 = require("./application/usecases");
const wallet_controller_1 = require("./application/controllers/wallet.controller");
const kyc_upload_controller_1 = require("./application/controllers/kyc-upload.controller");
const export_controller_1 = require("./application/controllers/export.controller");
const transaction_module_1 = require("../transaction/transaction.module");
const user_module_1 = require("../user/user.module");
const upload_1 = require("../upload");
const circle_module_1 = require("../providers/circle/circle.module");
const blnk_module_1 = require("../providers/blnk/blnk.module");
const risk_module_1 = require("../risk/risk.module");
const pin_verification_guard_1 = require("../../common/guards/pin-verification.guard");
let WalletModule = class WalletModule {
};
exports.WalletModule = WalletModule;
exports.WalletModule = WalletModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([wallet_orm_entity_1.WalletOrmEntity]),
            cqrs_1.CqrsModule,
            (0, common_1.forwardRef)(() => transaction_module_1.TransactionModule),
            (0, common_1.forwardRef)(() => user_module_1.UserModule),
            upload_1.UploadModule,
            circle_module_1.CircleModule,
            blnk_module_1.BlnkModule,
            risk_module_1.RiskModule,
        ],
        providers: [
            wallet_repository_1.WalletRepository,
            {
                provide: 'WALLET_REPOSITORY',
                useExisting: wallet_repository_1.WalletRepository,
            },
            wallet_mapper_1.WalletMapper,
            pin_verification_guard_1.PinVerificationGuard,
            pin_verification_guard_1.PinTokenService,
            usecases_1.CreateWalletUseCase,
            usecases_1.UpdateWalletUseCase,
            usecases_1.DeleteWalletUseCase,
            usecases_1.GetBalanceUseCase,
            usecases_1.GetDepositChannelsUseCase,
            usecases_1.InitiateDepositUseCase,
            usecases_1.InternalTransferUseCase,
            usecases_1.ExternalTransferUseCase,
            usecases_1.GetRateUseCase,
            usecases_1.SubmitKycUseCase,
            usecases_1.GetKycStatusUseCase,
            usecases_1.VerifyPinUseCase,
            usecases_1.SetPinUseCase,
            usecases_1.ExportTransactionsUseCase,
        ],
        controllers: [wallet_controller_1.WalletController, kyc_upload_controller_1.KycUploadController, export_controller_1.ExportController],
        exports: [
            wallet_repository_1.WalletRepository,
            'WALLET_REPOSITORY',
            usecases_1.CreateWalletUseCase,
            usecases_1.InternalTransferUseCase,
            usecases_1.ExternalTransferUseCase,
        ],
    })
], WalletModule);
//# sourceMappingURL=wallet.module.js.map