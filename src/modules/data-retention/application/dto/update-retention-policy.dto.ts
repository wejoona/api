import {
  IsOptional,
  IsInt,
  Min,
  IsBoolean,
  IsEnum,
  IsString,
} from 'class-validator';
import { RetentionAction } from '../../infrastructure/orm-entities/retention-policy.orm-entity';

export class UpdateRetentionPolicyDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  retentionDays?: number;

  @IsOptional()
  @IsEnum(RetentionAction)
  action?: RetentionAction;

  @IsOptional()
  @IsInt()
  @Min(0)
  gracePeriodDays?: number;

  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  complianceRequirement?: string;
}
