import {
  Controller,
  Get,
  Put,
  Param,
  Body,
  UseGuards,
  Query,
  HttpException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import {
  FeatureFlagService,
  FeatureFlagResponse,
} from '../services/feature-flag.service';
import { UpdateFeatureFlagDto } from '../dto/requests/update-feature-flag.dto';

interface UserPayload {
  id: string;
  phone: string;
  countryCode?: string;
}

import { ApiTags } from '@nestjs/swagger';
@ApiTags('Feature Flags')
@Controller('feature-flags')
export class FeatureFlagController {
  constructor(private readonly featureFlagService: FeatureFlagService) {}

  /**
   * Check if a feature is enabled for the current user.
   * Public endpoint (no auth required for basic checks).
   */
  @Get('check/:key')
  @UseGuards(JwtAuthGuard)
  async checkFeature(
    @Param('key') key: string,
    @CurrentUser() user: UserPayload,
    @Query('appVersion') appVersion?: string,
    @Query('platform') platform?: string,
  ): Promise<{ key: string; enabled: boolean }> {
    try {
      const enabled = await this.featureFlagService.isEnabled(key, {
        userId: user.id,
        countryCode: user.countryCode,
        appVersion,
        platform,
      });

      return { key, enabled };
    } catch (error) {
      this.throwDependencyUnavailable(error);
    }
  }

  /**
   * Get all feature flag statuses for the current user context.
   * Useful for mobile app initialization.
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMyFeatureFlags(
    @CurrentUser() user: UserPayload,
    @Query('appVersion') appVersion?: string,
    @Query('platform') platform?: string,
  ): Promise<Record<string, boolean>> {
    try {
      return await this.featureFlagService.getEnabledFlagsForContext({
        userId: user.id,
        countryCode: user.countryCode,
        appVersion,
        platform,
      });
    } catch (error) {
      this.throwDependencyUnavailable(error);
    }
  }

  private throwDependencyUnavailable(error: unknown): never {
    if (error instanceof HttpException) {
      throw error;
    }

    throw new ServiceUnavailableException({
      code: 'FEATURE_FLAG_DEPENDENCY_UNAVAILABLE',
      message:
        'Feature flags are temporarily unavailable. Cached app defaults may be used.',
      dependency: 'feature_flag_store',
      retryable: true,
      supportReviewRequired: false,
    });
  }
}

@ApiTags('Feature Flags Admin')
@Controller('admin/feature-flags')
@UseGuards(JwtAuthGuard)
export class AdminFeatureFlagController {
  constructor(private readonly featureFlagService: FeatureFlagService) {}

  @Get()
  async getAllFlags(): Promise<FeatureFlagResponse[]> {
    return this.featureFlagService.getAllFlags();
  }

  @Get(':key')
  async getFlag(@Param('key') key: string): Promise<FeatureFlagResponse> {
    const flag = await this.featureFlagService.getFlag(key);
    return {
      id: flag.id,
      key: flag.key,
      name: flag.name,
      description: flag.description,
      isEnabled: flag.isEnabled,
      rolloutPercentage: flag.rolloutPercentage,
      enabledUserIds: flag.enabledUserIds,
      disabledUserIds: flag.disabledUserIds,
      enabledCountries: flag.enabledCountries,
      minAppVersion: flag.minAppVersion,
      platforms: flag.platforms,
      startsAt: flag.startsAt,
      endsAt: flag.endsAt,
      createdAt: flag.createdAt,
      updatedAt: flag.updatedAt,
    };
  }

  @Put(':key')
  async updateFlag(
    @Param('key') key: string,
    @Body() dto: UpdateFeatureFlagDto,
  ): Promise<{ success: boolean; message: string }> {
    await this.featureFlagService.updateFlag(key, {
      ...dto,
      startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
      endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
    });
    return { success: true, message: 'Feature flag updated successfully' };
  }
}
