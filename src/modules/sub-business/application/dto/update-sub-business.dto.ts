import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsObject,
  Min,
} from 'class-validator';
import { SubBusinessType } from '../../domain/entities/sub-business.entity';

export class UpdateSubBusinessDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(SubBusinessType)
  type?: SubBusinessType;

  @IsOptional()
  @IsObject()
  permissions?: {
    canSend?: boolean;
    canReceive?: boolean;
    canViewTransactions?: boolean;
    canManageStaff?: boolean;
  };

  @IsOptional()
  @IsNumber()
  @Min(0)
  spendingLimit?: number;
}
