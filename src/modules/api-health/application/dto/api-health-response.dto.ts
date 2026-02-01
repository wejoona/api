import {
  ApiProvider,
  ApiHealthStatus,
} from '../../domain/entities/api-health-metric.entity';

export class ApiHealthResponseDto {
  provider: ApiProvider;
  endpoint: string;
  status: ApiHealthStatus;
  available: boolean;
  latencyMs: number;
  statusCode?: number;
  errorMessage?: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}

export class ApiHealthSummaryDto {
  overall: 'healthy' | 'degraded' | 'down';
  providers: ApiHealthResponseDto[];
  checkedAt: Date;
}

export class TwilioMetricsDto {
  deliveryRate: number;
  messagesSent: number;
  messagesFailed: number;
  period: string;
}
