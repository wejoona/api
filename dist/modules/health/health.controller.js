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
exports.HealthController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const terminus_1 = require("@nestjs/terminus");
const config_1 = require("@nestjs/config");
const ioredis_1 = require("ioredis");
let HealthController = class HealthController {
    constructor(health, db, configService) {
        this.health = health;
        this.db = db;
        this.configService = configService;
        this.redis = new ioredis_1.default({
            host: this.configService.get('redis.host', 'localhost'),
            port: this.configService.get('redis.port', 6379),
            password: this.configService.get('redis.password'),
            maxRetriesPerRequest: 1,
            connectTimeout: 5000,
            lazyConnect: true,
        });
    }
    check() {
        return this.health.check([
            () => this.db.pingCheck('database'),
        ]);
    }
    async readiness() {
        return this.health.check([
            () => this.db.pingCheck('database'),
            () => this.checkRedis(),
            () => this.checkBlnk(),
        ]);
    }
    live() {
        return {
            status: 'ok',
            timestamp: new Date().toISOString(),
        };
    }
    async detailed() {
        const checks = {
            timestamp: new Date().toISOString(),
            services: {
                database: await this.checkDatabaseDetailed(),
                redis: await this.checkRedisDetailed(),
                blnk: await this.checkBlnkDetailed(),
            },
            environment: {
                nodeEnv: this.configService.get('NODE_ENV', 'development'),
                version: process.env.npm_package_version || '0.0.1',
            },
            uptime: process.uptime(),
            memory: process.memoryUsage(),
        };
        const allHealthy = Object.values(checks.services).every((service) => service.status === 'up');
        return {
            status: allHealthy ? 'ok' : 'degraded',
            ...checks,
        };
    }
    async checkRedis() {
        try {
            await this.redis.connect();
            const pong = await this.redis.ping();
            await this.redis.disconnect();
            if (pong === 'PONG') {
                return { redis: { status: 'up' } };
            }
            throw new Error('Redis ping failed');
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return { redis: { status: 'down', message: errorMessage } };
        }
    }
    async checkBlnk() {
        try {
            const blnkUrl = this.configService.get('blnk.url', 'http://localhost:5001');
            const response = await fetch(`${blnkUrl}/`, {
                signal: AbortSignal.timeout(5000)
            });
            if (response.ok) {
                return { blnk: { status: 'up' } };
            }
            return { blnk: { status: 'down', message: `HTTP ${response.status}` } };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return { blnk: { status: 'down', message: errorMessage } };
        }
    }
    async checkDatabaseDetailed() {
        try {
            const start = Date.now();
            await this.db.pingCheck('database');
            const latency = Date.now() - start;
            return { status: 'up', latency: `${latency}ms` };
        }
        catch (error) {
            return {
                status: 'down',
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }
    async checkRedisDetailed() {
        try {
            await this.redis.connect();
            const start = Date.now();
            const pong = await this.redis.ping();
            const latency = Date.now() - start;
            await this.redis.disconnect();
            if (pong === 'PONG') {
                return { status: 'up', latency: `${latency}ms` };
            }
            return { status: 'down', error: 'Ping failed' };
        }
        catch (error) {
            return {
                status: 'down',
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }
    async checkBlnkDetailed() {
        try {
            const blnkUrl = this.configService.get('blnk.url', 'http://localhost:5001');
            const start = Date.now();
            const response = await fetch(`${blnkUrl}/`, {
                signal: AbortSignal.timeout(5000)
            });
            const latency = Date.now() - start;
            if (response.ok) {
                return { status: 'up', latency: `${latency}ms`, url: blnkUrl };
            }
            return {
                status: 'down',
                error: `HTTP ${response.status}`,
                url: blnkUrl,
            };
        }
        catch (error) {
            return {
                status: 'down',
                error: error instanceof Error ? error.message : 'Unknown error',
                url: this.configService.get('blnk.url', 'http://localhost:5001'),
            };
        }
    }
};
exports.HealthController = HealthController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Basic health check' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Service is healthy',
        schema: {
            example: {
                status: 'ok',
                timestamp: '2026-01-24T12:00:00.000Z',
            },
        },
    }),
    (0, terminus_1.HealthCheck)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], HealthController.prototype, "check", null);
__decorate([
    (0, common_1.Get)('ready'),
    (0, swagger_1.ApiOperation)({ summary: 'Readiness check - all dependencies' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Service is ready to accept traffic',
    }),
    (0, swagger_1.ApiResponse)({
        status: 503,
        description: 'Service is not ready',
    }),
    (0, terminus_1.HealthCheck)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], HealthController.prototype, "readiness", null);
__decorate([
    (0, common_1.Get)('live'),
    (0, swagger_1.ApiOperation)({ summary: 'Liveness check - is the service running' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Service is alive',
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], HealthController.prototype, "live", null);
__decorate([
    (0, common_1.Get)('detailed'),
    (0, swagger_1.ApiOperation)({ summary: 'Detailed health check with all services' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Detailed health status',
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], HealthController.prototype, "detailed", null);
exports.HealthController = HealthController = __decorate([
    (0, swagger_1.ApiTags)('Health'),
    (0, common_1.Controller)('health'),
    __metadata("design:paramtypes", [terminus_1.HealthCheckService,
        terminus_1.TypeOrmHealthIndicator,
        config_1.ConfigService])
], HealthController);
//# sourceMappingURL=health.controller.js.map