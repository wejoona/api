import { HealthCheckService, TypeOrmHealthIndicator, HealthCheckResult } from '@nestjs/terminus';
import { ConfigService } from '@nestjs/config';
import { CircleHealthIndicator, BlnkHealthIndicator, RedisHealthIndicator } from './health-indicators';
import { ShutdownService } from '../../common/shutdown';
export declare class HealthController {
    private readonly health;
    private readonly db;
    private readonly configService;
    private readonly circleHealth;
    private readonly blnkHealth;
    private readonly redisHealth;
    private readonly shutdownService;
    constructor(health: HealthCheckService, db: TypeOrmHealthIndicator, configService: ConfigService, circleHealth: CircleHealthIndicator, blnkHealth: BlnkHealthIndicator, redisHealth: RedisHealthIndicator, shutdownService: ShutdownService);
    check(): Promise<HealthCheckResult>;
    readiness(): Promise<HealthCheckResult>;
    live(): {
        status: string;
        timestamp: string;
        shuttingDown: boolean;
        activeRequests: number;
    };
    detailed(): Promise<{
        status: string;
        timestamp: string;
        services: Record<string, any>;
        environment: {
            nodeEnv: any;
            version: string;
        };
        shutdown: {
            isShuttingDown: boolean;
            activeRequests: number;
        };
        uptime: number;
        memory: NodeJS.MemoryUsage;
    }>;
}
