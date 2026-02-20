import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { Request } from 'express';
import { ConsentService } from '../services/consent.service';
import { GrantConsentDto } from '../dto/grant-consent.dto';
import { RevokeConsentDto } from '../dto/revoke-consent.dto';
import {
  ConsentStatusResponseDto,
  ConsentHistoryResponseDto,
} from '../dto/consent-status.dto';
import { ConsentType } from '../../domain/enums/consent-type.enum';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';

@ApiTags('Consent')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('consent')
export class ConsentController {
  constructor(private readonly consentService: ConsentService) {}

  @Post('grant')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Grant consent',
    description:
      'Record user consent for a specific data processing purpose. Idempotent — granting already-active consent returns the existing record.',
  })
  @ApiResponse({ status: 200, description: 'Consent granted successfully' })
  async grantConsent(@Body() dto: GrantConsentDto, @Req() req: Request) {
    const userId = (req as any).user?.id || (req as any).user?.sub;
    const ipAddress =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.ip ||
      '0.0.0.0';
    const userAgent = req.headers['user-agent'] || null;

    const record = await this.consentService.grantConsent({
      userId,
      consentType: dto.consentType,
      ipAddress,
      userAgent,
      version: dto.version,
    });

    return {
      id: record.id,
      consentType: record.consentType,
      granted: record.granted,
      grantedAt: record.grantedAt,
      version: record.version,
    };
  }

  @Post('revoke')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Revoke consent',
    description:
      'Revoke a previously granted consent. Cannot revoke terms_of_service or privacy_policy.',
  })
  @ApiResponse({ status: 200, description: 'Consent revoked successfully' })
  @ApiResponse({
    status: 400,
    description: 'Cannot revoke mandatory consent or no active consent found',
  })
  async revokeConsent(@Body() dto: RevokeConsentDto, @Req() req: Request) {
    const userId = (req as any).user?.id || (req as any).user?.sub;
    const ipAddress =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.ip ||
      '0.0.0.0';
    const userAgent = req.headers['user-agent'] || null;

    const record = await this.consentService.revokeConsent({
      userId,
      consentType: dto.consentType,
      ipAddress,
      userAgent,
    });

    return {
      id: record.id,
      consentType: record.consentType,
      granted: record.granted,
      revokedAt: record.revokedAt,
    };
  }

  @Get('status')
  @ApiOperation({
    summary: 'Get consent status',
    description:
      'Returns current consent state for all consent types, plus KYC readiness flag.',
  })
  @ApiResponse({ status: 200, type: ConsentStatusResponseDto })
  async getStatus(@Req() req: Request): Promise<ConsentStatusResponseDto> {
    const userId = (req as any).user?.id || (req as any).user?.sub;
    return this.consentService.getConsentStatus(userId);
  }

  @Get('history')
  @ApiOperation({
    summary: 'Get consent history',
    description:
      'Returns the full audit trail of consent grants and revocations.',
  })
  @ApiQuery({
    name: 'consentType',
    required: false,
    enum: ConsentType,
  })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, type: ConsentHistoryResponseDto })
  async getHistory(
    @Req() req: Request,
    @Query('consentType') consentType?: ConsentType,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ): Promise<ConsentHistoryResponseDto> {
    const userId = (req as any).user?.id || (req as any).user?.sub;
    return this.consentService.getConsentHistory(
      userId,
      consentType,
      limit || 50,
      offset || 0,
    );
  }
}
