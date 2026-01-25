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
exports.GetBalanceUseCase = void 0;
const common_1 = require("@nestjs/common");
const cache_manager_1 = require("@nestjs/cache-manager");
const wallet_repository_1 = require("../../infrastructure/repositories/wallet.repository");
const gateways_1 = require("../../../shared/domain/gateways");
let GetBalanceUseCase = class GetBalanceUseCase {
    constructor(walletRepository, paymentGateway, cacheManager) {
        this.walletRepository = walletRepository;
        this.paymentGateway = paymentGateway;
        this.cacheManager = cacheManager;
        this.CACHE_TTL = 30;
    }
    async execute(input) {
        const cacheKey = `balance:${input.userId}`;
        const cachedBalance = await this.cacheManager.get(cacheKey);
        if (cachedBalance) {
            return cachedBalance;
        }
        const wallet = await this.walletRepository.findByUserId(input.userId);
        if (!wallet) {
            throw new common_1.NotFoundException('Wallet not found');
        }
        if (!wallet.yellowCardWalletId) {
            throw new common_1.NotFoundException('Wallet not linked to payment provider');
        }
        const balanceResponse = await this.paymentGateway.getBalance(wallet.yellowCardWalletId);
        const result = {
            walletId: wallet.id,
            currency: wallet.currency,
            balances: balanceResponse.balances,
        };
        await this.cacheManager.set(cacheKey, result, this.CACHE_TTL);
        return result;
    }
};
exports.GetBalanceUseCase = GetBalanceUseCase;
exports.GetBalanceUseCase = GetBalanceUseCase = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)(gateways_1.PAYMENT_GATEWAY)),
    __param(2, (0, common_1.Inject)(cache_manager_1.CACHE_MANAGER)),
    __metadata("design:paramtypes", [wallet_repository_1.WalletRepository, Object, Object])
], GetBalanceUseCase);
//# sourceMappingURL=get-balance.use-case.js.map