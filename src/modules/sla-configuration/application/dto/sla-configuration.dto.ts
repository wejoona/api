import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsNumber,
  Min,
  IsOptional,
  IsBoolean,
} from 'class-validator';
import { SlaCategory, SlaPriority } from '../../domain/entities/sla-configuration.entity';

export class CreateSlaConfigurationDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(SlaCategory)
  @IsNotEmpty()
  category: SlaCategory;

  @IsEnum(SlaPriority)
  @IsNotEmpty()
  priority: SlaPriority;

  @IsNumber()
  @Min(1)
  responseTimeMinutes: number;

  @IsNumber()
  @Min(1)
  resolutionTimeMinutes: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  escalationAfterMinutes?: number;

  @IsOptional()
  @IsBoolean()
  businessHoursOnly?: boolean;
}

export class UpdateSlaConfigurationDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  responseTimeMinutes?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  resolutionTimeMinutes?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  escalationAfterMinutes?: number;

  @IsOptional()
  @IsBoolean()
  businessHoursOnly?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class SlaConfigurationResponseDto {
  id: string;
  name: string;
  category: SlaCategory;
  priority: SlaPriority;
  responseTimeMinutes: number;
  resolutionTimeMinutes: number;
  escalationAfterMinutes: number | null;
  isActive: boolean;
  businessHoursOnly: boolean;
  createdAt: Date;
  updatedAt: Date;
}
