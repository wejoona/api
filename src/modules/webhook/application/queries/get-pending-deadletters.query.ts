import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { WebhookDeadletterService } from '../domain/services/webhook-deadletter.service';
import { WebhookDeadletterOrmEntity } from '../../infrastructure/orm-entities/webhook-deadletter.orm-entity';

export class GetPendingDeadlettersQuery {
  constructor(public readonly provider?: string) {}
}

/**
 * Get Pending Deadletters Query Handler
 *
 * Returns all pending dead-letter entries, optionally filtered by provider
 */
@QueryHandler(GetPendingDeadlettersQuery)
export class GetPendingDeadlettersQueryHandler
  implements
    IQueryHandler<GetPendingDeadlettersQuery, WebhookDeadletterOrmEntity[]>
{
  constructor(
    private readonly deadletterService: WebhookDeadletterService,
  ) {}

  async execute(
    query: GetPendingDeadlettersQuery,
  ): Promise<WebhookDeadletterOrmEntity[]> {
    if (query.provider) {
      const all = await this.deadletterService.findByProvider(query.provider);
      return all.filter((entry) => entry.status === 'pending');
    }

    return this.deadletterService.findPending();
  }
}
