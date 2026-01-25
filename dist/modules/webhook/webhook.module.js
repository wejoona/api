"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhookModule = void 0;
const common_1 = require("@nestjs/common");
const cqrs_1 = require("@nestjs/cqrs");
const typeorm_1 = require("@nestjs/typeorm");
const usecases_1 = require("./application/usecases");
const webhook_deadletter_service_1 = require("./application/domain/services/webhook-deadletter.service");
const repositories_1 = require("./infrastructure/repositories");
const webhook_deadletter_orm_entity_1 = require("./infrastructure/orm-entities/webhook-deadletter.orm-entity");
const controllers_1 = require("./application/controllers");
const queries_1 = require("./application/queries");
const commands_1 = require("./application/commands");
const transaction_module_1 = require("../transaction/transaction.module");
const wallet_module_1 = require("../wallet/wallet.module");
const yellowcard_1 = require("../providers/yellowcard");
let WebhookModule = class WebhookModule {
};
exports.WebhookModule = WebhookModule;
exports.WebhookModule = WebhookModule = __decorate([
    (0, common_1.Module)({
        imports: [
            cqrs_1.CqrsModule,
            typeorm_1.TypeOrmModule.forFeature([webhook_deadletter_orm_entity_1.WebhookDeadletterOrmEntity]),
            (0, common_1.forwardRef)(() => transaction_module_1.TransactionModule),
            (0, common_1.forwardRef)(() => wallet_module_1.WalletModule),
            yellowcard_1.YellowCardModule,
        ],
        providers: [
            usecases_1.ProcessWebhookUseCase,
            webhook_deadletter_service_1.WebhookDeadletterService,
            ...repositories_1.Repositories,
            ...queries_1.Queries,
            ...commands_1.CommandHandlers,
        ],
        controllers: [...controllers_1.Controllers],
        exports: [webhook_deadletter_service_1.WebhookDeadletterService, ...repositories_1.Repositories],
    })
], WebhookModule);
//# sourceMappingURL=webhook.module.js.map