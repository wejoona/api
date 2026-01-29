import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { SlaConfigurationRepository } from '../../domain/repositories/sla-configuration.repository';
import {
  SlaConfiguration,
  SlaCategory,
  SlaPriority,
} from '../../domain/entities/sla-configuration.entity';
import {
  CreateSlaConfigurationDto,
  UpdateSlaConfigurationDto,
  SlaConfigurationResponseDto,
} from '../dto/sla-configuration.dto';

export interface SlaCheckResult {
  slaConfig: SlaConfiguration;
  isResponseBreached: boolean;
  isResolutionBreached: boolean;
  shouldEscalate: boolean;
  responseTimeElapsedMs: number;
  resolutionTimeElapsedMs: number;
  responseTimeRemainingMs: number;
  resolutionTimeRemainingMs: number;
}

@Injectable()
export class SlaConfigurationService {
  private readonly logger = new Logger(SlaConfigurationService.name);

  constructor(
    private readonly slaConfigRepository: SlaConfigurationRepository,
  ) {}

  async create(
    dto: CreateSlaConfigurationDto,
  ): Promise<SlaConfigurationResponseDto> {
    // Check if SLA for this category and priority already exists
    const existing = await this.slaConfigRepository.findByCategoryAndPriority(
      dto.category,
      dto.priority,
    );

    if (existing) {
      throw new BadRequestException(
        `SLA configuration for ${dto.category}/${dto.priority} already exists`,
      );
    }

    const config = SlaConfiguration.create(dto);
    const saved = await this.slaConfigRepository.save(config);

    return this.toResponseDto(saved);
  }

  async update(
    id: string,
    dto: UpdateSlaConfigurationDto,
  ): Promise<SlaConfigurationResponseDto> {
    const config = await this.slaConfigRepository.findById(id);
    if (!config) {
      throw new NotFoundException('SLA configuration not found');
    }

    // Create updated config (we need to handle immutability)
    const updated = SlaConfiguration.reconstitute({
      id: config.id,
      name: dto.name ?? config.name,
      category: config.category,
      priority: config.priority,
      responseTimeMinutes: dto.responseTimeMinutes ?? config.responseTimeMinutes,
      resolutionTimeMinutes:
        dto.resolutionTimeMinutes ?? config.resolutionTimeMinutes,
      escalationAfterMinutes:
        dto.escalationAfterMinutes ?? config.escalationAfterMinutes ?? undefined,
      isActive: dto.isActive ?? config.isActive,
      businessHoursOnly: dto.businessHoursOnly ?? config.businessHoursOnly,
      createdAt: config.createdAt,
      updatedAt: new Date(),
    });

    const saved = await this.slaConfigRepository.save(updated);
    return this.toResponseDto(saved);
  }

  async findById(id: string): Promise<SlaConfigurationResponseDto> {
    const config = await this.slaConfigRepository.findById(id);
    if (!config) {
      throw new NotFoundException('SLA configuration not found');
    }
    return this.toResponseDto(config);
  }

  async findAll(): Promise<SlaConfigurationResponseDto[]> {
    const configs = await this.slaConfigRepository.findAll();
    return configs.map((c) => this.toResponseDto(c));
  }

  async findAllActive(): Promise<SlaConfigurationResponseDto[]> {
    const configs = await this.slaConfigRepository.findAllActive();
    return configs.map((c) => this.toResponseDto(c));
  }

  async activate(id: string): Promise<SlaConfigurationResponseDto> {
    const config = await this.slaConfigRepository.findById(id);
    if (!config) {
      throw new NotFoundException('SLA configuration not found');
    }

    config.activate();
    const saved = await this.slaConfigRepository.save(config);
    return this.toResponseDto(saved);
  }

  async deactivate(id: string): Promise<SlaConfigurationResponseDto> {
    const config = await this.slaConfigRepository.findById(id);
    if (!config) {
      throw new NotFoundException('SLA configuration not found');
    }

    config.deactivate();
    const saved = await this.slaConfigRepository.save(config);
    return this.toResponseDto(saved);
  }

  async delete(id: string): Promise<void> {
    const config = await this.slaConfigRepository.findById(id);
    if (!config) {
      throw new NotFoundException('SLA configuration not found');
    }

    await this.slaConfigRepository.delete(id);
  }

  /**
   * Get SLA configuration for a ticket based on category and priority
   */
  async getSlaForTicket(
    category: SlaCategory,
    priority: SlaPriority,
  ): Promise<SlaConfiguration | null> {
    return this.slaConfigRepository.findByCategoryAndPriority(
      category,
      priority,
    );
  }

  /**
   * Check if SLA is breached for a ticket/case
   */
  async checkSlaBreached(
    category: SlaCategory,
    priority: SlaPriority,
    createdAt: Date,
    respondedAt: Date | null = null,
    resolvedAt: Date | null = null,
    escalatedAt: Date | null = null,
  ): Promise<SlaCheckResult> {
    const slaConfig = await this.slaConfigRepository.findByCategoryAndPriority(
      category,
      priority,
    );

    if (!slaConfig) {
      this.logger.warn(
        `No SLA configuration found for ${category}/${priority}`,
      );
      throw new NotFoundException(
        `SLA configuration not found for ${category}/${priority}`,
      );
    }

    const now = new Date();
    const responseTimeElapsedMs = respondedAt
      ? respondedAt.getTime() - createdAt.getTime()
      : now.getTime() - createdAt.getTime();

    const resolutionTimeElapsedMs = resolvedAt
      ? resolvedAt.getTime() - createdAt.getTime()
      : now.getTime() - createdAt.getTime();

    const isResponseBreached = slaConfig.isBreachedResponse(
      createdAt,
      respondedAt,
    );
    const isResolutionBreached = slaConfig.isBreachedResolution(
      createdAt,
      resolvedAt,
    );
    const shouldEscalate = slaConfig.shouldEscalate(createdAt, escalatedAt);

    const responseTimeRemainingMs = Math.max(
      0,
      slaConfig.responseTimeMs - responseTimeElapsedMs,
    );
    const resolutionTimeRemainingMs = Math.max(
      0,
      slaConfig.resolutionTimeMs - resolutionTimeElapsedMs,
    );

    return {
      slaConfig,
      isResponseBreached,
      isResolutionBreached,
      shouldEscalate,
      responseTimeElapsedMs,
      resolutionTimeElapsedMs,
      responseTimeRemainingMs,
      resolutionTimeRemainingMs,
    };
  }

  private toResponseDto(config: SlaConfiguration): SlaConfigurationResponseDto {
    return {
      id: config.id,
      name: config.name,
      category: config.category,
      priority: config.priority,
      responseTimeMinutes: config.responseTimeMinutes,
      resolutionTimeMinutes: config.resolutionTimeMinutes,
      escalationAfterMinutes: config.escalationAfterMinutes,
      isActive: config.isActive,
      businessHoursOnly: config.businessHoursOnly,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    };
  }
}
