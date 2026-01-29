import { SlaConfiguration, SlaCategory, SlaPriority } from '../entities/sla-configuration.entity';

export abstract class SlaConfigurationRepository {
  abstract findById(id: string): Promise<SlaConfiguration | null>;
  abstract findByCategoryAndPriority(
    category: SlaCategory,
    priority: SlaPriority,
  ): Promise<SlaConfiguration | null>;
  abstract findByCategory(category: SlaCategory): Promise<SlaConfiguration[]>;
  abstract findAllActive(): Promise<SlaConfiguration[]>;
  abstract findAll(): Promise<SlaConfiguration[]>;
  abstract save(config: SlaConfiguration): Promise<SlaConfiguration>;
  abstract delete(id: string): Promise<void>;
}
