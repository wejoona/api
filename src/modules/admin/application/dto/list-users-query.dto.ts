import {
  IsOptional,
  IsInt,
  Min,
  Max,
  IsString,
  MaxLength,
  MinLength,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ListUsersQueryDto {
  @ApiPropertyOptional({
    description: 'Page number for pagination',
    minimum: 1,
    maximum: 1000,
    default: 1,
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Page must be an integer' })
  @Min(1, { message: 'Page must be at least 1' })
  @Max(1000, { message: 'Page must not exceed 1000' })
  page?: number;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    minimum: 1,
    maximum: 100,
    default: 50,
    example: 50,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Limit must be an integer' })
  @Min(1, { message: 'Limit must be at least 1' })
  @Max(100, { message: 'Limit must not exceed 100' })
  limit?: number;

  @ApiPropertyOptional({
    description: 'Filter by user status',
    example: 'active',
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({
    description: 'Filter by KYC status',
    example: 'approved',
  })
  @IsOptional()
  @IsString()
  kycStatus?: string;

  @ApiPropertyOptional({
    description: 'Filter by user role',
    example: 'user',
  })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiPropertyOptional({
    description: 'Search query for phone, email, firstName, or lastName',
    maxLength: 100,
    example: 'john',
  })
  @IsOptional()
  @IsString({ message: 'Search must be a string' })
  @MinLength(3, {
    message: 'Search query must be at least 3 characters long',
  })
  @MaxLength(100, { message: 'Search query must not exceed 100 characters' })
  @Matches(/^[a-zA-Z0-9\s@.+\-]+$/, {
    message:
      'Search query contains invalid characters. Only alphanumeric characters, spaces, @, ., +, and - are allowed',
  })
  search?: string;
}
