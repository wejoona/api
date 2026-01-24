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
exports.ReferralController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const jwt_auth_guard_1 = require("../../../../common/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../../../../common/decorators/current-user.decorator");
const referral_service_1 = require("../domain/services/referral.service");
const apply_referral_code_request_1 = require("../dto/requests/apply-referral-code.request");
const referral_response_1 = require("../dto/responses/referral.response");
let ReferralController = class ReferralController {
    constructor(referralService) {
        this.referralService = referralService;
    }
    async getReferralCode(userId) {
        const code = await this.referralService.getUserReferralCode(userId);
        return {
            code,
            link: `https://joonapay.com/invite/${code}`,
        };
    }
    async getStats(userId) {
        const stats = await this.referralService.getUserStats(userId);
        if (!stats) {
            const code = await this.referralService.generateReferralCode(userId);
            return {
                referralCode: code,
                totalReferrals: 0,
                completedReferrals: 0,
                pendingReferrals: 0,
                totalEarnings: '0',
                pendingEarnings: '0',
                earningsCurrency: 'USDC',
                tier: 'bronze',
                referralLink: `https://joonapay.com/invite/${code}`,
            };
        }
        return {
            referralCode: stats.referralCode,
            totalReferrals: stats.totalReferrals,
            completedReferrals: stats.completedReferrals,
            pendingReferrals: stats.pendingReferrals,
            totalEarnings: stats.totalEarnings.toString(),
            pendingEarnings: stats.pendingEarnings.toString(),
            earningsCurrency: stats.earningsCurrency,
            tier: stats.tier,
            referralLink: `https://joonapay.com/invite/${stats.referralCode}`,
        };
    }
    async getHistory(userId) {
        const referrals = await this.referralService.getUserReferrals(userId);
        return referrals.map((r) => ({
            id: r.id,
            referrerId: r.referrerId,
            referredId: r.referredId,
            referralCode: r.referralCode,
            status: r.status,
            referrerReward: r.referrerReward.toString(),
            referredReward: r.referredReward.toString(),
            rewardCurrency: r.rewardCurrency,
            completedAt: r.completedAt,
            rewardedAt: r.rewardedAt,
            expiresAt: r.expiresAt,
            createdAt: r.createdAt,
        }));
    }
    async applyCode(userId, dto) {
        const referral = await this.referralService.applyReferralCode(userId, dto.code);
        return {
            id: referral.id,
            referrerId: referral.referrerId,
            referredId: referral.referredId,
            referralCode: referral.referralCode,
            status: referral.status,
            referrerReward: referral.referrerReward.toString(),
            referredReward: referral.referredReward.toString(),
            rewardCurrency: referral.rewardCurrency,
            completedAt: referral.completedAt,
            rewardedAt: referral.rewardedAt,
            expiresAt: referral.expiresAt,
            createdAt: referral.createdAt,
        };
    }
    async getLeaderboard(limit = 10) {
        const topReferrers = await this.referralService.getLeaderboard(limit);
        return {
            entries: topReferrers.map((stats, index) => ({
                rank: index + 1,
                userId: stats.userId,
                completedReferrals: stats.completedReferrals,
                tier: stats.tier,
            })),
        };
    }
};
exports.ReferralController = ReferralController;
__decorate([
    (0, common_1.Get)('code'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get or generate user referral code' }),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.OK, description: 'Referral code returned' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ReferralController.prototype, "getReferralCode", null);
__decorate([
    (0, common_1.Get)('stats'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get user referral statistics' }),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.OK, type: referral_response_1.ReferralStatsResponse }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ReferralController.prototype, "getStats", null);
__decorate([
    (0, common_1.Get)('history'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get user referral history' }),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.OK, type: [referral_response_1.ReferralResponse] }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ReferralController.prototype, "getHistory", null);
__decorate([
    (0, common_1.Post)('apply'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Apply a referral code' }),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.CREATED, type: referral_response_1.ReferralResponse }),
    (0, swagger_1.ApiResponse)({
        status: common_1.HttpStatus.BAD_REQUEST,
        description: 'Invalid or already used code',
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, apply_referral_code_request_1.ApplyReferralCodeRequest]),
    __metadata("design:returntype", Promise)
], ReferralController.prototype, "applyCode", null);
__decorate([
    (0, common_1.Get)('leaderboard'),
    (0, swagger_1.ApiOperation)({ summary: 'Get referral leaderboard' }),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.OK, type: referral_response_1.LeaderboardResponse }),
    __param(0, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], ReferralController.prototype, "getLeaderboard", null);
exports.ReferralController = ReferralController = __decorate([
    (0, swagger_1.ApiTags)('Referrals'),
    (0, common_1.Controller)('referrals'),
    __metadata("design:paramtypes", [referral_service_1.ReferralService])
], ReferralController);
//# sourceMappingURL=referral.controller.js.map