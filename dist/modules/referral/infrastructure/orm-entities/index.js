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
exports.OrmEntities = void 0;
const referral_orm_entity_1 = require("./referral.orm-entity");
const referral_stats_orm_entity_1 = require("./referral-stats.orm-entity");
__exportStar(require("./referral.orm-entity"), exports);
__exportStar(require("./referral-stats.orm-entity"), exports);
exports.OrmEntities = [
    referral_orm_entity_1.ReferralOrmEntity,
    referral_stats_orm_entity_1.ReferralStatsOrmEntity,
];
//# sourceMappingURL=index.js.map