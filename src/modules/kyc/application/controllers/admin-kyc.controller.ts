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
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard, JwtUser, RolesGuard } from '../../../../common/guards';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { Roles } from '../../../../common/decorators/roles.decorator';
import { KycService, AdminReviewInput } from '../services/kyc.service';
import { IsBoolean, IsString, IsOptional, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

// ==========================================
// DTOs
// ==========================================

class AdminReviewDto {
  @ApiProperty({
    description: 'Whether to approve or reject the KYC verification',
    example: true,
  })
  @IsBoolean()
  approved: boolean;

  @ApiProperty({
    description: 'Admin notes about the review decision',
    example: 'Documents verified, identity confirmed',
    required: false,
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @Length(0, 1000)
  notes?: string;

  @ApiProperty({
    description: 'Reason for rejection (required if approved is false)',
    example: 'Document quality insufficient',
    required: false,
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  rejectionReason?: string;
}

/**
 * Admin KYC Controller
 *
 * Endpoints for admin users to review and approve/reject KYC verifications.
 * All endpoints require admin or super_admin role.
 */
@ApiTags('Admin - KYC')
@Controller('admin/kyc')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'super_admin')
@ApiBearerAuth()
export class AdminKycController {
  constructor(private readonly kycService: KycService) {}

  @Get('pending')
  @ApiOperation({
    summary: 'Get all KYC verifications pending manual review',
    description:
      'Returns a list of all KYC verifications that require manual admin review. ' +
      'These are typically cases where auto-verification failed or returned a low confidence score.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of KYC verifications pending review',
    schema: {
      example: [
        {
          id: '550e8400-e29b-41d4-a716-446655440000',
          userId: '123e4567-e89b-12d3-a456-426614174000',
          firstName: 'John',
          lastName: 'Doe',
          country: 'NG',
          idType: 'passport',
          submittedAt: '2026-01-25T10:00:00Z',
          autoVerificationScore: 65,
          autoVerificationProvider: 'veriff',
        },
      ],
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Requires admin or super_admin role',
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
  @ApiOperation({
    summary: 'Get KYC verification statistics',
    description:
      'Returns aggregate statistics of KYC verifications grouped by status. ' +
      'Useful for monitoring and reporting purposes.',
  })
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
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Requires admin or super_admin role',
  })
  async getStatistics() {
    return this.kycService.getStatistics();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get KYC verification details by ID',
    description:
      'Returns complete details of a specific KYC verification including all submitted documents, ' +
      'auto-verification results, and manual review information if applicable.',
  })
  @ApiParam({
    name: 'id',
    description: 'KYC verification ID (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'KYC verification details',
    schema: {
      example: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        userId: '123e4567-e89b-12d3-a456-426614174000',
        status: 'manual_review',
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '1990-01-15',
        country: 'NG',
        idType: 'passport',
        idNumber: 'A12345678',
        idExpiryDate: '2030-12-31',
        idFrontKey: 'kyc/user-123/id-front.jpg',
        idBackKey: 'kyc/user-123/id-back.jpg',
        selfieKey: 'kyc/user-123/selfie.jpg',
        submittedAt: '2026-01-25T10:00:00Z',
        autoVerificationScore: 65,
        autoVerificationProvider: 'veriff',
        autoVerificationResult: { confidence: 65, checks: ['face_match'] },
        autoVerifiedAt: '2026-01-25T10:05:00Z',
        manualReviewedBy: null,
        manualReviewNotes: null,
        manualReviewedAt: null,
        approvedAt: null,
        rejectionReason: null,
        createdAt: '2026-01-25T09:55:00Z',
        updatedAt: '2026-01-25T10:05:00Z',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Requires admin or super_admin role',
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
      'On approval, the KYC status changes to approved and a wallet will be automatically created for the user. ' +
      'On rejection, provide a clear rejectionReason that will be communicated to the user.',
  })
  @ApiParam({
    name: 'id',
    description: 'KYC verification ID (UUID) to review',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiBody({
    type: AdminReviewDto,
    description: 'Admin review decision and notes',
    examples: {
      approval: {
        summary: 'Approve KYC',
        value: {
          approved: true,
          notes: 'Documents verified, identity confirmed',
        },
      },
      rejection: {
        summary: 'Reject KYC',
        value: {
          approved: false,
          notes: 'Documents do not meet verification standards',
          rejectionReason:
            'Document quality insufficient, please resubmit with clearer images',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Review submitted successfully',
    schema: {
      examples: {
        approved: {
          summary: 'Approved',
          value: {
            id: '550e8400-e29b-41d4-a716-446655440000',
            status: 'approved',
            message: 'KYC approved. Wallet creation triggered.',
          },
        },
        rejected: {
          summary: 'Rejected',
          value: {
            id: '550e8400-e29b-41d4-a716-446655440000',
            status: 'rejected',
            message:
              'KYC rejected. Reason: Document quality insufficient, please resubmit with clearer images',
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad Request - KYC not in reviewable status or validation error',
    schema: {
      example: {
        statusCode: 400,
        message: 'KYC verification is not in manual_review status',
        error: 'Bad Request',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Requires admin or super_admin role',
  })
  @ApiResponse({
    status: 404,
    description: 'KYC verification not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'KYC verification not found',
        error: 'Not Found',
      },
    },
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
