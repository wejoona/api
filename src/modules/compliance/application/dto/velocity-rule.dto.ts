import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsArray,
  Min,
  Max,
  ArrayNotEmpty,
  ValidateIf,
} from 'class-validator';
import {
  VelocityRuleType,
  VelocityRuleAction,
  UserTier,
} from '../../domain/entities/velocity-rule.entity';

/**
 * DTO for creating a new velocity rule
 */
export class CreateVelocityRuleDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(VelocityRuleType)
  ruleType: VelocityRuleType;

  @ValidateIf((o) =>
    [
      VelocityRuleType.DAILY_LIMIT,
      VelocityRuleType.WEEKLY_LIMIT,
      VelocityRuleType.MONTHLY_LIMIT,
      VelocityRuleType.VELOCITY,
    ].includes(o.ruleType),
  )
  @IsNumber()
  @Min(0)
  thresholdAmount?: number;

  @ValidateIf((o) =>
    [VelocityRuleType.TRANSACTION_COUNT, VelocityRuleType.VELOCITY].includes(
      o.ruleType,
    ),
  )
  @IsNumber()
  @Min(1)
  thresholdCount?: number;

  @IsNumber()
  @Min(0.1)
  @Max(8760) // Max 1 year in hours
  timeWindowHours: number;

  @IsEnum(VelocityRuleAction)
  action: VelocityRuleAction;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  appliesToTier: UserTier[];
}

/**
 * DTO for updating an existing velocity rule
 */
export class UpdateVelocityRuleDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(VelocityRuleType)
  ruleType?: VelocityRuleType;

  @IsOptional()
  @IsNumber()
  @Min(0)
  thresholdAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  thresholdCount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Max(8760)
  timeWindowHours?: number;

  @IsOptional()
  @IsEnum(VelocityRuleAction)
  action?: VelocityRuleAction;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  appliesToTier?: UserTier[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

/**
 * Response DTO for velocity rule
 */
export class VelocityRuleResponseDto {
  id: string;
  name: string;
  description: string | null;
  ruleType: VelocityRuleType;
  thresholdAmount: number | null;
  thresholdCount: number | null;
  timeWindowHours: number;
  action: VelocityRuleAction;
  appliesToTier: UserTier[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Query parameters for listing velocity rules
 */
export class ListVelocityRulesQueryDto {
  @IsOptional()
  @IsBoolean()
  activeOnly?: boolean;

  @IsOptional()
  @IsEnum(VelocityRuleType)
  ruleType?: VelocityRuleType;

  @IsOptional()
  @IsString()
  tier?: UserTier;
}
