"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Repositories = void 0;
const referral_repository_1 = require("./referral.repository");
const referral_stats_repository_1 = require("./referral-stats.repository");
__exportStar(require("./referral.repository"), exports);
__exportStar(require("./referral-stats.repository"), exports);
exports.Repositories = [
    referral_repository_1.ReferralRepository,
    {
        provide: referral_repository_1.REFERRAL_REPOSITORY,
        useExisting: referral_repository_1.ReferralRepository,
    },
    referral_stats_repository_1.ReferralStatsRepository,
    {
        provide: referral_stats_repository_1.REFERRAL_STATS_REPOSITORY,
        useExisting: referral_stats_repository_1.ReferralStatsRepository,
    },
];
//# sourceMappingURL=index.js.map