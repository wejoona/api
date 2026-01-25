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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetRateUseCase = void 0;
const common_1 = require("@nestjs/common");
const cache_manager_1 = require("@nestjs/cache-manager");
const gateways_1 = require("../../../shared/domain/gateways");
let GetRateUseCase = class GetRateUseCase {
    constructor(paymentGateway, cacheManager) {
        this.paymentGateway = paymentGateway;
        this.cacheManager = cacheManager;
        this.CACHE_TTL = 300;
    }
    async execute(input) {
        const cacheKey = `rate:${input.sourceCurrency}:${input.targetCurrency}`;
        const cachedRate = await this.cacheManager.get(cacheKey);
        if (cachedRate) {
            return cachedRate;
        }
        const rateResponse = await this.paymentGateway.getRate({
            sourceCurrency: input.sourceCurrency,
            targetCurrency: input.targetCurrency,
            amount: input.amount,
            direction: input.direction || 'buy',
        });
        await this.cacheManager.set(cacheKey, rateResponse, this.CACHE_TTL);
        return rateResponse;
    }
};
exports.GetRateUseCase = GetRateUseCase;
exports.GetRateUseCase = GetRateUseCase = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(gateways_1.PAYMENT_GATEWAY)),
    __param(1, (0, common_1.Inject)(cache_manager_1.CACHE_MANAGER)),
    __metadata("design:paramtypes", [Object, Object])
], GetRateUseCase);
//# sourceMappingURL=get-rate.use-case.js.map