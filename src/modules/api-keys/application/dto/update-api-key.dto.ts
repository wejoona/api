import {
  IsString,
  IsOptional,
  IsArray,
  IsNumber,
  IsDateString,
  IsBoolean,
  Min,
  Max,
  MaxLength,
  ArrayMaxSize,
  IsIP,
} from 'class-validator';

export class UpdateApiKeyDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(100)
  permissions?: string[];

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10000)
  rateLimit?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsDateString()
  expiresAt?: string | null;

  @IsOptional()
  @IsArray()
  @IsIP(undefined, { each: true })
  @ArrayMaxSize(50)
  ipWhitelist?: string[] | null;
}
