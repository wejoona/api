import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  HttpStatus,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { ReferralService } from '../domain/services/referral.service';
import { ApplyReferralCodeRequest } from '../dto/requests/apply-referral-code.request';
import {
  ReferralResponse,
  ReferralStatsResponse,
  LeaderboardResponse,
} from '../dto/responses/referral.response';

@ApiTags('Referrals')
@Controller('referrals')
export class ReferralController {
  constructor(private readonly referralService: ReferralService) {}

  @Get('code')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get or generate user referral code' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Referral code returned' })
  async getReferralCode(
    @CurrentUser('id') userId: string,
  ): Promise<{ code: string; link: string }> {
    const code = await this.referralService.getUserReferralCode(userId);
    return {
      code,
      link: `https://joonapay.com/invite/${code}`,
    };
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user referral statistics' })
  @ApiResponse({ status: HttpStatus.OK, type: ReferralStatsResponse })
  async getStats(
    @CurrentUser('id') userId: string,
  ): Promise<ReferralStatsResponse> {
    const stats = await this.referralService.getUserStats(userId);
    if (!stats) {
      // Generate code if doesn't exist
      const code = await this.referralService.generateReferralCode(userId);
      return {
        referralCode: code,
        totalReferrals: 0,
        completedReferrals: 0,
        pendingReferrals: 0,
        totalEarnings: '0',
        pendingEarnings: '0',
        earningsCurrency: 'USDC',
        tier: 'bronze',
        referralLink: `https://joonapay.com/invite/${code}`,
      };
    }

    return {
      referralCode: stats.referralCode,
      totalReferrals: stats.totalReferrals,
      completedReferrals: stats.completedReferrals,
      pendingReferrals: stats.pendingReferrals,
      totalEarnings: stats.totalEarnings.toString(),
      pendingEarnings: stats.pendingEarnings.toString(),
      earningsCurrency: stats.earningsCurrency,
      tier: stats.tier,
      referralLink: `https://joonapay.com/invite/${stats.referralCode}`,
    };
  }

  @Get('history')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user referral history' })
  @ApiResponse({ status: HttpStatus.OK, type: [ReferralResponse] })
  async getHistory(
    @CurrentUser('id') userId: string,
  ): Promise<ReferralResponse[]> {
    const referrals = await this.referralService.getUserReferrals(userId);
    return referrals.map((r) => ({
      id: r.id,
      referrerId: r.referrerId,
      referredId: r.referredId,
      referralCode: r.referralCode,
      status: r.status,
      referrerReward: r.referrerReward.toString(),
      referredReward: r.referredReward.toString(),
      rewardCurrency: r.rewardCurrency,
      completedAt: r.completedAt,
      rewardedAt: r.rewardedAt,
      expiresAt: r.expiresAt,
      createdAt: r.createdAt,
    }));
  }

  @Post('apply')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Apply a referral code' })
  @ApiResponse({ status: HttpStatus.CREATED, type: ReferralResponse })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid or already used code',
  })
  async applyCode(
    @CurrentUser('id') userId: string,
    @Body() dto: ApplyReferralCodeRequest,
  ): Promise<ReferralResponse> {
    const referral = await this.referralService.applyReferralCode(
      userId,
      dto.code,
    );
    return {
      id: referral.id,
      referrerId: referral.referrerId,
      referredId: referral.referredId,
      referralCode: referral.referralCode,
      status: referral.status,
      referrerReward: referral.referrerReward.toString(),
      referredReward: referral.referredReward.toString(),
      rewardCurrency: referral.rewardCurrency,
      completedAt: referral.completedAt,
      rewardedAt: referral.rewardedAt,
      expiresAt: referral.expiresAt,
      createdAt: referral.createdAt,
    };
  }

  @Get('leaderboard')
  @ApiOperation({ summary: 'Get referral leaderboard' })
  @ApiResponse({ status: HttpStatus.OK, type: LeaderboardResponse })
  async getLeaderboard(
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ): Promise<LeaderboardResponse> {
    const topReferrers = await this.referralService.getLeaderboard(limit);
    return {
      entries: topReferrers.map((stats, index) => ({
        rank: index + 1,
        userId: stats.userId,
        completedReferrals: stats.completedReferrals,
        tier: stats.tier,
      })),
    };
  }
}
