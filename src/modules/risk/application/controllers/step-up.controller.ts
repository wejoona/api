/**
 * Step-Up Controller
 * API endpoints for risk-based step-up authentication
 */

import {
  Controller,
  Post,
  Get,
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
import {
  StepUpService,
  TransactionStepUpInput,
  OperationStepUpInput,
} from '../services/step-up.service';
import { StepUpValidation } from '../../domain/interfaces/step-up.types';

class EvaluateTransactionDto {
  type: 'transfer' | 'deposit' | 'withdrawal' | 'exchange';
  amount: number;
  currency: string;
  recipientId?: string;
  recipientType?: 'internal' | 'external' | 'merchant';
  isFirstTransactionToRecipient?: boolean;
  deviceId?: string;
}

class EvaluateOperationDto {
  operation:
    | 'pin_change'
    | 'add_recipient'
    | 'account_recovery'
    | 'kyc_selfie'
    | 'biometric_enroll'
    | 'export_keys'
    | 'delete_account';
  metadata?: Record<string, unknown>;
}

class ValidateStepUpDto {
  challengeToken: string;
  livenessSessionId?: string;
  biometricVerified?: boolean;
  otpVerified?: boolean;
}

@ApiTags('Step-Up Authentication')
@ApiBearerAuth()
@Controller('step-up')
@UseGuards(JwtAuthGuard)
export class StepUpController {
  constructor(private readonly stepUpService: StepUpService) {}

  /**
   * Evaluate step-up requirements for a transaction
   * Returns: green/yellow/red flow with step-up type
   */
  @Post('transaction')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Evaluate transaction step-up requirements' })
  @ApiResponse({ status: 200, description: 'Step-up decision returned' })
  async evaluateTransaction(
    @CurrentUser() user: any,
    @Body() dto: EvaluateTransactionDto,
  ) {
    const input: TransactionStepUpInput = {
      userId: user.id,
      type: dto.type,
      amount: dto.amount,
      currency: dto.currency,
      recipientId: dto.recipientId,
      recipientType: dto.recipientType,
      isFirstTransactionToRecipient: dto.isFirstTransactionToRecipient,
      channel: 'mobile',
      deviceId: dto.deviceId,
    };

    const decision = await this.stepUpService.evaluateTransaction(input);

    return {
      success: true,
      data: {
        flow: decision.flow,
        riskScore: decision.riskScore,
        riskLevel: decision.riskLevel,
        stepUpRequired: decision.stepUpRequired,
        stepUpType: decision.stepUpType,
        reason: decision.reason,
        factors: decision.factors,
        challengeToken: decision.challengeToken,
        expiresAt: decision.expiresAt,
      },
    };
  }

  /**
   * Evaluate step-up requirements for a non-transaction operation
   */
  @Post('operation')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Evaluate operation step-up requirements' })
  @ApiResponse({ status: 200, description: 'Step-up decision returned' })
  async evaluateOperation(
    @CurrentUser() user: any,
    @Body() dto: EvaluateOperationDto,
  ) {
    const input: OperationStepUpInput = {
      userId: user.id,
      operation: dto.operation,
      metadata: dto.metadata,
    };

    const decision = await this.stepUpService.evaluateOperation(input);

    return {
      success: true,
      data: {
        flow: decision.flow,
        riskScore: decision.riskScore,
        riskLevel: decision.riskLevel,
        stepUpRequired: decision.stepUpRequired,
        stepUpType: decision.stepUpType,
        reason: decision.reason,
        factors: decision.factors,
        challengeToken: decision.challengeToken,
        expiresAt: decision.expiresAt,
      },
    };
  }

  /**
   * Validate completed step-up authentication
   */
  @Post('validate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validate completed step-up' })
  @ApiResponse({ status: 200, description: 'Step-up validated' })
  async validateStepUp(
    @CurrentUser() user: any,
    @Body() dto: ValidateStepUpDto,
  ) {
    const validation: StepUpValidation = {
      challengeToken: dto.challengeToken,
      stepUpType: 'biometric', // Will be determined from pending challenge
      livenessSessionId: dto.livenessSessionId,
      biometricVerified: dto.biometricVerified,
      otpVerified: dto.otpVerified,
    };

    const result = await this.stepUpService.validateStepUp(validation);

    return {
      success: true,
      data: {
        valid: result.valid,
        stepUpType: result.stepUpType,
        completedAt: result.completedAt,
        expiresAt: result.expiresAt,
      },
    };
  }

  /**
   * Check if a challenge token has completed step-up
   */
  @Get('status/:challengeToken')
  @ApiOperation({ summary: 'Check step-up status' })
  @ApiResponse({ status: 200, description: 'Step-up status returned' })
  async checkStatus(@Param('challengeToken') challengeToken: string) {
    const result = this.stepUpService.isStepUpComplete(challengeToken);

    return {
      success: true,
      data: result
        ? {
            complete: true,
            stepUpType: result.stepUpType,
            completedAt: result.completedAt,
            expiresAt: result.expiresAt,
          }
        : {
            complete: false,
          },
    };
  }

  /**
   * Get step-up configuration (thresholds)
   */
  @Get('config')
  @ApiOperation({ summary: 'Get step-up thresholds' })
  @ApiResponse({ status: 200, description: 'Configuration returned' })
  async getConfig() {
    const config = this.stepUpService.getConfig();

    return {
      success: true,
      data: {
        thresholds: {
          green: `0-${config.greenMaxScore}`,
          yellow: `${config.greenMaxScore + 1}-${config.yellowMaxScore}`,
          red: `${config.redMinScore}+`,
        },
        highValueThreshold: config.highValueThreshold,
        descriptions: {
          green: '🟢 Frictionless - No verification needed',
          yellow: '🟡 Low friction - Biometric verification',
          red: '🔴 High friction - Liveness verification',
        },
      },
    };
  }
}
