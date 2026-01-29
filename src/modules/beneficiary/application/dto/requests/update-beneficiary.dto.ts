import {
  IsString,
  IsOptional,
  IsBoolean,
  MaxLength,
  IsObject,
} from 'class-validator';

export class UpdateBeneficiaryDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsBoolean()
  isFavorite?: boolean;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
