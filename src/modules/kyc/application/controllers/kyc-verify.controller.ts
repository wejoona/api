import {
  Controller,
  Get,
  Post,
  Body,
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
import { JwtAuthGuard, JwtUser } from '../../../../common/guards';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { VerifyHqService } from '../../../shared/infrastructure/verify-hq';
import { KycService } from '../services/kyc.service';
import { IsString, IsOptional } from 'class-validator';

// ==========================================
// DTOs
// ==========================================

class CreateLivenessSessionDto {
  // No body needed — userId comes from JWT
}

class SubmitLivenessDto {
  @IsString()
  sessionToken: string;

  @IsString()
  videoKey: string; // S3 key for uploaded video

  @IsString()
  selfieKey: string; // S3 key for uploaded selfie
}

class SubmitDocumentDto {
  @IsString()
  docType: string; // passport, national_id, drivers_license

  @IsString()
  frontImageKey: string; // S3 key

  @IsOptional()
  @IsString()
  backImageKey?: string; // S3 key
}

/**
 * KYC Verification Controller
 *
 * Provides endpoints for liveness and document verification
 * backed by VerifyHQ.
 */
@ApiTags('KYC')
@Controller('kyc')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class KycVerifyController {
  constructor(
    private readonly verifyHqService: VerifyHqService,
    private readonly kycService: KycService,
  ) {}

  // ==========================================
  // Liveness Endpoints
  // ==========================================

  @Post('liveness/session')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create a liveness verification session' })
  @ApiResponse({ status: 200, description: 'Liveness session created' })
  async createLivenessSession(@CurrentUser() user: JwtUser) {
    const session = await this.verifyHqService.createLivenessSession(user.id);
    return {
      sessionToken: session.sessionToken,
      challengeType: session.challengeType,
      challengeData: session.challengeData,
    };
  }

  @Post('liveness/submit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit liveness check data' })
  @ApiResponse({ status: 200, description: 'Liveness check submitted' })
  async submitLiveness(
    @CurrentUser() user: JwtUser,
    @Body() dto: SubmitLivenessDto,
  ) {
    // Fetch blobs from S3 keys would be done in a real implementation.
    // For now, we pass the keys as identifiers and let VerifyHQ handle fetching.
    // In production, you'd use UploadService.getSignedUrl() and fetch the blobs.
    const result = await this.verifyHqService.submitLivenessCheck(
      dto.sessionToken,
      new Blob([dto.videoKey]),  // placeholder — real impl fetches from S3
      new Blob([dto.selfieKey]), // placeholder — real impl fetches from S3
    );

    return {
      id: result.id,
      status: result.status,
      isAlive: result.isAlive,
      confidence: result.confidence,
    };
  }

  @Get('liveness/status')
  @ApiOperation({ summary: 'Get liveness verification status' })
  @ApiResponse({ status: 200, description: 'Liveness status retrieved' })
  async getLivenessStatus(@CurrentUser() user: JwtUser) {
    // Get user's latest verification to find liveness check ID
    const verifications = await this.verifyHqService.getUserVerifications(
      user.id,
    );

    if (!verifications.length) {
      return { status: 'NOT_STARTED' };
    }

    const latest = verifications[0];
    if (!latest.livenessCheckId) {
      return { status: 'NOT_STARTED' };
    }

    const liveness = await this.verifyHqService.getLivenessCheck(
      latest.livenessCheckId,
    );

    return {
      id: liveness.id,
      status: liveness.status,
      isAlive: liveness.isAlive,
      confidence: liveness.confidence,
    };
  }

  // ==========================================
  // Document Endpoints
  // ==========================================

  @Post('document/submit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit ID document for verification' })
  @ApiResponse({ status: 200, description: 'Document submitted for verification' })
  async submitDocument(
    @CurrentUser() user: JwtUser,
    @Body() dto: SubmitDocumentDto,
  ) {
    // In production, fetch actual file blobs from S3
    const result = await this.verifyHqService.submitDocumentVerification(
      user.id,
      dto.docType,
      new Blob([dto.frontImageKey]),  // placeholder
      dto.backImageKey ? new Blob([dto.backImageKey]) : undefined,
    );

    return {
      id: result.id,
      status: result.status,
      extractedData: result.extractedData,
    };
  }

  // ==========================================
  // Full KYC Status
  // ==========================================

  @Get('verification/status')
  @ApiOperation({ summary: 'Get full KYC status (doc + liveness + overall)' })
  @ApiResponse({ status: 200, description: 'Full KYC status' })
  async getFullStatus(@CurrentUser() user: JwtUser) {
    // Get Korido KYC status
    const kycStatus = await this.kycService.getStatus(user.id);

    // Get VerifyHQ verification status
    let verifyHqStatus = null;
    try {
      const verifications = await this.verifyHqService.getUserVerifications(
        user.id,
      );
      if (verifications.length > 0) {
        const latest = verifications[0];
        verifyHqStatus = {
          overallStatus: latest.overallStatus,
          documentVerificationId: latest.documentVerificationId,
          livenessCheckId: latest.livenessCheckId,
          faceMatchScore: latest.faceMatchScore,
          tier: latest.tier,
        };
      }
    } catch {
      // VerifyHQ might not be available
    }

    return {
      kyc: kycStatus,
      verification: verifyHqStatus,
    };
  }
}
