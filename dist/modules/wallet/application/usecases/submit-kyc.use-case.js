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
exports.SubmitKycUseCase = void 0;
const common_1 = require("@nestjs/common");
const payment_gateway_1 = require("../../../shared/domain/gateways/payment.gateway");
const wallet_repository_1 = require("../../infrastructure/repositories/wallet.repository");
let SubmitKycUseCase = class SubmitKycUseCase {
    constructor(paymentGateway, walletRepository) {
        this.paymentGateway = paymentGateway;
        this.walletRepository = walletRepository;
    }
    async execute(input) {
        const wallet = await this.walletRepository.findByUserId(input.userId);
        if (!wallet) {
            throw new common_1.NotFoundException('Wallet not found');
        }
        if (!wallet.isLinkedToProvider) {
            throw new common_1.BadRequestException('Wallet is not linked to payment provider');
        }
        if (wallet.kycStatus === 'pending') {
            throw new common_1.BadRequestException('KYC already submitted and pending verification');
        }
        if (wallet.kycStatus === 'verified') {
            throw new common_1.BadRequestException('KYC already verified');
        }
        const kycResponse = await this.paymentGateway.submitKyc({
            subwalletId: wallet.providerWalletId,
            firstName: input.firstName,
            lastName: input.lastName,
            dateOfBirth: input.dateOfBirth,
            country: input.country,
            idType: input.idType,
            idNumber: input.idNumber,
            idExpiryDate: input.idExpiryDate,
            address: input.address,
        });
        wallet.updateKycStatus('pending');
        await this.walletRepository.save(wallet);
        return {
            walletId: wallet.id,
            kycStatus: kycResponse.status,
            message: 'KYC submitted successfully. Verification pending.',
            submittedAt: new Date(),
        };
    }
};
exports.SubmitKycUseCase = SubmitKycUseCase;
exports.SubmitKycUseCase = SubmitKycUseCase = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(payment_gateway_1.PAYMENT_GATEWAY)),
    __metadata("design:paramtypes", [Object, wallet_repository_1.WalletRepository])
], SubmitKycUseCase);
//# sourceMappingURL=submit-kyc.use-case.js.map