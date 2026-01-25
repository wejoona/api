import { GetDeadletterStatsQueryHandler } from './get-deadletter-stats.query';
import { GetPendingDeadlettersQueryHandler } from './get-pending-deadletters.query';

export * from './get-deadletter-stats.query';
export * from './get-pending-deadletters.query';

export const Queries = [
  GetDeadletterStatsQueryHandler,
  GetPendingDeadlettersQueryHandler,
];
