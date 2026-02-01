import {
  Controller,
  Post,
  Delete,
  Get,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards';
import { Roles, RolesGuard } from '../guards/roles.guard';
import { RateLimitService, CustomRateLimitConfig } from './rate-limit.service';
import { RateLimitGuard } from './rate-limit.guard';
import { RateLimitPresets } from './rate-limit.decorator';

/**
 * Admin controller for managing rate limits.
 * This is an example implementation - adapt to your admin module structure.
 *
 * Features:
 * - Set custom rate limits for API keys
 * - Remove custom rate limits
 * - Reset rate limits for users
 * - View rate limit status
 */
@ApiTags('Admin - Rate Limiting')
@Controller('admin/rate-limits')
@UseGuards(JwtAuthGuard, RolesGuard, RateLimitGuard)
@ApiBearerAuth()
@Roles('admin', 'super_admin')
export class RateLimitAdminController {
  constructor(private readonly rateLimitService: RateLimitService) {}

  /**
   * Set custom rate limit for an API key.
   * This allows enterprise customers to have higher limits.
   */
  @Post('api-keys/:apiKeyId')
  @HttpCode(HttpStatus.OK)
  @RateLimitPresets.admin()
  @ApiOperation({
    summary: 'Set custom rate limit for API key',
    description:
      'Configure custom rate limits for a specific API key. Use endpoint="*" for all endpoints.',
  })
  @ApiResponse({
    status: 200,
    description: 'Custom rate limit set successfully',
  })
  async setApiKeyRateLimit(
    @Param('apiKeyId') apiKeyId: string,
    @Body()
    body: {
      endpoint: string;
      limit: number;
      windowSeconds: number;
    },
  ): Promise<{ success: boolean; message: string }> {
    const config: CustomRateLimitConfig = {
      limit: body.limit,
      windowSeconds: body.windowSeconds,
    };

    await this.rateLimitService.setCustomLimitForApiKey(
      apiKeyId,
      body.endpoint,
      config,
    );

    return {
      success: true,
      message: `Custom rate limit set for API key ${apiKeyId} on ${body.endpoint}`,
    };
  }

  /**
   * Remove custom rate limit for an API key.
   * Falls back to default rate limits.
   */
  @Delete('api-keys/:apiKeyId/:endpoint')
  @HttpCode(HttpStatus.OK)
  @RateLimitPresets.admin()
  @ApiOperation({
    summary: 'Remove custom rate limit for API key',
    description:
      'Remove custom rate limit configuration. Endpoint will use default limits.',
  })
  @ApiResponse({
    status: 200,
    description: 'Custom rate limit removed successfully',
  })
  async removeApiKeyRateLimit(
    @Param('apiKeyId') apiKeyId: string,
    @Param('endpoint') endpoint: string,
  ): Promise<{ success: boolean; message: string }> {
    // Decode endpoint (handle URL encoding for paths like /api/v1/transfers)
    const decodedEndpoint = decodeURIComponent(endpoint);

    await this.rateLimitService.removeCustomLimitForApiKey(
      apiKeyId,
      decodedEndpoint,
    );

    return {
      success: true,
      message: `Custom rate limit removed for API key ${apiKeyId} on ${decodedEndpoint}`,
    };
  }

  /**
   * Reset rate limit for a user.
   * Useful when a user is incorrectly rate limited or for testing.
   */
  @Post('reset/user/:userId/:endpoint')
  @HttpCode(HttpStatus.OK)
  @RateLimitPresets.admin()
  @ApiOperation({
    summary: 'Reset rate limit for user',
    description:
      'Reset rate limit counter for a specific user and endpoint. Use with caution.',
  })
  @ApiResponse({ status: 200, description: 'Rate limit reset successfully' })
  async resetUserRateLimit(
    @Param('userId') userId: string,
    @Param('endpoint') endpoint: string,
  ): Promise<{ success: boolean; message: string }> {
    const decodedEndpoint = decodeURIComponent(endpoint);
    const key = this.rateLimitService.getUserKey(userId, decodedEndpoint);

    await this.rateLimitService.reset(key);

    return {
      success: true,
      message: `Rate limit reset for user ${userId} on ${decodedEndpoint}`,
    };
  }

  /**
   * Reset rate limit for an IP address.
   * Useful for unblocking legitimate traffic.
   */
  @Post('reset/ip/:ip/:endpoint')
  @HttpCode(HttpStatus.OK)
  @RateLimitPresets.admin()
  @ApiOperation({
    summary: 'Reset rate limit for IP address',
    description:
      'Reset rate limit counter for a specific IP and endpoint. Use when legitimate traffic is blocked.',
  })
  @ApiResponse({ status: 200, description: 'Rate limit reset successfully' })
  async resetIpRateLimit(
    @Param('ip') ip: string,
    @Param('endpoint') endpoint: string,
  ): Promise<{ success: boolean; message: string }> {
    const decodedEndpoint = decodeURIComponent(endpoint);
    const key = this.rateLimitService.getIpKey(ip, decodedEndpoint);

    await this.rateLimitService.reset(key);

    return {
      success: true,
      message: `Rate limit reset for IP ${ip} on ${decodedEndpoint}`,
    };
  }

  /**
   * Get current rate limit status for a user.
   * Shows remaining quota and reset time.
   */
  @Get('status/user/:userId/:endpoint')
  @RateLimitPresets.admin()
  @ApiOperation({
    summary: 'Get rate limit status for user',
    description: 'Check current rate limit status without consuming a token.',
  })
  @ApiResponse({
    status: 200,
    description: 'Rate limit status retrieved',
  })
  async getUserRateLimitStatus(
    @Param('userId') userId: string,
    @Param('endpoint') endpoint: string,
    @Body() body: { limit: number; windowSeconds: number },
  ): Promise<{
    allowed: boolean;
    limit: number;
    remaining: number;
    resetAt: string;
    usagePercent: number;
  }> {
    const decodedEndpoint = decodeURIComponent(endpoint);
    const key = this.rateLimitService.getUserKey(userId, decodedEndpoint);

    const status = await this.rateLimitService.getStatus(
      key,
      body.limit,
      body.windowSeconds,
    );

    const usagePercent =
      ((status.limit - status.remaining) / status.limit) * 100;

    return {
      allowed: status.allowed,
      limit: status.limit,
      remaining: status.remaining,
      resetAt: new Date(status.resetAt * 1000).toISOString(),
      usagePercent: parseFloat(usagePercent.toFixed(2)),
    };
  }

  /**
   * Get custom rate limit for an API key.
   */
  @Get('api-keys/:apiKeyId/:endpoint')
  @RateLimitPresets.admin()
  @ApiOperation({
    summary: 'Get custom rate limit for API key',
    description:
      'Retrieve custom rate limit configuration for an API key and endpoint.',
  })
  @ApiResponse({
    status: 200,
    description: 'Custom rate limit configuration',
  })
  async getApiKeyRateLimit(
    @Param('apiKeyId') apiKeyId: string,
    @Param('endpoint') endpoint: string,
  ): Promise<
    | {
        hasCustomLimit: true;
        limit: number;
        windowSeconds: number;
      }
    | {
        hasCustomLimit: false;
        message: string;
      }
  > {
    const decodedEndpoint = decodeURIComponent(endpoint);
    const customLimit = await this.rateLimitService.getCustomLimitForApiKey(
      apiKeyId,
      decodedEndpoint,
    );

    if (customLimit) {
      return {
        hasCustomLimit: true,
        limit: customLimit.limit,
        windowSeconds: customLimit.windowSeconds,
      };
    }

    return {
      hasCustomLimit: false,
      message: 'No custom rate limit configured for this API key and endpoint',
    };
  }
}

/**
 * Example usage in API Keys module:
 *
 * // When creating/updating an API key with custom limits
 * @Post('api-keys/:id/rate-limits')
 * async configureRateLimits(
 *   @Param('id') apiKeyId: string,
 *   @Body() dto: ConfigureRateLimitsDto
 * ) {
 *   for (const rule of dto.rules) {
 *     await this.rateLimitService.setCustomLimitForApiKey(
 *       apiKeyId,
 *       rule.endpoint,
 *       { limit: rule.limit, windowSeconds: rule.windowSeconds }
 *     );
 *   }
 * }
 */
