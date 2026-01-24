import { HealthCheckService, TypeOrmHealthIndicator, HealthCheckResult } from '@nestjs/terminus';
import { ConfigService } from '@nestjs/config';
export declare class HealthController {
    private readonly health;
    private readonly db;
    private readonly configService;
    private redis;
    constructor(health: HealthCheckService, db: TypeOrmHealthIndicator, configService: ConfigService);
    check(): Promise<HealthCheckResult>;
    readiness(): Promise<HealthCheckResult>;
    live(): {
        status: string;
        timestamp: string;
    };
    detailed(): Promise<{
        timestamp: string;
        services: {
            database: {
                status: string;
                latency: string;
                error?: undefined;
            } | {
                status: string;
                error: string;
                latency?: undefined;
            };
            redis: {
                status: string;
                latency: string;
                error?: undefined;
            } | {
                status: string;
                error: string;
                latency?: undefined;
            };
            blnk: {
                status: string;
                latency: string;
                url: string;
                error?: undefined;
            } | {
                status: string;
                error: string;
                url: string;
                latency?: undefined;
            };
        };
        environment: {
            nodeEnv: any;
            version: string;
        };
        uptime: number;
        memory: NodeJS.MemoryUsage;
        status: string;
    }>;
    private checkRedis;
    private checkBlnk;
    private checkDatabaseDetailed;
    private checkRedisDetailed;
    private checkBlnkDetailed;
}
