export type MetricType = 'counter' | 'gauge' | 'histogram';
export declare class SystemMetricEntity {
    id: string;
    metricName: string;
    metricValue: number;
    metricType: MetricType;
    dimensions: Record<string, unknown> | null;
    recordedAt: Date;
}
