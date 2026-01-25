import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger, NotFoundException } from '@nestjs/common';
import { WebhookDeadletterService } from '../domain/services/webhook-deadletter.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WebhookDeadletterOrmEntity } from '../../infrastructure/orm-entities/webhook-deadletter.orm-entity';
import { ProcessWebhookUseCase } from '../usecases/process-webhook.use-case';

export class RetryDeadletterCommand {
  constructor(public readonly id: string) {}
}

export interface RetryDeadletterResult {
  success: boolean;
  message: string;
  newStatus?: 'resolved' | 'pending';
}

/**
 * Retry Deadletter Command Handler
 *
 * Attempts to reprocess a failed webhook from the dead-letter queue
 */
@CommandHandler(RetryDeadletterCommand)
export class RetryDeadletterCommandHandler
  implements ICommandHandler<RetryDeadletterCommand, RetryDeadletterResult>
{
  private readonly logger = new Logger(RetryDeadletterCommandHandler.name);

  constructor(
    private readonly deadletterService: WebhookDeadletterService,
    private readonly processWebhookUseCase: ProcessWebhookUseCase,
    @InjectRepository(WebhookDeadletterOrmEntity)
    private readonly repository: Repository<WebhookDeadletterOrmEntity>,
  ) {}

  async execute(
    command: RetryDeadletterCommand,
  ): Promise<RetryDeadletterResult> {
    // Find the dead-letter entry
    const entry = await this.repository.findOne({
      where: { id: command.id },
    });

    if (!entry) {
      throw new NotFoundException(
        `Dead-letter entry ${command.id} not found`,
      );
    }

    if (entry.status !== 'pending') {
      return {
        success: false,
        message: `Cannot retry entry with status: ${entry.status}`,
      };
    }

    // Increment retry count
    await this.deadletterService.incrementRetry(command.id);

    this.logger.log(
      `Retrying webhook from dead-letter queue: ${entry.provider}/${entry.eventType}`,
    );

    try {
      // Attempt to reprocess the webhook
      // Note: We can't verify signature on retry, so we skip signature verification
      // This is safe because the webhook was already logged to DLQ after initial verification
      const result = await this.processWebhookUseCase.execute({
        payload: entry.payload,
        signature: '', // Skip signature verification on retry
        rawBody: JSON.stringify(entry.payload),
        provider: entry.provider as 'yellowcard' | 'circle' | 'generic',
      });

      if (result.success && result.processed) {
        // Mark as resolved
        await this.deadletterService.resolve(
          command.id,
          'system',
          `Successfully retried after ${entry.retryCount + 1} attempts`,
        );

        this.logger.log(
          `Dead-letter ${command.id} successfully retried and resolved`,
        );

        return {
          success: true,
          message: 'Webhook successfully reprocessed',
          newStatus: 'resolved',
        };
      }

      return {
        success: false,
        message: result.message || 'Webhook processing did not complete',
        newStatus: 'pending',
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to retry dead-letter ${command.id}: ${errorMessage}`,
      );

      return {
        success: false,
        message: `Retry failed: ${errorMessage}`,
        newStatus: 'pending',
      };
    }
  }
}
