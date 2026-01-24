"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlnkModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const adapters_1 = require("./adapters");
const listeners_1 = require("./listeners");
const interfaces_1 = require("../interfaces");
let BlnkModule = class BlnkModule {
};
exports.BlnkModule = BlnkModule;
exports.BlnkModule = BlnkModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        imports: [config_1.ConfigModule],
        providers: [
            adapters_1.BlnkLedgerAdapter,
            adapters_1.BlnkBalanceMonitorAdapter,
            adapters_1.BlnkSearchAdapter,
            adapters_1.BlnkReconciliationAdapter,
            adapters_1.BlnkIdentityAdapter,
            listeners_1.WebhookLedgerListener,
            {
                provide: interfaces_1.LEDGER_PROVIDER,
                useExisting: adapters_1.BlnkLedgerAdapter,
            },
            {
                provide: interfaces_1.BALANCE_MONITOR_PROVIDER,
                useExisting: adapters_1.BlnkBalanceMonitorAdapter,
            },
            {
                provide: interfaces_1.SEARCH_PROVIDER,
                useExisting: adapters_1.BlnkSearchAdapter,
            },
            {
                provide: interfaces_1.RECONCILIATION_PROVIDER,
                useExisting: adapters_1.BlnkReconciliationAdapter,
            },
            {
                provide: interfaces_1.LEDGER_IDENTITY_PROVIDER,
                useExisting: adapters_1.BlnkIdentityAdapter,
            },
        ],
        exports: [
            interfaces_1.LEDGER_PROVIDER,
            interfaces_1.BALANCE_MONITOR_PROVIDER,
            interfaces_1.SEARCH_PROVIDER,
            interfaces_1.RECONCILIATION_PROVIDER,
            interfaces_1.LEDGER_IDENTITY_PROVIDER,
            adapters_1.BlnkLedgerAdapter,
            adapters_1.BlnkBalanceMonitorAdapter,
            adapters_1.BlnkSearchAdapter,
            adapters_1.BlnkReconciliationAdapter,
            adapters_1.BlnkIdentityAdapter,
        ],
    })
], BlnkModule);
//# sourceMappingURL=blnk.module.js.map