import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger, NotFoundException } from '@nestjs/common';
import { WebhookDeadletterService } from '../domain/services/webhook-deadletter.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WebhookDeadletterOrmEntity } from '../../infrastructure/orm-entities/webhook-deadletter.orm-entity';

export class ResolveDeadletterCommand {
  constructor(
    public readonly id: string,
    public readonly resolvedBy: string,
    public readonly notes?: string,
  ) {}
}

/**
 * Resolve Deadletter Command Handler
 *
 * Marks a dead-letter entry as resolved
 */
@CommandHandler(ResolveDeadletterCommand)
export class ResolveDeadletterCommandHandler implements ICommandHandler<
  ResolveDeadletterCommand,
  void
> {
  private readonly logger = new Logger(ResolveDeadletterCommandHandler.name);

  constructor(
    private readonly deadletterService: WebhookDeadletterService,
    @InjectRepository(WebhookDeadletterOrmEntity)
    private readonly repository: Repository<WebhookDeadletterOrmEntity>,
  ) {}

  async execute(command: ResolveDeadletterCommand): Promise<void> {
    // Verify entry exists
    const entry = await this.repository.findOne({
      where: { id: command.id },
    });

    if (!entry) {
      throw new NotFoundException(`Dead-letter entry ${command.id} not found`);
    }

    await this.deadletterService.resolve(
      command.id,
      command.resolvedBy,
      command.notes,
    );

    this.logger.log(
      `Dead-letter ${command.id} resolved by ${command.resolvedBy}`,
    );
  }
}
