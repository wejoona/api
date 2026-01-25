import { SetMetadata } from '@nestjs/common';

export const TRACK_METRICS_KEY = 'track_metrics';

export interface TrackMetricsOptions {
  operation: string;
  type?: string;
}

/**
 * Decorator to track metrics for a method
 * Usage: @TrackMetrics({ operation: 'transfer', type: 'internal' })
 */
export const TrackMetrics = (options: TrackMetricsOptions) =>
  SetMetadata(TRACK_METRICS_KEY, options);
