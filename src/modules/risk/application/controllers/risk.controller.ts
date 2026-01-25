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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { TransactionRiskService } from '../services/transaction-risk.service';
import {
  DeviceFingerprint,
} from '../../domain/interfaces/risk-assessment.types';

class RegisterDeviceDto {
  deviceId: string;
  platform: 'ios' | 'android' | 'web';
  osVersion?: string;
  appVersion?: string;
  ipAddress?: string;
  userAgent?: string;
  isEmulator?: boolean;
  isRooted?: boolean;
}

class ScreenUserDto {
  firstName: string;
  lastName: string;
  middleName?: string;
  dateOfBirth?: string;
  nationality?: string;
  countryOfResidence?: string;
  idType?: string;
  idNumber?: string;
}

@ApiTags('Risk')
@ApiBearerAuth()
@Controller('risk')
@UseGuards(JwtAuthGuard)
export class RiskController {
  constructor(private readonly riskService: TransactionRiskService) {}

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
    @Body() dto: RegisterDeviceDto,
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
  async screenUser(
    @CurrentUser() user: any,
    @Body() dto: ScreenUserDto,
  ) {
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
