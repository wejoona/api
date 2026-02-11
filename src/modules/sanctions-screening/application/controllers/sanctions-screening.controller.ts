import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { SanctionsScreeningService } from '../services/sanctions-screening.service';
import {
  ScreenIndividualDto,
  ScreenEntityDto,
  BatchScreenDto,
  ScreenTransferDto,
  ReviewMatchDto,
  GetStatisticsDto,
} from '../dto/screening.dto';

/**
 * Sanctions Screening Controller
 *
 * REST API endpoints for sanctions screening operations.
 *
 * Endpoints:
 * - POST /sanctions-screening/individual - Screen an individual
 * - POST /sanctions-screening/entity - Screen an entity
 * - POST /sanctions-screening/batch - Batch screening
 * - POST /sanctions-screening/transfer - Screen before transfer
 * - POST /sanctions-screening/matches/:id/review - Review a match
 * - GET /sanctions-screening/matches/pending - Get pending matches
 * - GET /sanctions-screening/matches/:id/details - Get match details
 * - GET /sanctions-screening/users/:userId/history - Get user screening history
 * - GET /sanctions-screening/users/:userId/blocked - Check if user is blocked
 * - GET /sanctions-screening/statistics - Get screening statistics
 * - GET /sanctions-screening/health - Provider health check
 */
import { ApiTags } from '@nestjs/swagger';
@ApiTags('Sanctions Screening')
@Controller('sanctions-screening')
@UseGuards(JwtAuthGuard)
export class SanctionsScreeningController {
  constructor(
    private readonly sanctionsScreeningService: SanctionsScreeningService,
  ) {}

  /**
   * Screen an individual
   * Used during KYC onboarding and updates
   */
  @Post('individual')
  async screenIndividual(@Body() dto: ScreenIndividualDto) {
    return this.sanctionsScreeningService.screenIndividual(
      dto.userId,
      dto.name,
      dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
      dto.nationality,
      dto.identificationNumber,
      dto.phone,
    );
  }

  /**
   * Screen an entity/organization
   */
  @Post('entity')
  async screenEntity(@Body() dto: ScreenEntityDto) {
    return this.sanctionsScreeningService.screenEntity(
      dto.entityId,
      dto.name,
      dto.country,
      dto.registrationNumber,
    );
  }

  /**
   * Batch screen multiple entities
   */
  @Post('batch')
  async batchScreen(@Body() dto: BatchScreenDto) {
    return this.sanctionsScreeningService.batchScreen(dto.entities);
  }

  /**
   * Screen before high-value transfer
   */
  @Post('transfer')
  async screenTransfer(@Body() dto: ScreenTransferDto) {
    return this.sanctionsScreeningService.screenTransfer(
      dto.senderId,
      dto.senderName,
      dto.recipientId,
      dto.recipientName,
      dto.amount,
    );
  }

  /**
   * Review and resolve a match
   * Requires compliance officer role
   */
  @Post('matches/:id/review')
  async reviewMatch(
    @Param('id') matchId: string,
    @Body() dto: ReviewMatchDto,
    @CurrentUser() user: any,
  ) {
    return this.sanctionsScreeningService.reviewMatch(
      matchId,
      user.id,
      dto.decision,
      dto.notes,
    );
  }

  /**
   * Get pending matches for review queue
   */
  @Get('matches/pending')
  async getPendingMatches(
    @Query('minScore') minScore?: number,
    @Query('limit') limit?: number,
  ) {
    return this.sanctionsScreeningService.getPendingMatches(
      minScore,
      limit ? Number(limit) : undefined,
    );
  }

  /**
   * Get match details from provider
   */
  @Get('matches/:id/details')
  async getMatchDetails(@Param('id') matchId: string) {
    return this.sanctionsScreeningService.getMatchDetails(matchId);
  }

  /**
   * Get user screening history
   */
  @Get('users/:userId/history')
  async getUserScreeningHistory(@Param('userId') userId: string) {
    return this.sanctionsScreeningService.getUserScreeningHistory(userId);
  }

  /**
   * Check if user is blocked
   */
  @Get('users/:userId/blocked')
  async isUserBlocked(@Param('userId') userId: string) {
    const blocked = await this.sanctionsScreeningService.isUserBlocked(userId);
    return { userId, blocked };
  }

  /**
   * Get screening statistics
   */
  @Get('statistics')
  async getStatistics(@Query() dto: GetStatisticsDto) {
    return this.sanctionsScreeningService.getStatistics(
      new Date(dto.startDate),
      new Date(dto.endDate),
    );
  }

  /**
   * Provider health check
   */
  @Get('health')
  async healthCheck() {
    const healthy = await this.sanctionsScreeningService.healthCheck();
    return { healthy, timestamp: new Date() };
  }
}
