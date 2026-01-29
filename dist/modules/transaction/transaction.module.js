"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const cqrs_1 = require("@nestjs/cqrs");
const transaction_orm_entity_1 = require("./infrastructure/orm-entities/transaction.orm-entity");
const transaction_repository_1 = require("./infrastructure/repositories/transaction.repository");
const transaction_mapper_1 = require("./infrastructure/mappers/transaction.mapper");
const usecases_1 = require("./application/usecases");
const services_1 = require("./application/domain/services");
const transaction_controller_1 = require("./application/controllers/transaction.controller");
const reconciliation_controller_1 = require("./application/controllers/reconciliation.controller");
const reconciliation_alert_listener_1 = require("./application/domain/events/reconciliation-alert.listener");
const wallet_module_1 = require("../wallet/wallet.module");
let TransactionModule = class TransactionModule {
};
exports.TransactionModule = TransactionModule;
exports.TransactionModule = TransactionModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([transaction_orm_entity_1.TransactionOrmEntity]),
            cqrs_1.CqrsModule,
            (0, common_1.forwardRef)(() => wallet_module_1.WalletModule),
        ],
        providers: [
            transaction_repository_1.TransactionRepository,
            transaction_mapper_1.TransactionMapper,
            usecases_1.GetTransactionsUseCase,
            usecases_1.GetTransactionUseCase,
            usecases_1.GetDepositStatusUseCase,
            services_1.ReconciliationService,
            services_1.TransactionSearchService,
            reconciliation_alert_listener_1.ReconciliationAlertListener,
        ],
        controllers: [transaction_controller_1.TransactionController, reconciliation_controller_1.ReconciliationController],
        exports: [
            transaction_repository_1.TransactionRepository,
            services_1.TransactionSearchService,
            services_1.ReconciliationService,
        ],
    })
], TransactionModule);
//# sourceMappingURL=transaction.module.js.map