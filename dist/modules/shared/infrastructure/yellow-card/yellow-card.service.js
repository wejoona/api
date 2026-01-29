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
var YellowCardService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.YellowCardService = void 0;
const common_1 = require("@nestjs/common");
const yellow_card_auth_service_1 = require("./yellow-card-auth.service");
const yellow_card_rates_service_1 = require("./yellow-card-rates.service");
const yellow_card_payments_service_1 = require("./yellow-card-payments.service");
const yellow_card_channels_service_1 = require("./yellow-card-channels.service");
const yellow_card_webhooks_service_1 = require("./yellow-card-webhooks.service");
let YellowCardService = YellowCardService_1 = class YellowCardService {
    constructor(authService, ratesService, paymentsService, channelsService, webhooksService) {
        this.authService = authService;
        this.ratesService = ratesService;
        this.paymentsService = paymentsService;
        this.channelsService = channelsService;
        this.webhooksService = webhooksService;
        this.logger = new common_1.Logger(YellowCardService_1.name);
    }
    async createSubwallet(request) {
        return this.paymentsService.createSubwallet(request);
    }
    async getBalance(subwalletId) {
        return this.paymentsService.getBalance(subwalletId);
    }
    async getOnRampChannels(country) {
        return this.channelsService.getOnRampChannels(country);
    }
    async initiateDeposit(request) {
        return this.paymentsService.initiateDeposit(request);
    }
    async internalTransfer(request) {
        return this.paymentsService.internalTransfer(request);
    }
    async externalTransfer(request) {
        return this.paymentsService.externalTransfer(request);
    }
    async getRate(request) {
        return this.ratesService.getRate(request);
    }
    verifyWebhookSignature(payload, signature) {
        return this.webhooksService.verifyWebhookSignature(payload, signature);
    }
};
exports.YellowCardService = YellowCardService;
exports.YellowCardService = YellowCardService = YellowCardService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [yellow_card_auth_service_1.YellowCardAuthService,
        yellow_card_rates_service_1.YellowCardRatesService,
        yellow_card_payments_service_1.YellowCardPaymentsService,
        yellow_card_channels_service_1.YellowCardChannelsService,
        yellow_card_webhooks_service_1.YellowCardWebhooksService])
], YellowCardService);
//# sourceMappingURL=yellow-card.service.js.map