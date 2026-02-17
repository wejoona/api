import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Standard error detail for structured error responses.
 */
export class ApiErrorDto {
  @ApiProperty({ example: 'BAD_REQUEST', description: 'Machine-readable error code' })
  code: string;

  @ApiProperty({ example: 'Validation failed', description: 'Human-readable message' })
  message: string;

  @ApiPropertyOptional({
    example: ['amount must be a positive number'],
    description: 'Field-level validation errors or additional context',
    type: [String],
  })
  details?: string[];
}

/**
 * Standard pagination metadata.
 */
export class ApiPaginationMeta {
  @ApiProperty({ example: 1 }) page: number;
  @ApiProperty({ example: 20 }) limit: number;
  @ApiProperty({ example: 150 }) total: number;
  @ApiProperty({ example: 8 }) totalPages: number;
  @ApiPropertyOptional({ example: true }) hasNext?: boolean;
  @ApiPropertyOptional({ example: false }) hasPrevious?: boolean;
}

/**
 * Standard API response envelope.
 *
 * **Success:**
 * ```json
 * { "success": true, "data": { ... }, "meta": { "page": 1, ... } }
 * ```
 *
 * **Error:**
 * ```json
 * { "success": false, "error": { "code": "...", "message": "...", "details": [...] } }
 * ```
 *
 * All controllers should return through this envelope for consistency.
 */
export class ApiResponseDto<T = any> {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiPropertyOptional({ description: 'Response payload' })
  data?: T;

  @ApiPropertyOptional({ example: 'Operation completed successfully' })
  message?: string;

  @ApiPropertyOptional({ description: 'Pagination or request metadata' })
  meta?: ApiPaginationMeta | Record<string, any>;

  @ApiPropertyOptional({ description: 'Error details (only on failure)', type: ApiErrorDto })
  error?: ApiErrorDto;

  static ok<T>(data?: T, message?: string, meta?: Record<string, any>): ApiResponseDto<T> {
    const response = new ApiResponseDto<T>();
    response.success = true;
    response.data = data;
    response.message = message;
    if (meta) response.meta = meta;
    return response;
  }

  static paginated<T>(
    data: T[],
    page: number,
    limit: number,
    total: number,
  ): ApiResponseDto<T[]> {
    const totalPages = Math.ceil(total / limit);
    const response = new ApiResponseDto<T[]>();
    response.success = true;
    response.data = data;
    response.meta = {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
    };
    return response;
  }

  static error(
    message: string,
    code: string = 'INTERNAL_ERROR',
    details?: string[],
  ): ApiResponseDto {
    const response = new ApiResponseDto();
    response.success = false;
    response.error = { code, message, details };
    return response;
  }
}
