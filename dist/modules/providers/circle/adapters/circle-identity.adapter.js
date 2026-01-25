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
var CircleIdentityAdapter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CircleIdentityAdapter = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const utils_1 = require("../../../../common/utils");
const CIRCLE_API_TIMEOUT = 5000;
let CircleIdentityAdapter = CircleIdentityAdapter_1 = class CircleIdentityAdapter {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(CircleIdentityAdapter_1.name);
        this.providerName = 'circle';
        this.config = {
            apiKey: this.configService.get('circle.apiKey') || '',
            entitySecret: this.configService.get('circle.entitySecretCipherText') || '',
            baseUrl: this.configService.get('circle.apiUrl') ||
                'https://api.circle.com/v1/w3s',
            walletSetId: this.configService.get('circle.walletSetId'),
            useMock: false,
        };
        this.circuitBreaker = new utils_1.CircuitBreaker({
            name: 'circle-identity',
            failureThreshold: 5,
            resetTimeout: 30000,
        });
        if (!this.config.apiKey) {
            this.logger.warn('Circle API key not configured');
        }
        else {
            this.logger.log('Circle Identity adapter initialized');
        }
    }
    async secureFetch(url, options = {}) {
        return this.circuitBreaker.execute(async () => {
            return (0, utils_1.fetchWithTimeout)(url, {
                ...options,
                timeout: CIRCLE_API_TIMEOUT,
                logger: this.logger,
            });
        });
    }
    handleApiError(error, operation) {
        if (error instanceof utils_1.RequestTimeoutError) {
            this.logger.error(`Circle API timeout during ${operation}: ${error.message}`);
        }
        else if (error instanceof utils_1.CircuitOpenError) {
            this.logger.warn(`Circuit breaker open for Circle API during ${operation}: ${error.message}`);
        }
        else {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to ${operation}: ${errorMessage}`);
        }
    }
    async createUser(data) {
        try {
            const response = await this.secureFetch(`${this.config.baseUrl}/users`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${this.config.apiKey}`,
                },
                body: JSON.stringify({
                    idempotencyKey: data.userId,
                    userId: data.userId,
                }),
            });
            if (!response.ok) {
                const error = (await response.json());
                throw new Error(`Circle API error: ${error.message}`);
            }
            const result = (await response.json());
            const circleUser = result.data.user;
            return {
                providerId: circleUser.id,
                status: circleUser.status === 'ENABLED' ? 'active' : 'inactive',
                kycStatus: 'none',
                kycTier: 'none',
                createdAt: new Date(circleUser.createDate),
            };
        }
        catch (error) {
            this.handleApiError(error, 'create Circle user');
            throw error;
        }
    }
    async getUser(providerId) {
        try {
            const response = await this.secureFetch(`${this.config.baseUrl}/users/${providerId}`, {
                headers: {
                    Authorization: `Bearer ${this.config.apiKey}`,
                },
            });
            if (response.status === 404) {
                return null;
            }
            if (!response.ok) {
                const error = (await response.json());
                throw new Error(`Circle API error: ${error.message}`);
            }
            const result = (await response.json());
            const circleUser = result.data.user;
            return {
                providerId: circleUser.id,
                status: circleUser.status === 'ENABLED' ? 'active' : 'inactive',
                kycStatus: 'none',
                kycTier: 'none',
                createdAt: new Date(circleUser.createDate),
            };
        }
        catch (error) {
            this.handleApiError(error, 'get Circle user');
            throw error;
        }
    }
    async submitKyc(_providerId, _data) {
        throw new Error('KYC submission requires separate KYC provider integration');
    }
    async getKycStatus(_providerId) {
        throw new Error('KYC status requires separate KYC provider integration');
    }
    async updateUser(providerId, _data) {
        try {
            const user = await this.getUser(providerId);
            if (!user) {
                throw new Error(`Circle user ${providerId} not found`);
            }
            this.logger.log(`User profile data updates stored locally for Circle user ${providerId}`);
            return user;
        }
        catch (error) {
            this.handleApiError(error, 'update Circle user');
            throw error;
        }
    }
    async updateUserStatus(providerId, status) {
        try {
            const response = await this.secureFetch(`${this.config.baseUrl}/users/${providerId}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${this.config.apiKey}`,
                },
                body: JSON.stringify({ status }),
            });
            if (!response.ok) {
                const error = (await response.json());
                throw new Error(`Circle API error: ${error.message}`);
            }
            const result = (await response.json());
            const circleUser = result.data.user;
            return {
                providerId: circleUser.id,
                status: circleUser.status === 'ENABLED' ? 'active' : 'inactive',
                kycStatus: 'none',
                kycTier: 'none',
                createdAt: new Date(circleUser.createDate),
            };
        }
        catch (error) {
            this.handleApiError(error, 'update Circle user status');
            throw error;
        }
    }
};
exports.CircleIdentityAdapter = CircleIdentityAdapter;
exports.CircleIdentityAdapter = CircleIdentityAdapter = CircleIdentityAdapter_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], CircleIdentityAdapter);
//# sourceMappingURL=circle-identity.adapter.js.map