import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger, NotFoundException } from '@nestjs/common';
import { WebhookDeadletterService } from '../domain/services/webhook-deadletter.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WebhookDeadletterOrmEntity } from '../../infrastructure/orm-entities/webhook-deadletter.orm-entity';

export class IgnoreDeadletterCommand {
  constructor(
    public readonly id: string,
    public readonly ignoredBy: string,
    public readonly reason?: string,
  ) {}
}

/**
 * Ignore Deadletter Command Handler
 *
 * Marks a dead-letter entry as ignored
 */
@CommandHandler(IgnoreDeadletterCommand)
export class IgnoreDeadletterCommandHandler
  implements ICommandHandler<IgnoreDeadletterCommand, void>
{
  private readonly logger = new Logger(IgnoreDeadletterCommandHandler.name);

  constructor(
    private readonly deadletterService: WebhookDeadletterService,
    @InjectRepository(WebhookDeadletterOrmEntity)
    private readonly repository: Repository<WebhookDeadletterOrmEntity>,
  ) {}

  async execute(command: IgnoreDeadletterCommand): Promise<void> {
    // Verify entry exists
    const entry = await this.repository.findOne({
      where: { id: command.id },
    });

    if (!entry) {
      throw new NotFoundException(
        `Dead-letter entry ${command.id} not found`,
      );
    }

    await this.deadletterService.ignore(
      command.id,
      command.ignoredBy,
      command.reason,
    );

    this.logger.log(`Dead-letter ${command.id} ignored by ${command.ignoredBy}`);
  }
}
