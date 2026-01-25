import { HealthCheckService, TypeOrmHealthIndicator, HealthCheckResult } from '@nestjs/terminus';
import { ConfigService } from '@nestjs/config';
import { CircleHealthIndicator, BlnkHealthIndicator, RedisHealthIndicator } from './health-indicators';
export declare class HealthController {
    private readonly health;
    private readonly db;
    private readonly configService;
    private readonly circleHealth;
    private readonly blnkHealth;
    private readonly redisHealth;
    constructor(health: HealthCheckService, db: TypeOrmHealthIndicator, configService: ConfigService, circleHealth: CircleHealthIndicator, blnkHealth: BlnkHealthIndicator, redisHealth: RedisHealthIndicator);
    check(): Promise<HealthCheckResult>;
    readiness(): Promise<HealthCheckResult>;
    live(): {
        status: string;
        timestamp: string;
    };
    detailed(): Promise<{
        status: string;
        timestamp: string;
        services: Record<string, any>;
        environment: {
            nodeEnv: any;
            version: string;
        };
        uptime: number;
        memory: NodeJS.MemoryUsage;
    }>;
}
