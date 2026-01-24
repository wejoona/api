"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var YellowCardProviderFactory_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.YellowCardProviderFactory = void 0;
exports.createYellowCardOnRampProvider = createYellowCardOnRampProvider;
exports.createYellowCardOffRampProvider = createYellowCardOffRampProvider;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const yellowcard_onramp_adapter_1 = require("./adapters/yellowcard-onramp.adapter");
const yellowcard_offramp_adapter_1 = require("./adapters/yellowcard-offramp.adapter");
const mock_1 = require("../mock");
let YellowCardProviderFactory = YellowCardProviderFactory_1 = class YellowCardProviderFactory {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(YellowCardProviderFactory_1.name);
        this.useMock =
            this.configService.get('yellowCard.useMock') ??
                !this.configService.get('yellowCard.apiKey');
        this.logger.log(`Yellow Card Provider Factory initialized (mock mode: ${this.useMock})`);
    }
    createOnRampProvider() {
        if (this.useMock) {
            return new mock_1.MockYellowCardOnRampAdapter();
        }
        return new yellowcard_onramp_adapter_1.YellowCardOnRampAdapter(this.configService);
    }
    createOffRampProvider() {
        if (this.useMock) {
            return new mock_1.MockYellowCardOffRampAdapter();
        }
        return new yellowcard_offramp_adapter_1.YellowCardOffRampAdapter(this.configService);
    }
    isMockMode() {
        return this.useMock;
    }
};
exports.YellowCardProviderFactory = YellowCardProviderFactory;
exports.YellowCardProviderFactory = YellowCardProviderFactory = YellowCardProviderFactory_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], YellowCardProviderFactory);
function createYellowCardOnRampProvider(factory) {
    return factory.createOnRampProvider();
}
function createYellowCardOffRampProvider(factory) {
    return factory.createOffRampProvider();
}
//# sourceMappingURL=yellowcard.factory.js.map