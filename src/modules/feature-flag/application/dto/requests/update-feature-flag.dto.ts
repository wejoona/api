import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsArray,
  IsUUID,
  IsDateString,
  Min,
  Max,
} from 'class-validator';

export class UpdateFeatureFlagDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  rolloutPercentage?: number;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  enabledUserIds?: string[];

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  disabledUserIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  enabledCountries?: string[];

  @IsOptional()
  @IsString()
  minAppVersion?: string | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  platforms?: string[];

  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @IsOptional()
  @IsDateString()
  endsAt?: string;
}
