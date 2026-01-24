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
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeleteWalletUseCase = void 0;
const wallet_repository_1 = require("../../infrastructure/repositories/wallet.repository");
const common_1 = require("@nestjs/common");
let DeleteWalletUseCase = class DeleteWalletUseCase {
    constructor(repository) {
        this.repository = repository;
    }
    async execute(input) {
        const wallet = await this.repository.findById(input.walletId);
        if (!wallet) {
            throw new common_1.NotFoundException('Wallet not found');
        }
        if (wallet.status !== 'closed') {
            throw new common_1.BadRequestException('Wallet must be closed before deletion');
        }
        await this.repository.delete(input.walletId);
    }
};
exports.DeleteWalletUseCase = DeleteWalletUseCase;
exports.DeleteWalletUseCase = DeleteWalletUseCase = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [wallet_repository_1.WalletRepository])
], DeleteWalletUseCase);
//# sourceMappingURL=delete-wallet.use-case.js.map