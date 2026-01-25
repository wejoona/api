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
var CreateWalletUseCase_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateWalletUseCase = void 0;
const common_1 = require("@nestjs/common");
const wallet_entity_1 = require("../../domain/entities/wallet.entity");
const wallet_repository_1 = require("../../infrastructure/repositories/wallet.repository");
const interfaces_1 = require("../../../providers/interfaces");
let CreateWalletUseCase = CreateWalletUseCase_1 = class CreateWalletUseCase {
    constructor(repository, identityProvider, walletProvider, ledgerProvider) {
        this.repository = repository;
        this.identityProvider = identityProvider;
        this.walletProvider = walletProvider;
        this.ledgerProvider = ledgerProvider;
        this.logger = new common_1.Logger(CreateWalletUseCase_1.name);
    }
    async execute(input) {
        const { userId, userName, userEmail, userPhone, countryCode } = input;
        this.logger.log(`Creating wallet for user ${userId}`);
        const existingWallet = await this.repository.findByUserId(userId);
        if (existingWallet) {
            this.logger.log(`User ${userId} already has a wallet`);
            return existingWallet;
        }
        let circleUserId;
        let circleWalletId;
        let circleWalletAddress;
        let blnkBalanceId;
        try {
            this.logger.log(`Creating Circle user for ${userId}`);
            const circleUser = await this.identityProvider.createUser({
                userId,
                email: userEmail,
                phone: userPhone,
                countryCode: countryCode || 'CI',
            });
            circleUserId = circleUser.providerId;
            this.logger.log(`Circle user created: ${circleUserId}`);
        }
        catch (error) {
            this.logger.warn(`Failed to create Circle user: ${error instanceof Error ? error.message : 'Unknown'}`);
        }
        if (circleUserId) {
            try {
                this.logger.log(`Creating Circle wallet for user ${userId}`);
                const circleWallet = await this.walletProvider.createWallet({
                    userId,
                    userProviderId: circleUserId,
                    name: userName || `User ${userId}`,
                    metadata: {
                        joonapayUserId: userId,
                    },
                });
                circleWalletId = circleWallet.providerId;
                circleWalletAddress = circleWallet.address;
                this.logger.log(`Circle wallet created: ${circleWalletAddress}`);
            }
            catch (error) {
                this.logger.warn(`Failed to create Circle wallet: ${error instanceof Error ? error.message : 'Unknown'}`);
            }
        }
        try {
            this.logger.log(`Creating Blnk balance for user ${userId}`);
            blnkBalanceId = await this.ledgerProvider.createUserBalance(userId, 'USDC');
            this.logger.log(`Blnk balance created: ${blnkBalanceId}`);
        }
        catch (error) {
            this.logger.warn(`Failed to create Blnk balance: ${error instanceof Error ? error.message : 'Unknown'}`);
        }
        const wallet = wallet_entity_1.WalletEntity.create({
            userId,
            circleWalletId,
            circleWalletAddress,
            currency: 'USDC',
        });
        const savedWallet = await this.repository.save(wallet);
        this.logger.log(`Wallet created successfully for user ${userId}`);
        return savedWallet;
    }
};
exports.CreateWalletUseCase = CreateWalletUseCase;
exports.CreateWalletUseCase = CreateWalletUseCase = CreateWalletUseCase_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)(interfaces_1.IDENTITY_PROVIDER)),
    __param(2, (0, common_1.Inject)(interfaces_1.WALLET_PROVIDER)),
    __param(3, (0, common_1.Inject)(interfaces_1.LEDGER_PROVIDER)),
    __metadata("design:paramtypes", [wallet_repository_1.WalletRepository, Object, Object, Object])
], CreateWalletUseCase);
//# sourceMappingURL=create-wallet.use-case.js.map