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
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { LivenessService } from '../services/liveness.service';
import { JwtAuthGuard, JwtUser } from '../../../../common/guards';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';

/**
 * DTO for starting a liveness session
 */
class StartLivenessDto {
  // No additional fields needed - uses authenticated user ID
}

/**
 * DTO for submitting a challenge response
 */
class SubmitChallengeDto {
  sessionId: string;
  challengeId: string;
  videoFrameBase64: string; // Base64 encoded video frame/selfie
}

/**
 * DTO for completing a session
 */
class CompleteSessionDto {
  sessionId: string;
}

/**
 * DTO for cancelling a session
 */
class CancelSessionDto {
  sessionId: string;
}

/**
 * Liveness Controller
 *
 * Handles challenge-based liveness detection for KYC verification.
 * Mock implementation that simulates real liveness checks.
 *
 * Flow:
 * 1. POST /liveness/start - Start session and get first challenge
 * 2. POST /liveness/challenge OR /liveness/submit-challenge - Submit challenge responses (2-3 times)
 * 3. POST /liveness/complete - Complete session and get final result
 * 4. POST /liveness/cancel - Cancel an active session
 * 5. GET /liveness/:sessionId - Check session status at any time
 */
@ApiTags('Liveness')
@Controller('liveness')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class LivenessController {
  constructor(private readonly livenessService: LivenessService) {}

  /**
   * Start a new liveness session
   */
  @Post('start')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Start liveness verification session',
    description:
      'Creates a new liveness session with random challenges (2-3). Returns the first challenge to complete.',
  })
  @ApiBody({
    type: StartLivenessDto,
    required: false,
    description: 'No body required - uses authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'Liveness session started successfully',
    schema: {
      example: {
        sessionId: '550e8400-e29b-41d4-a716-446655440000',
        currentChallenge: {
          challengeId: '550e8400-e29b-41d4-a716-446655440001',
          type: 'blink',
          instruction: 'Please blink your eyes slowly',
          expiresAt: '2026-01-25T12:35:00.000Z',
          order: 1,
        },
        totalChallenges: 3,
        expiresAt: '2026-01-25T12:35:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing authentication token',
  })
  async startSession(@CurrentUser() user: JwtUser) {
    return this.livenessService.startSession(user.id);
  }

  /**
   * Submit a challenge response
   */
  @Post('challenge')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Submit challenge response',
    description:
      'Submit a video frame/selfie for the current challenge. Returns whether it passed and the next challenge (if any).',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['sessionId', 'challengeId', 'videoFrameBase64'],
      properties: {
        sessionId: {
          type: 'string',
          format: 'uuid',
          description: 'Liveness session ID',
          example: '550e8400-e29b-41d4-a716-446655440000',
        },
        challengeId: {
          type: 'string',
          format: 'uuid',
          description: 'Challenge ID to submit response for',
          example: '550e8400-e29b-41d4-a716-446655440001',
        },
        videoFrameBase64: {
          type: 'string',
          description: 'Base64 encoded video frame or selfie image',
          example: 'data:image/jpeg;base64,/9j/4AAQSkZJRg...',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Challenge submitted successfully',
    schema: {
      example: {
        sessionId: '550e8400-e29b-41d4-a716-446655440000',
        passed: true,
        confidence: 87,
        nextChallenge: {
          challengeId: '550e8400-e29b-41d4-a716-446655440002',
          type: 'smile',
          instruction: 'Please smile naturally',
          expiresAt: '2026-01-25T12:31:00.000Z',
          order: 2,
        },
        sessionComplete: false,
        completedCount: 1,
        totalChallenges: 3,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Invalid challenge ID, session expired, or invalid video frame',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - session does not belong to user',
  })
  @ApiResponse({
    status: 404,
    description: 'Session not found or expired',
  })
  async submitChallenge(
    @CurrentUser() user: JwtUser,
    @Body() dto: SubmitChallengeDto,
  ) {
    return this.livenessService.submitChallenge(
      dto.sessionId,
      dto.challengeId,
      dto.videoFrameBase64,
      user.id,
    );
  }

  /**
   * Submit a challenge response (alias route for mobile SDK compatibility)
   */
  @Post('submit-challenge')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Submit challenge response (alias)',
    description:
      'Alias for /challenge endpoint. Submit a video frame/selfie for the current challenge. Returns whether it passed and the next challenge (if any).',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['sessionId', 'challengeId', 'videoFrameBase64'],
      properties: {
        sessionId: {
          type: 'string',
          format: 'uuid',
          description: 'Liveness session ID',
          example: '550e8400-e29b-41d4-a716-446655440000',
        },
        challengeId: {
          type: 'string',
          format: 'uuid',
          description: 'Challenge ID to submit response for',
          example: '550e8400-e29b-41d4-a716-446655440001',
        },
        videoFrameBase64: {
          type: 'string',
          description: 'Base64 encoded video frame or selfie image',
          example: 'data:image/jpeg;base64,/9j/4AAQSkZJRg...',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Challenge submitted successfully',
    schema: {
      example: {
        sessionId: '550e8400-e29b-41d4-a716-446655440000',
        passed: true,
        confidence: 87,
        nextChallenge: {
          challengeId: '550e8400-e29b-41d4-a716-446655440002',
          type: 'smile',
          instruction: 'Please smile naturally',
          expiresAt: '2026-01-25T12:31:00.000Z',
          order: 2,
        },
        sessionComplete: false,
        completedCount: 1,
        totalChallenges: 3,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Invalid challenge ID, session expired, or invalid video frame',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - session does not belong to user',
  })
  @ApiResponse({
    status: 404,
    description: 'Session not found or expired',
  })
  async submitChallengeAlias(
    @CurrentUser() user: JwtUser,
    @Body() dto: SubmitChallengeDto,
  ) {
    return this.livenessService.submitChallenge(
      dto.sessionId,
      dto.challengeId,
      dto.videoFrameBase64,
      user.id,
    );
  }

  /**
   * Complete session and get final result
   */
  @Post('complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Complete liveness session',
    description:
      'Finalize the liveness session after all challenges are submitted. Returns the final verification result.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['sessionId'],
      properties: {
        sessionId: {
          type: 'string',
          format: 'uuid',
          description: 'Liveness session ID',
          example: '550e8400-e29b-41d4-a716-446655440000',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Session completed successfully',
    schema: {
      example: {
        sessionId: '550e8400-e29b-41d4-a716-446655440000',
        userId: 'user-123',
        isLive: true,
        confidence: 89,
        challenges: [
          {
            type: 'blink',
            passed: true,
            confidence: 92,
            submittedAt: '2026-01-25T12:30:15.000Z',
          },
          {
            type: 'smile',
            passed: true,
            confidence: 87,
            submittedAt: '2026-01-25T12:30:32.000Z',
          },
          {
            type: 'turn_head',
            passed: true,
            confidence: 88,
            submittedAt: '2026-01-25T12:30:48.000Z',
          },
        ],
        status: 'completed',
        completedAt: '2026-01-25T12:30:48.000Z',
        riskSignals: undefined,
        failureReason: undefined,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Not all challenges completed or session already finalized',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - session does not belong to user',
  })
  @ApiResponse({
    status: 404,
    description: 'Session not found or expired',
  })
  async completeSession(
    @CurrentUser() user: JwtUser,
    @Body() dto: CompleteSessionDto,
  ) {
    return this.livenessService.completeSession(dto.sessionId, user.id);
  }

  /**
   * Cancel a liveness session
   */
  @Post('cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cancel liveness session',
    description:
      'Cancel an active liveness session. Once cancelled, the session cannot be resumed.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['sessionId'],
      properties: {
        sessionId: {
          type: 'string',
          format: 'uuid',
          description: 'Liveness session ID to cancel',
          example: '550e8400-e29b-41d4-a716-446655440000',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Session cancelled successfully',
    schema: {
      example: {
        success: true,
        message: 'Session cancelled successfully',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot cancel session that is already completed or failed',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - session does not belong to user',
  })
  @ApiResponse({
    status: 404,
    description: 'Session not found or expired',
  })
  async cancelSession(
    @CurrentUser() user: JwtUser,
    @Body() dto: CancelSessionDto,
  ) {
    return this.livenessService.cancelSession(dto.sessionId, user.id);
  }

  /**
   * Get session status
   */
  @Get(':sessionId')
  @ApiOperation({
    summary: 'Get liveness session status',
    description:
      'Retrieve the current status of a liveness session, including completed challenges and results.',
  })
  @ApiParam({
    name: 'sessionId',
    type: 'string',
    format: 'uuid',
    description: 'Liveness session ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Session status retrieved successfully',
    schema: {
      example: {
        sessionId: '550e8400-e29b-41d4-a716-446655440000',
        userId: 'user-123',
        isLive: false,
        confidence: 45,
        challenges: [
          {
            type: 'blink',
            passed: true,
            confidence: 92,
            submittedAt: '2026-01-25T12:30:15.000Z',
          },
          {
            type: 'smile',
            passed: false,
            confidence: 34,
            submittedAt: '2026-01-25T12:30:32.000Z',
          },
        ],
        status: 'in_progress',
        completedAt: '2026-01-25T12:25:00.000Z',
        riskSignals: [
          'failed_challenges_detected',
          'low_confidence_detections',
        ],
        failureReason: undefined,
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - session does not belong to user',
  })
  @ApiResponse({
    status: 404,
    description: 'Session not found',
  })
  async getSessionStatus(
    @CurrentUser() user: JwtUser,
    @Param('sessionId') sessionId: string,
  ) {
    const result = await this.livenessService.getSessionStatus(
      sessionId,
      user.id,
    );

    if (!result) {
      return {
        message: 'Session not found or expired',
        sessionId,
      };
    }

    return result;
  }
}
