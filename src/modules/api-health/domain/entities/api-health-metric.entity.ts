import { v4 as uuidv4 } from 'uuid';

export interface ApiHealthMetricProps {
  id?: string;
  provider: ApiProvider;
  endpoint: string;
  status: ApiHealthStatus;
  latencyMs: number;
  statusCode?: number;
  errorMessage?: string;
  metadata?: Record<string, any>;
  timestamp?: Date;
}

export enum ApiProvider {
  CIRCLE = 'circle',
  YELLOW_CARD = 'yellow_card',
  TWILIO = 'twilio',
  BLNK = 'blnk',
}

export enum ApiHealthStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  DOWN = 'down',
}

export class ApiHealthMetric {
  readonly id: string;
  readonly provider: ApiProvider;
  readonly endpoint: string;
  readonly status: ApiHealthStatus;
  readonly latencyMs: number;
  readonly statusCode?: number;
  readonly errorMessage?: string;
  readonly metadata?: Record<string, any>;
  readonly timestamp: Date;

  private constructor(props: ApiHealthMetricProps) {
    this.id = props.id || uuidv4();
    this.provider = props.provider;
    this.endpoint = props.endpoint;
    this.status = props.status;
    this.latencyMs = props.latencyMs;
    this.statusCode = props.statusCode;
    this.errorMessage = props.errorMessage;
    this.metadata = props.metadata;
    this.timestamp = props.timestamp || new Date();
  }

  static create(
    props: Omit<ApiHealthMetricProps, 'id' | 'timestamp'>,
  ): ApiHealthMetric {
    return new ApiHealthMetric(props);
  }

  static fromPersistence(props: ApiHealthMetricProps): ApiHealthMetric {
    return new ApiHealthMetric(props);
  }

  isHealthy(): boolean {
    return this.status === ApiHealthStatus.HEALTHY;
  }

  isDegraded(): boolean {
    return this.status === ApiHealthStatus.DEGRADED;
  }

  isDown(): boolean {
    return this.status === ApiHealthStatus.DOWN;
  }

  hasHighLatency(threshold: number = 2000): boolean {
    return this.latencyMs > threshold;
  }
}
