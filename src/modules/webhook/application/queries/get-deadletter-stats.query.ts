import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { WebhookDeadletterService } from '../domain/services/webhook-deadletter.service';

export class GetDeadletterStatsQuery {}

export interface DeadletterStatsResult {
  pending: number;
  resolved: number;
  ignored: number;
  total: number;
}

/**
 * Get Deadletter Stats Query Handler
 *
 * Returns statistics about the webhook dead-letter queue
 */
@QueryHandler(GetDeadletterStatsQuery)
export class GetDeadletterStatsQueryHandler
  implements IQueryHandler<GetDeadletterStatsQuery, DeadletterStatsResult>
{
  constructor(
    private readonly deadletterService: WebhookDeadletterService,
  ) {}

  async execute(): Promise<DeadletterStatsResult> {
    return this.deadletterService.getStats();
  }
}
