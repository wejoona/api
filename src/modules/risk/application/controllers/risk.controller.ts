/**
 * Risk Controller
 * API endpoints for risk management
 */

import {
  Controller,
  Get,
  Post,
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
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { TransactionRiskService } from '../services/transaction-risk.service';
import { DeviceFingerprint } from '../../domain/interfaces/risk-assessment.types';
import { RiskRegisterDeviceDto, ScreenUserDto, AssessSessionDto } from '../dto';
import { v4 as uuidv4 } from 'uuid';

@ApiTags('Risk')
@ApiBearerAuth()
@Controller('risk')
@UseGuards(JwtAuthGuard)
export class RiskController {
  // Session risk cache: token → { data, expiresAt }
  private readonly sessionRiskCache = new Map<
    string,
    { data: any; expiresAt: Date }
  >();

  private static readonly SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes

  constructor(private readonly riskService: TransactionRiskService) {}

  @Post('session')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Assess session risk on app start' })
  @ApiResponse({ status: 200, description: 'Session risk assessed' })
  async assessSession(
    @CurrentUser() user: any,
    @Body() dto: AssessSessionDto,
  ) {
    // Register device
    const fingerprint: DeviceFingerprint = {
      deviceId: dto.deviceFingerprint,
      platform: 'ios',
      appVersion: dto.appVersion,
      ipAddress: dto.ipAddress,
    };
    const deviceResult = await this.riskService.registerDevice(
      user.id,
      fingerprint,
    );

    // Get user risk profile
    const profile = await this.riskService.getUserRiskProfile(user.id);

    const sessionRiskToken = uuidv4();
    const riskLevel = profile?.riskLevel ?? 'low';
    const deviceTrust = deviceResult?.deviceTrustScore ?? 80;

    const requiredActions: string[] = [];
    if (!deviceResult?.isKnownDevice) {
      requiredActions.push('re-verify_device');
    }
    if (deviceTrust < 50) {
      requiredActions.push('enhanced_verification');
    }

    const sessionData = {
      sessionRiskToken,
      riskLevel,
      deviceTrust,
      requiredActions,
    };

    // Store with TTL
    this.sessionRiskCache.set(sessionRiskToken, {
      data: sessionData,
      expiresAt: new Date(Date.now() + RiskController.SESSION_TTL_MS),
    });

    // Cleanup expired entries
    for (const [key, value] of this.sessionRiskCache) {
      if (new Date() > value.expiresAt) {
        this.sessionRiskCache.delete(key);
      }
    }

    return {
      success: true,
      data: sessionData,
    };
  }

  @Get('profile')
  @ApiOperation({ summary: 'Get current user risk profile' })
  @ApiResponse({ status: 200, description: 'Risk profile retrieved' })
  async getMyRiskProfile(@CurrentUser() user: any) {
    const profile = await this.riskService.getUserRiskProfile(user.id);
    return {
      success: true,
      data: profile,
    };
  }

  @Get('profile/:userId')
  @ApiOperation({ summary: 'Get user risk profile (admin)' })
  @ApiResponse({ status: 200, description: 'Risk profile retrieved' })
  async getUserRiskProfile(@Param('userId') userId: string) {
    const profile = await this.riskService.getUserRiskProfile(userId);
    return {
      success: true,
      data: profile,
    };
  }

  @Post('device/register')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Register device fingerprint' })
  @ApiResponse({ status: 200, description: 'Device registered' })
  async registerDevice(
    @CurrentUser() user: any,
    @Body() dto: RiskRegisterDeviceDto,
  ) {
    const fingerprint: DeviceFingerprint = {
      deviceId: dto.deviceId,
      platform: dto.platform,
      osVersion: dto.osVersion,
      appVersion: dto.appVersion,
      ipAddress: dto.ipAddress,
      userAgent: dto.userAgent,
      isEmulator: dto.isEmulator,
      isRooted: dto.isRooted,
    };

    const result = await this.riskService.registerDevice(user.id, fingerprint);
    return {
      success: true,
      data: result,
    };
  }

  @Post('screen')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Screen user against sanction lists' })
  @ApiResponse({ status: 200, description: 'Screening completed' })
  async screenUser(@CurrentUser() user: any, @Body() dto: ScreenUserDto) {
    const result = await this.riskService.screenUser({
      referenceId: user.id,
      firstName: dto.firstName,
      lastName: dto.lastName,
      middleName: dto.middleName,
      dateOfBirth: dto.dateOfBirth,
      nationality: dto.nationality,
      countryOfResidence: dto.countryOfResidence,
      idType: dto.idType,
      idNumber: dto.idNumber,
    });

    return {
      success: true,
      data: {
        screeningId: result.screeningId,
        status: result.status,
        totalMatches: result.totalMatches,
        matches: result.matches,
        screenedAt: result.screenedAt,
        listsScreened: result.listsScreened,
      },
    };
  }

  @Get('sanctions/lists')
  @ApiOperation({ summary: 'Get available sanction lists' })
  @ApiResponse({ status: 200, description: 'Sanction lists retrieved' })
  async getSanctionLists() {
    const result = await this.riskService.getAvailableSanctionLists();
    return {
      success: true,
      data: result.lists,
    };
  }

  @Get('health')
  @ApiOperation({ summary: 'Risk service health check' })
  @ApiResponse({ status: 200, description: 'Health status' })
  async healthCheck() {
    const result = await this.riskService.healthCheck();
    return {
      success: true,
      data: result,
    };
  }
}
