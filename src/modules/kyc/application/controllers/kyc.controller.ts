import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard, JwtUser } from '../../../../common/guards';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { KycService, SubmitKycDocumentsInput } from '../services/kyc.service';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  Length,
} from 'class-validator';

// ==========================================
// DTOs
// ==========================================

class KycSubmissionDto {
  @IsString()
  @Length(1, 100)
  firstName: string;

  @IsString()
  @Length(1, 100)
  lastName: string;

  @IsDateString()
  dateOfBirth: string; // YYYY-MM-DD

  @IsString()
  @Length(2, 3)
  country: string; // ISO country code

  @IsEnum(['passport', 'national_id', 'drivers_license'])
  idType: 'passport' | 'national_id' | 'drivers_license';

  @IsString()
  @Length(1, 50)
  idNumber: string;

  @IsOptional()
  @IsDateString()
  idExpiryDate?: string;

  @IsString()
  idFrontKey: string; // S3 key from document upload

  @IsString()
  idBackKey: string;

  @IsString()
  selfieKey: string;
}

/**
 * KYC Controller
 *
 * Handles KYC verification endpoints for users.
 * Flow:
 * 1. User uploads documents via /kyc/documents (existing endpoint)
 * 2. User submits KYC with document keys via POST /kyc/submit
 * 3. Auto-verification runs, user checks status via GET /kyc/status
 * 4. If manual review needed, admin reviews via admin endpoints
 */
@ApiTags('KYC')
@Controller('kyc')
export class KycController {
  constructor(private readonly kycService: KycService) {}

  @Get('status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get KYC verification status' })
  @ApiResponse({
    status: 200,
    description: 'KYC status retrieved',
    schema: {
      example: {
        status: 'approved',
        score: 92,
        submittedAt: '2026-01-25T10:00:00Z',
        approvedAt: '2026-01-25T10:01:00Z',
        canResubmit: false,
      },
    },
  })
  async getStatus(@CurrentUser() user: JwtUser) {
    return this.kycService.getStatus(user.id);
  }

  // ==========================================
  // MOBILE ALIAS ROUTES
  // ==========================================
  // These routes support the mobile app's expected paths
  // They delegate to the main implementation above

  @Get('user/kyc/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get KYC verification status (mobile alias)' })
  @ApiResponse({
    status: 200,
    description: 'KYC status retrieved',
    schema: {
      example: {
        status: 'approved',
        score: 92,
        submittedAt: '2026-01-25T10:00:00Z',
        approvedAt: '2026-01-25T10:01:00Z',
        canResubmit: false,
      },
    },
  })
  async getStatusAlt(@CurrentUser() user: JwtUser) {
    return this.getStatus(user);
  }

  @Post('submit')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Submit KYC for verification',
    description:
      'Submit personal information and document keys for KYC verification. ' +
      'Documents must be uploaded first via POST /kyc/documents. ' +
      'After submission, auto-verification runs. Check status via GET /kyc/status.',
  })
  @ApiResponse({
    status: 200,
    description: 'KYC submitted for verification',
    schema: {
      example: {
        id: 'uuid',
        status: 'pending_verification',
        message: 'KYC submitted successfully. Verification in progress.',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid submission or status does not allow submission',
  })
  async submitKyc(@CurrentUser() user: JwtUser, @Body() dto: KycSubmissionDto) {
    this.assertAdult(dto.dateOfBirth);

    const input: SubmitKycDocumentsInput = {
      userId: user.id,
      ...dto,
    };

    const kyc = await this.kycService.submitDocuments(input);

    return {
      id: kyc.id,
      status: kyc.status,
      message: this.getStatusMessage(kyc.status),
    };
  }

  @Post('user/kyc')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Submit KYC for verification (mobile alias)',
    description:
      'Submit personal information and document keys for KYC verification. ' +
      'Documents must be uploaded first via POST /kyc/documents. ' +
      'After submission, auto-verification runs. Check status via GET /kyc/status.',
  })
  @ApiResponse({
    status: 200,
    description: 'KYC submitted for verification',
    schema: {
      example: {
        id: 'uuid',
        status: 'pending_verification',
        message: 'KYC submitted successfully. Verification in progress.',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid submission or status does not allow submission',
  })
  async submitKycAlt(
    @CurrentUser() user: JwtUser,
    @Body() dto: KycSubmissionDto,
  ) {
    return this.submitKyc(user, dto);
  }

  // ==========================================
  // Helper Methods
  // ==========================================

  private getStatusMessage(status: string): string {
    switch (status) {
      case 'pending_verification':
        return 'KYC submitted successfully. Verification in progress.';
      case 'auto_approved':
      case 'approved':
        return 'KYC verified successfully. Your wallet is being created.';
      case 'manual_review':
        return 'KYC submitted. Additional review required. We will notify you of the outcome.';
      case 'rejected':
        return 'KYC verification failed. Please check the rejection reason and resubmit.';
      default:
        return 'KYC status updated.';
    }
  }

  private assertAdult(dateOfBirth: string): void {
    const birthDate = new Date(dateOfBirth);
    if (Number.isNaN(birthDate.getTime())) {
      throw new BadRequestException('Invalid date of birth');
    }

    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDelta = today.getMonth() - birthDate.getMonth();
    const dayDelta = today.getDate() - birthDate.getDate();

    if (monthDelta < 0 || (monthDelta === 0 && dayDelta < 0)) {
      age -= 1;
    }

    if (age < 18) {
      throw new BadRequestException('User must be at least 18 years old');
    }
  }
}
