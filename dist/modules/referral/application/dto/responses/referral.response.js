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
exports.LeaderboardResponse = exports.LeaderboardEntryResponse = exports.ReferralStatsResponse = exports.ReferralResponse = void 0;
const swagger_1 = require("@nestjs/swagger");
class ReferralResponse {
}
exports.ReferralResponse = ReferralResponse;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], ReferralResponse.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], ReferralResponse.prototype, "referrerId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], ReferralResponse.prototype, "referredId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], ReferralResponse.prototype, "referralCode", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], ReferralResponse.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], ReferralResponse.prototype, "referrerReward", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], ReferralResponse.prototype, "referredReward", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], ReferralResponse.prototype, "rewardCurrency", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Date)
], ReferralResponse.prototype, "completedAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Date)
], ReferralResponse.prototype, "rewardedAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Date)
], ReferralResponse.prototype, "expiresAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Date)
], ReferralResponse.prototype, "createdAt", void 0);
class ReferralStatsResponse {
}
exports.ReferralStatsResponse = ReferralStatsResponse;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], ReferralStatsResponse.prototype, "referralCode", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], ReferralStatsResponse.prototype, "totalReferrals", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], ReferralStatsResponse.prototype, "completedReferrals", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], ReferralStatsResponse.prototype, "pendingReferrals", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], ReferralStatsResponse.prototype, "totalEarnings", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], ReferralStatsResponse.prototype, "pendingEarnings", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], ReferralStatsResponse.prototype, "earningsCurrency", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], ReferralStatsResponse.prototype, "tier", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Shareable referral link' }),
    __metadata("design:type", String)
], ReferralStatsResponse.prototype, "referralLink", void 0);
class LeaderboardEntryResponse {
}
exports.LeaderboardEntryResponse = LeaderboardEntryResponse;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], LeaderboardEntryResponse.prototype, "rank", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], LeaderboardEntryResponse.prototype, "userId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], LeaderboardEntryResponse.prototype, "completedReferrals", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], LeaderboardEntryResponse.prototype, "tier", void 0);
class LeaderboardResponse {
}
exports.LeaderboardResponse = LeaderboardResponse;
__decorate([
    (0, swagger_1.ApiProperty)({ type: [LeaderboardEntryResponse] }),
    __metadata("design:type", Array)
], LeaderboardResponse.prototype, "entries", void 0);
//# sourceMappingURL=referral.response.js.map