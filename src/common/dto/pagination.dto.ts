import { IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Common pagination query DTO.
 * Usage: add `@Query() pagination: PaginationQueryDto` to any list endpoint.
 */
export class PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Page number (1-based)', default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  get skip(): number {
    return ((this.page || 1) - 1) * (this.limit || 20);
  }

  get take(): number {
    return this.limit || 20;
  }
}

/**
 * Pagination metadata for responses.
 */
export class PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;

  static create(page: number, limit: number, total: number): PaginationMeta {
    const meta = new PaginationMeta();
    meta.page = page;
    meta.limit = limit;
    meta.total = total;
    meta.totalPages = Math.ceil(total / limit);
    meta.hasNext = page < meta.totalPages;
    meta.hasPrevious = page > 1;
    return meta;
  }
}
