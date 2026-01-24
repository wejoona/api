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
const transaction_module_1 = require("../transaction/transaction.module");
const user_module_1 = require("../user/user.module");
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
        ],
        providers: [
            wallet_repository_1.WalletRepository,
            wallet_mapper_1.WalletMapper,
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
        ],
        controllers: [wallet_controller_1.WalletController],
        exports: [
            wallet_repository_1.WalletRepository,
            usecases_1.CreateWalletUseCase,
            usecases_1.InternalTransferUseCase,
            usecases_1.ExternalTransferUseCase,
        ],
    })
], WalletModule);
//# sourceMappingURL=wallet.module.js.map