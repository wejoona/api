"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.YellowCardModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const interfaces_1 = require("../interfaces");
const yellowcard_factory_1 = require("./yellowcard.factory");
let YellowCardModule = class YellowCardModule {
};
exports.YellowCardModule = YellowCardModule;
exports.YellowCardModule = YellowCardModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        imports: [config_1.ConfigModule],
        providers: [
            yellowcard_factory_1.YellowCardProviderFactory,
            {
                provide: interfaces_1.ONRAMP_PROVIDER_CI,
                useFactory: yellowcard_factory_1.createYellowCardOnRampProvider,
                inject: [yellowcard_factory_1.YellowCardProviderFactory],
            },
            {
                provide: interfaces_1.OFFRAMP_PROVIDER_CI,
                useFactory: yellowcard_factory_1.createYellowCardOffRampProvider,
                inject: [yellowcard_factory_1.YellowCardProviderFactory],
            },
        ],
        exports: [interfaces_1.ONRAMP_PROVIDER_CI, interfaces_1.OFFRAMP_PROVIDER_CI, yellowcard_factory_1.YellowCardProviderFactory],
    })
], YellowCardModule);
//# sourceMappingURL=yellowcard.module.js.map