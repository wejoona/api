import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsNumber,
  IsObject,
  Min,
} from 'class-validator';
import { SubBusinessType } from '../../domain/entities/sub-business.entity';

export class CreateSubBusinessDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(SubBusinessType)
  type: SubBusinessType;

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
