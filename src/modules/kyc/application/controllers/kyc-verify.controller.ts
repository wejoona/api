import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard, JwtUser } from '../../../../common/guards';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { VerifyHqService } from '../../../shared/infrastructure/verify-hq';
import { KycService } from '../services/kyc.service';
import { IsString, IsOptional } from 'class-validator';

// ==========================================
// DTOs
// ==========================================

class SubmitChallengeDto {
  @IsString()
  sessionToken: string;

  @IsString()
  challengeId: string;
}

class SubmitDocumentDto {
  @IsString()
  docType: string;

  @IsString()
  frontImageKey: string;

  @IsOptional()
  @IsString()
  backImageKey?: string;
}

/**
 * KYC Verification Controller
 *
 * Challenge-based liveness flow:
 * 1. POST /kyc/liveness/session → get sessionToken + challenges[]
 * 2. POST /kyc/liveness/challenge → submit photo for each challenge (repeat 2-3x)
 *    → last submission auto-verifies and returns result
 * 3. GET /kyc/liveness/status → check verification status
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
  // Liveness — Challenge-based
  // ==========================================

  @Post('liveness/session')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create liveness session with 2-3 challenges' })
  @ApiResponse({ status: 200, description: 'Session created with challenges' })
  async createLivenessSession(@CurrentUser() user: JwtUser) {
    const session = await this.verifyHqService.createLivenessSession(user.id);
    return {
      sessionToken: session.sessionToken,
      challenges: session.challenges,
    };
  }

  @Post('liveness/challenge')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit photo for a specific challenge' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        sessionToken: { type: 'string' },
        challengeId: { type: 'string' },
        photo: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('photo'))
  async submitChallenge(
    @CurrentUser() user: JwtUser,
    @Body() dto: SubmitChallengeDto,
    @UploadedFile() photo: Express.Multer.File,
  ) {
    // Convert file buffer to Blob for SDK
    const photoBlob = new Blob([new Uint8Array(photo.buffer)], { type: photo.mimetype });

    const result = await this.verifyHqService.submitChallenge(
      dto.sessionToken,
      dto.challengeId,
      photoBlob,
    );

    return result;
  }

  @Post('liveness/reference-selfie')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit reference selfie for face matching' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('selfie'))
  async submitReferenceSelfie(
    @CurrentUser() user: JwtUser,
    @Body() body: { sessionToken: string },
    @UploadedFile() selfie: Express.Multer.File,
  ) {
    const selfieBlob = new Blob([new Uint8Array(selfie.buffer)], { type: selfie.mimetype });
    return this.verifyHqService.submitReferenceSelfie(body.sessionToken, selfieBlob);
  }

  @Get('liveness/status')
  @ApiOperation({ summary: 'Get liveness verification status' })
  @ApiResponse({ status: 200, description: 'Liveness status' })
  async getLivenessStatus(@CurrentUser() user: JwtUser) {
    try {
      const verifications = await this.verifyHqService.getUserVerifications(user.id);
      if (!verifications.length) return { status: 'NOT_STARTED' };

      const latest = verifications[0];
      if (!latest.livenessCheckId) return { status: 'NOT_STARTED' };

      const liveness = await this.verifyHqService.getLivenessCheck(latest.livenessCheckId);
      return {
        id: liveness.id,
        status: liveness.status,
        isAlive: liveness.isAlive,
        confidence: liveness.confidence,
      };
    } catch {
      return { status: 'NOT_STARTED' };
    }
  }

  // ==========================================
  // Document Endpoints
  // ==========================================

  @Post('document/submit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit ID document for verification' })
  async submitDocument(
    @CurrentUser() user: JwtUser,
    @Body() dto: SubmitDocumentDto,
  ) {
    const result = await this.verifyHqService.submitDocumentVerification(
      user.id,
      dto.docType,
      new Blob([dto.frontImageKey]),
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
  async getFullStatus(@CurrentUser() user: JwtUser) {
    const kycStatus = await this.kycService.getStatus(user.id);

    let verifyHqStatus = null;
    try {
      const verifications = await this.verifyHqService.getUserVerifications(user.id);
      if (verifications.length > 0) {
        const latest = verifications[0];
        verifyHqStatus = {
          overallStatus: (latest as any).status || 'UNKNOWN',
          documentVerificationId: (latest as any).documentVerificationId,
          livenessCheckId: (latest as any).livenessCheckId,
          tier: (latest as any).tier,
        };
      }
    } catch {
      // VerifyHQ might not be available
    }

    return { kyc: kycStatus, verification: verifyHqStatus };
  }
}
