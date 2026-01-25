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
exports.WalletController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const throttler_1 = require("@nestjs/throttler");
const guards_1 = require("../../../../common/guards");
const pin_verification_guard_1 = require("../../../../common/guards/pin-verification.guard");
const interceptors_1 = require("../../../../common/interceptors");
const requests_1 = require("../dto/requests");
const usecases_1 = require("../usecases");
let WalletController = class WalletController {
    constructor(getBalanceUseCase, getDepositChannelsUseCase, initiateDepositUseCase, internalTransferUseCase, externalTransferUseCase, getRateUseCase, submitKycUseCase, getKycStatusUseCase, verifyPinUseCase, setPinUseCase) {
        this.getBalanceUseCase = getBalanceUseCase;
        this.getDepositChannelsUseCase = getDepositChannelsUseCase;
        this.initiateDepositUseCase = initiateDepositUseCase;
        this.internalTransferUseCase = internalTransferUseCase;
        this.externalTransferUseCase = externalTransferUseCase;
        this.getRateUseCase = getRateUseCase;
        this.submitKycUseCase = submitKycUseCase;
        this.getKycStatusUseCase = getKycStatusUseCase;
        this.verifyPinUseCase = verifyPinUseCase;
        this.setPinUseCase = setPinUseCase;
    }
    async getBalance(req) {
        return this.getBalanceUseCase.execute({ userId: req.user.id });
    }
    async getDepositChannels(req, currency) {
        return this.getDepositChannelsUseCase.execute({
            userId: req.user.id,
            currency,
        });
    }
    async initiateDeposit(req, dto) {
        return this.initiateDepositUseCase.execute({
            userId: req.user.id,
            amount: dto.amount,
            sourceCurrency: dto.sourceCurrency,
            channelId: dto.channelId,
        });
    }
    async internalTransfer(req, dto) {
        return this.internalTransferUseCase.execute({
            fromUserId: req.user.id,
            toPhone: dto.toPhone,
            amount: dto.amount,
            currency: dto.currency,
        });
    }
    async externalTransfer(req, dto) {
        return this.externalTransferUseCase.execute({
            userId: req.user.id,
            toAddress: dto.toAddress,
            amount: dto.amount,
            currency: dto.currency,
            network: dto.network,
        });
    }
    async getRate(query) {
        return this.getRateUseCase.execute({
            sourceCurrency: query.sourceCurrency,
            targetCurrency: query.targetCurrency,
            amount: query.amount,
            direction: query.direction,
        });
    }
    async getKycStatus(req) {
        return this.getKycStatusUseCase.execute({ userId: req.user.id });
    }
    async submitKyc(req, dto) {
        return this.submitKycUseCase.execute({
            userId: req.user.id,
            firstName: dto.firstName,
            lastName: dto.lastName,
            dateOfBirth: dto.dateOfBirth,
            country: dto.country,
            idType: dto.idType,
            idNumber: dto.idNumber,
            idExpiryDate: dto.idExpiryDate,
            address: dto.address,
            documentFrontKey: dto.documentFrontKey,
            documentBackKey: dto.documentBackKey,
            selfieKey: dto.selfieKey,
        });
    }
    async verifyPin(req, dto) {
        return this.verifyPinUseCase.execute({
            userId: req.user.id,
            pin: dto.pin,
        });
    }
    async setPin(req, dto) {
        return this.setPinUseCase.execute({
            userId: req.user.id,
            pin: dto.pin,
            confirmPin: dto.confirmPin,
        });
    }
};
exports.WalletController = WalletController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get wallet balance' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Returns the current wallet balance',
        schema: {
            example: {
                walletId: '123e4567-e89b-12d3-a456-426614174000',
                currency: 'USD',
                balances: [
                    { currency: 'USD', available: 100.0, pending: 0, total: 100.0 },
                ],
            },
        },
    }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], WalletController.prototype, "getBalance", null);
__decorate([
    (0, common_1.Get)('deposit/channels'),
    (0, swagger_1.ApiOperation)({ summary: 'Get available deposit channels' }),
    (0, swagger_1.ApiQuery)({ name: 'currency', required: false, example: 'XOF' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Returns available payment channels for deposits',
        schema: {
            example: {
                channels: [
                    {
                        id: 'orange_money_ci',
                        name: 'Orange Money',
                        type: 'mobile_money',
                        provider: 'orange',
                        country: 'CI',
                        minAmount: 1000,
                        maxAmount: 500000,
                        fee: 1.5,
                        feeType: 'percentage',
                        currency: 'XOF',
                    },
                ],
            },
        },
    }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('currency')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], WalletController.prototype, "getDepositChannels", null);
__decorate([
    (0, common_1.Post)('deposit'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, common_1.UseInterceptors)(interceptors_1.IdempotencyInterceptor),
    (0, swagger_1.ApiOperation)({ summary: 'Initiate a deposit (XOF → USD)' }),
    (0, swagger_1.ApiHeader)({
        name: 'X-Idempotency-Key',
        description: 'Unique key to prevent duplicate deposit requests (e.g., UUID)',
        required: false,
        example: '550e8400-e29b-41d4-a716-446655440000',
    }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'Returns payment instructions for the deposit',
        schema: {
            example: {
                transactionId: '123e4567-e89b-12d3-a456-426614174000',
                depositId: 'dep_1234567890',
                amount: 10000,
                sourceCurrency: 'XOF',
                targetCurrency: 'USD',
                rate: 0.00166,
                fee: 150,
                estimatedAmount: 16.45,
                paymentInstructions: {
                    type: 'mobile_money',
                    provider: 'orange',
                    accountNumber: '+2250700000000',
                    reference: 'DEP-ABC12345',
                    instructions: 'Send 10000 XOF to the number above...',
                },
                expiresAt: '2026-01-18T13:00:00.000Z',
            },
        },
    }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, requests_1.InitiateDepositDto]),
    __metadata("design:returntype", Promise)
], WalletController.prototype, "initiateDeposit", null);
__decorate([
    (0, common_1.Post)('transfer/internal'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, common_1.UseGuards)(pin_verification_guard_1.PinVerificationGuard),
    (0, common_1.UseInterceptors)(interceptors_1.IdempotencyInterceptor),
    (0, throttler_1.Throttle)({ default: { ttl: 60000, limit: 10 } }),
    (0, swagger_1.ApiOperation)({ summary: 'Transfer to another user by phone number' }),
    (0, swagger_1.ApiHeader)({
        name: 'X-Idempotency-Key',
        description: 'Unique key to prevent duplicate transfer requests (e.g., UUID)',
        required: false,
        example: '550e8400-e29b-41d4-a716-446655440000',
    }),
    (0, swagger_1.ApiHeader)({
        name: 'X-Pin-Token',
        description: 'PIN verification token from POST /wallet/pin/verify',
        required: true,
        example: 'abc123...',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Internal transfer completed',
        schema: {
            example: {
                transactionId: '123e4567-e89b-12d3-a456-426614174000',
                fromWalletId: 'wallet-1',
                toWalletId: 'wallet-2',
                toPhone: '+2250701234567',
                amount: 50,
                currency: 'USD',
                fee: 0,
                status: 'completed',
            },
        },
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: 'PIN verification required',
        schema: {
            example: {
                message: 'PIN verification required for this operation',
                code: 'PIN_REQUIRED',
            },
        },
    }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, requests_1.InternalTransferDto]),
    __metadata("design:returntype", Promise)
], WalletController.prototype, "internalTransfer", null);
__decorate([
    (0, common_1.Post)('transfer/external'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, common_1.UseGuards)(pin_verification_guard_1.PinVerificationGuard),
    (0, common_1.UseInterceptors)(interceptors_1.IdempotencyInterceptor),
    (0, throttler_1.Throttle)({ default: { ttl: 60000, limit: 5 } }),
    (0, swagger_1.ApiOperation)({ summary: 'Transfer to external wallet address (USDC)' }),
    (0, swagger_1.ApiHeader)({
        name: 'X-Idempotency-Key',
        description: 'Unique key to prevent duplicate transfer requests (e.g., UUID)',
        required: false,
        example: '550e8400-e29b-41d4-a716-446655440000',
    }),
    (0, swagger_1.ApiHeader)({
        name: 'X-Pin-Token',
        description: 'PIN verification token from POST /wallet/pin/verify',
        required: true,
        example: 'abc123...',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'External transfer initiated',
        schema: {
            example: {
                transactionId: '123e4567-e89b-12d3-a456-426614174000',
                walletId: 'wallet-1',
                toAddress: '0x1234567890abcdef1234567890abcdef12345678',
                amount: 50,
                currency: 'USD',
                fee: 1.0,
                status: 'pending',
                estimatedArrival: '5-30 minutes',
            },
        },
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: 'PIN verification required',
        schema: {
            example: {
                message: 'PIN verification required for this operation',
                code: 'PIN_REQUIRED',
            },
        },
    }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, requests_1.ExternalTransferDto]),
    __metadata("design:returntype", Promise)
], WalletController.prototype, "externalTransfer", null);
__decorate([
    (0, common_1.Get)('rate'),
    (0, swagger_1.ApiOperation)({ summary: 'Get exchange rate quote' }),
    (0, swagger_1.ApiQuery)({ name: 'sourceCurrency', required: true, example: 'XOF' }),
    (0, swagger_1.ApiQuery)({ name: 'targetCurrency', required: true, example: 'USD' }),
    (0, swagger_1.ApiQuery)({ name: 'amount', required: true, example: 10000 }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Returns exchange rate and estimated conversion',
        schema: {
            example: {
                sourceCurrency: 'XOF',
                targetCurrency: 'USD',
                rate: 0.00166,
                sourceAmount: 10000,
                targetAmount: 16.6,
                fee: 150,
                expiresAt: '2026-01-18T12:05:00.000Z',
            },
        },
    }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [requests_1.GetRateDto]),
    __metadata("design:returntype", Promise)
], WalletController.prototype, "getRate", null);
__decorate([
    (0, common_1.Get)('kyc/status'),
    (0, swagger_1.ApiOperation)({ summary: 'Get KYC verification status' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Returns current KYC status',
        schema: {
            example: {
                walletId: '123e4567-e89b-12d3-a456-426614174000',
                kycStatus: 'verified',
                providerStatus: 'verified',
                verifiedAt: '2026-01-18T12:00:00.000Z',
            },
        },
    }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], WalletController.prototype, "getKycStatus", null);
__decorate([
    (0, common_1.Post)('kyc/submit'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiOperation)({ summary: 'Submit KYC documents for verification' }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'KYC submitted successfully',
        schema: {
            example: {
                walletId: '123e4567-e89b-12d3-a456-426614174000',
                kycStatus: 'pending',
                message: 'KYC submitted successfully. Verification pending.',
                submittedAt: '2026-01-18T12:00:00.000Z',
            },
        },
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: 'KYC already submitted or verified',
    }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, requests_1.SubmitKycDto]),
    __metadata("design:returntype", Promise)
], WalletController.prototype, "submitKyc", null);
__decorate([
    (0, common_1.Post)('pin/verify'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, throttler_1.Throttle)({ default: { ttl: 60000, limit: 5 } }),
    (0, swagger_1.ApiOperation)({ summary: 'Verify PIN for transaction authorization' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'PIN verified successfully. Returns a token valid for 5 minutes.',
        schema: {
            example: {
                valid: true,
                message: 'PIN verified successfully',
                pinToken: 'abc123...',
                expiresIn: 300,
            },
        },
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: 'Invalid PIN or PIN not set',
        schema: {
            example: {
                message: 'Invalid PIN',
                remainingAttempts: 3,
            },
        },
    }),
    (0, swagger_1.ApiResponse)({
        status: 403,
        description: 'PIN locked due to too many failed attempts',
        schema: {
            example: {
                message: 'PIN is locked due to too many failed attempts',
                lockedUntil: '2026-01-18T13:00:00.000Z',
            },
        },
    }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, requests_1.VerifyPinDto]),
    __metadata("design:returntype", Promise)
], WalletController.prototype, "verifyPin", null);
__decorate([
    (0, common_1.Post)('pin/set'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Set or update transaction PIN' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'PIN set successfully',
        schema: {
            example: {
                success: true,
                message: 'PIN set successfully',
            },
        },
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: 'Invalid PIN or PINs do not match',
    }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, requests_1.SetPinDto]),
    __metadata("design:returntype", Promise)
], WalletController.prototype, "setPin", null);
exports.WalletController = WalletController = __decorate([
    (0, swagger_1.ApiTags)('Wallet'),
    (0, common_1.Controller)('wallet'),
    (0, common_1.UseGuards)(guards_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [usecases_1.GetBalanceUseCase,
        usecases_1.GetDepositChannelsUseCase,
        usecases_1.InitiateDepositUseCase,
        usecases_1.InternalTransferUseCase,
        usecases_1.ExternalTransferUseCase,
        usecases_1.GetRateUseCase,
        usecases_1.SubmitKycUseCase,
        usecases_1.GetKycStatusUseCase,
        usecases_1.VerifyPinUseCase,
        usecases_1.SetPinUseCase])
], WalletController);
//# sourceMappingURL=wallet.controller.js.map