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
const usecases_1 = require("./application/usecases");
const webhook_controller_1 = require("./application/controllers/webhook.controller");
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
            (0, common_1.forwardRef)(() => transaction_module_1.TransactionModule),
            (0, common_1.forwardRef)(() => wallet_module_1.WalletModule),
            yellowcard_1.YellowCardModule,
        ],
        providers: [usecases_1.ProcessWebhookUseCase],
        controllers: [webhook_controller_1.WebhookController],
    })
], WebhookModule);
//# sourceMappingURL=webhook.module.js.map