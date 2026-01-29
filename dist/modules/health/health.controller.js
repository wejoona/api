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
const health_indicators_1 = require("./health-indicators");
const shutdown_1 = require("../../common/shutdown");
let HealthController = class HealthController {
    constructor(health, db, configService, circleHealth, blnkHealth, redisHealth, shutdownService) {
        this.health = health;
        this.db = db;
        this.configService = configService;
        this.circleHealth = circleHealth;
        this.blnkHealth = blnkHealth;
        this.redisHealth = redisHealth;
        this.shutdownService = shutdownService;
    }
    check() {
        return this.health.check([() => this.db.pingCheck('database')]);
    }
    async readiness() {
        return this.health.check([
            () => this.db.pingCheck('database'),
            () => this.redisHealth.isHealthy('redis'),
            () => this.blnkHealth.isHealthy('blnk'),
            () => this.circleHealth.isHealthy('circle'),
        ]);
    }
    live() {
        const isShuttingDown = this.shutdownService.isShutdown();
        return {
            status: isShuttingDown ? 'shutting_down' : 'ok',
            timestamp: new Date().toISOString(),
            shuttingDown: isShuttingDown,
            activeRequests: this.shutdownService.getActiveRequestCount(),
        };
    }
    async detailed() {
        const services = {
            database: { status: 'unknown' },
            redis: { status: 'unknown' },
            blnk: { status: 'unknown' },
            circle: { status: 'unknown' },
        };
        try {
            const startDb = Date.now();
            await this.db.pingCheck('database');
            services.database = {
                status: 'up',
                latency: `${Date.now() - startDb}ms`,
            };
        }
        catch (error) {
            services.database = {
                status: 'down',
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
        try {
            const result = await this.redisHealth.isHealthy('redis');
            services.redis = { status: 'up', ...result.redis };
        }
        catch (error) {
            services.redis = {
                status: 'down',
                error: error.message || 'Unknown error',
            };
        }
        try {
            const result = await this.blnkHealth.isHealthy('blnk');
            services.blnk = { status: 'up', ...result.blnk };
        }
        catch (error) {
            services.blnk = {
                status: 'down',
                error: error.message || 'Unknown error',
            };
        }
        try {
            const result = await this.circleHealth.isHealthy('circle');
            services.circle = { status: 'up', ...result.circle };
        }
        catch (error) {
            services.circle = {
                status: 'down',
                error: error.message || 'Unknown error',
            };
        }
        const allHealthy = Object.values(services).every((service) => service.status === 'up');
        const isShuttingDown = this.shutdownService.isShutdown();
        return {
            status: isShuttingDown ? 'shutting_down' : allHealthy ? 'ok' : 'degraded',
            timestamp: new Date().toISOString(),
            services,
            environment: {
                nodeEnv: this.configService.get('NODE_ENV', 'development'),
                version: process.env.npm_package_version || '0.0.1',
            },
            shutdown: {
                isShuttingDown,
                activeRequests: this.shutdownService.getActiveRequestCount(),
            },
            uptime: process.uptime(),
            memory: process.memoryUsage(),
        };
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
    (0, swagger_1.ApiResponse)({
        status: 503,
        description: 'Service is shutting down',
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
        config_1.ConfigService,
        health_indicators_1.CircleHealthIndicator,
        health_indicators_1.BlnkHealthIndicator,
        health_indicators_1.RedisHealthIndicator,
        shutdown_1.ShutdownService])
], HealthController);
//# sourceMappingURL=health.controller.js.map