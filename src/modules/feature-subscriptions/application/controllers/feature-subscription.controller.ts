import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  HttpCode,
  HttpStatus,
  HttpException,
  ParseIntPipe,
  Post,
  Query,
  ServiceUnavailableException,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { User } from '../../../user/application/domain/entities/user.entity';
import {
  CreateFeatureSubscriptionDto,
  FeatureSubscriptionListResponseDto,
  FeatureSubscriptionResponseDto,
} from '../dto';
import { FeatureSubscriptionService } from '../services';

@ApiTags('Feature Subscriptions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('feature-subscriptions')
export class FeatureSubscriptionController {
  constructor(private readonly service: FeatureSubscriptionService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async subscribe(
    @CurrentUser() user: User,
    @Body() dto: CreateFeatureSubscriptionDto,
  ): Promise<FeatureSubscriptionResponseDto> {
    try {
      const subscription = await this.service.subscribe(user.id, dto);
      return FeatureSubscriptionResponseDto.fromEntity(subscription);
    } catch (error) {
      this.throwDependencyUnavailable(error);
    }
  }

  @Get()
  async listMine(
    @CurrentUser() user: User,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ): Promise<FeatureSubscriptionListResponseDto> {
    const normalizedPage = Math.max(1, page);
    const normalizedLimit = Math.min(Math.max(1, limit), 100);
    try {
      const result = await this.service.listMine(user.id, {
        page: normalizedPage,
        limit: normalizedLimit,
      });
      return FeatureSubscriptionListResponseDto.fromEntities(
        result.items,
        result.total,
        normalizedPage,
        normalizedLimit,
      );
    } catch (error) {
      this.throwDependencyUnavailable(error);
    }
  }

  private throwDependencyUnavailable(error: unknown): never {
    if (error instanceof HttpException) {
      throw error;
    }

    throw new ServiceUnavailableException({
      code: 'FEATURE_SUBSCRIPTION_DEPENDENCY_UNAVAILABLE',
      message:
        'Feature subscriptions are temporarily unavailable. Please try again later.',
      dependency: 'feature_subscription_store',
      retryable: true,
      supportReviewRequired: false,
    });
  }
}
