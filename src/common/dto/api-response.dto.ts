import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Standard API response wrapper.
 * Use for consistent response format across all endpoints.
 */
export class ApiResponseDto<T = any> {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiPropertyOptional()
  data?: T;

  @ApiPropertyOptional({ example: 'Operation completed successfully' })
  message?: string;

  @ApiPropertyOptional()
  meta?: Record<string, any>;

  static ok<T>(data?: T, message?: string): ApiResponseDto<T> {
    const response = new ApiResponseDto<T>();
    response.success = true;
    response.data = data;
    response.message = message;
    return response;
  }

  static error(message: string, meta?: Record<string, any>): ApiResponseDto {
    const response = new ApiResponseDto();
    response.success = false;
    response.message = message;
    response.meta = meta;
    return response;
  }
}
