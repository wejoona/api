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
var CircleProviderFactory_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CircleProviderFactory = void 0;
exports.createCircleIdentityProvider = createCircleIdentityProvider;
exports.createCircleWalletProvider = createCircleWalletProvider;
exports.createCircleTransferProvider = createCircleTransferProvider;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const circle_identity_adapter_1 = require("./adapters/circle-identity.adapter");
const circle_wallet_adapter_1 = require("./adapters/circle-wallet.adapter");
const circle_transfer_adapter_1 = require("./adapters/circle-transfer.adapter");
const mock_1 = require("../mock");
let CircleProviderFactory = CircleProviderFactory_1 = class CircleProviderFactory {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(CircleProviderFactory_1.name);
        this.useMock =
            this.configService.get('circle.useMock') ??
                !this.configService.get('circle.apiKey');
        this.logger.log(`Circle Provider Factory initialized (mock mode: ${this.useMock})`);
    }
    createIdentityProvider() {
        if (this.useMock) {
            return new mock_1.MockCircleIdentityAdapter();
        }
        return new circle_identity_adapter_1.CircleIdentityAdapter(this.configService);
    }
    createWalletProvider() {
        if (this.useMock) {
            return new mock_1.MockCircleWalletAdapter();
        }
        return new circle_wallet_adapter_1.CircleWalletAdapter(this.configService);
    }
    createTransferProvider() {
        if (this.useMock) {
            return new mock_1.MockCircleTransferAdapter();
        }
        return new circle_transfer_adapter_1.CircleTransferAdapter(this.configService);
    }
    isMockMode() {
        return this.useMock;
    }
};
exports.CircleProviderFactory = CircleProviderFactory;
exports.CircleProviderFactory = CircleProviderFactory = CircleProviderFactory_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], CircleProviderFactory);
function createCircleIdentityProvider(factory) {
    return factory.createIdentityProvider();
}
function createCircleWalletProvider(factory) {
    return factory.createWalletProvider();
}
function createCircleTransferProvider(factory) {
    return factory.createTransferProvider();
}
//# sourceMappingURL=circle.factory.js.map