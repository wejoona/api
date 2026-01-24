"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CircleModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const interfaces_1 = require("../interfaces");
const circle_factory_1 = require("./circle.factory");
let CircleModule = class CircleModule {
};
exports.CircleModule = CircleModule;
exports.CircleModule = CircleModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        imports: [config_1.ConfigModule],
        providers: [
            circle_factory_1.CircleProviderFactory,
            {
                provide: interfaces_1.IDENTITY_PROVIDER,
                useFactory: circle_factory_1.createCircleIdentityProvider,
                inject: [circle_factory_1.CircleProviderFactory],
            },
            {
                provide: interfaces_1.WALLET_PROVIDER,
                useFactory: circle_factory_1.createCircleWalletProvider,
                inject: [circle_factory_1.CircleProviderFactory],
            },
            {
                provide: interfaces_1.TRANSFER_PROVIDER,
                useFactory: circle_factory_1.createCircleTransferProvider,
                inject: [circle_factory_1.CircleProviderFactory],
            },
        ],
        exports: [
            interfaces_1.IDENTITY_PROVIDER,
            interfaces_1.WALLET_PROVIDER,
            interfaces_1.TRANSFER_PROVIDER,
            circle_factory_1.CircleProviderFactory,
        ],
    })
], CircleModule);
//# sourceMappingURL=circle.module.js.map