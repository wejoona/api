import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard, JwtUser } from '../../../../common/guards';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { KycService, AdminReviewInput } from '../services/kyc.service';
import { IsBoolean, IsString, IsOptional, Length } from 'class-validator';

// ==========================================
// DTOs
// ==========================================

class AdminReviewDto {
  @IsBoolean()
  approved: boolean;

  @IsOptional()
  @IsString()
  @Length(0, 1000)
  notes?: string;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  rejectionReason?: string;
}

/**
 * Admin KYC Controller
 *
 * Endpoints for admin users to review and approve/reject KYC verifications.
 * These endpoints require admin privileges (to be enforced via guard/role check).
 */
@ApiTags('Admin - KYC')
@Controller('admin/kyc')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AdminKycController {
  constructor(private readonly kycService: KycService) {}

  @Get('pending')
  @ApiOperation({ summary: 'Get all KYC verifications pending manual review' })
  @ApiResponse({
    status: 200,
    description: 'List of KYC verifications pending review',
    schema: {
      example: [
        {
          id: 'uuid',
          userId: 'uuid',
          firstName: 'John',
          lastName: 'Doe',
          country: 'NG',
          submittedAt: '2026-01-25T10:00:00Z',
          autoVerificationScore: 65,
        },
      ],
    },
  })
  async getPendingReviews() {
    const pending = await this.kycService.getPendingReviews();

    return pending.map((kyc) => ({
      id: kyc.id,
      userId: kyc.userId,
      firstName: kyc.firstName,
      lastName: kyc.lastName,
      country: kyc.country,
      idType: kyc.idType,
      submittedAt: kyc.submittedAt,
      autoVerificationScore: kyc.autoVerificationScore,
      autoVerificationProvider: kyc.autoVerificationProvider,
    }));
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get KYC verification statistics' })
  @ApiResponse({
    status: 200,
    description: 'KYC statistics by status',
    schema: {
      example: {
        none: 0,
        documents_pending: 5,
        pending_verification: 2,
        auto_approved: 10,
        manual_review: 3,
        approved: 50,
        rejected: 5,
      },
    },
  })
  async getStatistics() {
    return this.kycService.getStatistics();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get KYC verification details by ID' })
  @ApiResponse({
    status: 200,
    description: 'KYC verification details',
  })
  @ApiResponse({
    status: 404,
    description: 'KYC verification not found',
  })
  async getById(@Param('id') id: string) {
    const kyc = await this.kycService.getById(id);

    if (!kyc) {
      throw new NotFoundException('KYC verification not found');
    }

    return {
      id: kyc.id,
      userId: kyc.userId,
      status: kyc.status,
      firstName: kyc.firstName,
      lastName: kyc.lastName,
      dateOfBirth: kyc.dateOfBirth,
      country: kyc.country,
      idType: kyc.idType,
      idNumber: kyc.idNumber,
      idExpiryDate: kyc.idExpiryDate,
      idFrontKey: kyc.idFrontKey,
      idBackKey: kyc.idBackKey,
      selfieKey: kyc.selfieKey,
      submittedAt: kyc.submittedAt,
      autoVerificationScore: kyc.autoVerificationScore,
      autoVerificationProvider: kyc.autoVerificationProvider,
      autoVerificationResult: kyc.autoVerificationResult,
      autoVerifiedAt: kyc.autoVerifiedAt,
      manualReviewedBy: kyc.manualReviewedBy,
      manualReviewNotes: kyc.manualReviewNotes,
      manualReviewedAt: kyc.manualReviewedAt,
      approvedAt: kyc.approvedAt,
      rejectionReason: kyc.rejectionReason,
      createdAt: kyc.createdAt,
      updatedAt: kyc.updatedAt,
    };
  }

  @Post(':id/review')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Submit admin review for KYC verification',
    description:
      'Approve or reject a KYC verification that is in manual_review status. ' +
      'On approval, a wallet will be automatically created for the user.',
  })
  @ApiResponse({
    status: 200,
    description: 'Review submitted successfully',
    schema: {
      example: {
        id: 'uuid',
        status: 'approved',
        message: 'KYC approved. Wallet creation triggered.',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'KYC not in reviewable status',
  })
  @ApiResponse({
    status: 404,
    description: 'KYC verification not found',
  })
  async submitReview(
    @Param('id') id: string,
    @CurrentUser() admin: JwtUser,
    @Body() dto: AdminReviewDto,
  ) {
    const input: AdminReviewInput = {
      kycVerificationId: id,
      adminId: admin.id,
      approved: dto.approved,
      notes: dto.notes,
      rejectionReason: dto.rejectionReason,
    };

    const kyc = await this.kycService.adminReview(input);

    return {
      id: kyc.id,
      status: kyc.status,
      message: dto.approved
        ? 'KYC approved. Wallet creation triggered.'
        : `KYC rejected. Reason: ${kyc.rejectionReason}`,
    };
  }
}
