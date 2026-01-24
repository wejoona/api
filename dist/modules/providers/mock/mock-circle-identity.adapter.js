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
var MockCircleIdentityAdapter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockCircleIdentityAdapter = void 0;
const common_1 = require("@nestjs/common");
const fs = require("fs");
const path = require("path");
const uuid_1 = require("uuid");
let MockCircleIdentityAdapter = MockCircleIdentityAdapter_1 = class MockCircleIdentityAdapter {
    constructor() {
        this.logger = new common_1.Logger(MockCircleIdentityAdapter_1.name);
        this.providerName = 'circle_mock';
        this.mockData = this.loadMockData();
        this.logger.warn('Circle Identity running in MOCK mode');
    }
    loadMockData() {
        try {
            const mockDataPath = path.join(__dirname, '../mock-data/circle/users.json');
            const data = fs.readFileSync(mockDataPath, 'utf-8');
            return JSON.parse(data);
        }
        catch {
            return {
                defaultUser: {
                    providerId: 'circle_user_mock_001',
                    status: 'active',
                    kycStatus: 'approved',
                    kycTier: 'standard',
                },
                kycLimits: {
                    none: { dailyDeposit: 100, dailyWithdrawal: 50, monthlyVolume: 500 },
                    basic: {
                        dailyDeposit: 1000,
                        dailyWithdrawal: 500,
                        monthlyVolume: 10000,
                    },
                    standard: {
                        dailyDeposit: 10000,
                        dailyWithdrawal: 5000,
                        monthlyVolume: 50000,
                    },
                },
                kycTiers: ['none', 'basic', 'standard', 'enhanced'],
                kycStatuses: ['none', 'pending', 'approved', 'rejected'],
            };
        }
    }
    async createUser(data) {
        const providerId = `circle_user_${(0, uuid_1.v4)().slice(0, 8)}`;
        this.logger.log(`[MOCK] Created Circle user: ${providerId} for internal user: ${data.userId}`);
        return {
            providerId,
            status: 'active',
            kycStatus: 'none',
            kycTier: 'none',
            createdAt: new Date(),
        };
    }
    async getUser(providerId) {
        return {
            providerId,
            status: 'active',
            kycStatus: 'none',
            kycTier: 'basic',
            createdAt: new Date(),
        };
    }
    async submitKyc(_providerId, data) {
        this.logger.log(`[MOCK] KYC submitted for ${data.firstName} ${data.lastName}`);
        const limits = this.mockData.kycLimits['basic'];
        return {
            status: 'pending',
            tier: 'basic',
            limits,
        };
    }
    async getKycStatus(_providerId) {
        const limits = this.mockData.kycLimits['standard'];
        return {
            status: 'approved',
            tier: 'standard',
            limits,
        };
    }
    async updateUser(providerId, _data) {
        return {
            providerId,
            status: 'active',
            kycStatus: 'approved',
            kycTier: 'standard',
            createdAt: new Date(),
        };
    }
};
exports.MockCircleIdentityAdapter = MockCircleIdentityAdapter;
exports.MockCircleIdentityAdapter = MockCircleIdentityAdapter = MockCircleIdentityAdapter_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], MockCircleIdentityAdapter);
//# sourceMappingURL=mock-circle-identity.adapter.js.map