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
exports.CreateWalletUseCase = void 0;
const common_1 = require("@nestjs/common");
const wallet_entity_1 = require("../../domain/entities/wallet.entity");
const wallet_repository_1 = require("../../infrastructure/repositories/wallet.repository");
const gateways_1 = require("../../../shared/domain/gateways");
let CreateWalletUseCase = class CreateWalletUseCase {
    constructor(repository, paymentGateway) {
        this.repository = repository;
        this.paymentGateway = paymentGateway;
    }
    async execute(input) {
        const existingWallet = await this.repository.findByUserId(input.userId);
        if (existingWallet) {
            return existingWallet;
        }
        const subwallet = await this.paymentGateway.createSubwallet({
            userId: input.userId,
            name: input.userName || `User ${input.userId}`,
            email: input.userEmail,
            phone: input.userPhone,
            country: input.countryCode || 'CI',
        });
        const wallet = wallet_entity_1.WalletEntity.create({
            userId: input.userId,
            yellowCardWalletId: subwallet.externalId,
            currency: 'USD',
        });
        return this.repository.save(wallet);
    }
};
exports.CreateWalletUseCase = CreateWalletUseCase;
exports.CreateWalletUseCase = CreateWalletUseCase = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)(gateways_1.PAYMENT_GATEWAY)),
    __metadata("design:paramtypes", [wallet_repository_1.WalletRepository, Object])
], CreateWalletUseCase);
//# sourceMappingURL=create-wallet.use-case.js.map