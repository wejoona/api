import { Module } from '@nestjs/common';
import { LivenessService } from './application/services/liveness.service';
import { LivenessController } from './application/controllers/liveness.controller';

/**
 * Liveness Module
 *
 * Provides challenge-based liveness detection for KYC verification.
 * Mock implementation simulates real liveness checks with random challenges.
 *
 * Features:
 * - Random challenge generation (blink, smile, turn head, nod)
 * - Session management with expiry (5 minutes)
 * - 95% simulated pass rate
 * - Confidence scoring
 * - Risk signal detection
 *
 * In production, replace with real provider:
 * - FaceTec ZoOm
 * - Onfido Smart Capture
 * - iProov Dynamic Liveness
 * - AWS Rekognition Face Liveness
 */
@Module({
  providers: [LivenessService],
  controllers: [LivenessController],
  exports: [LivenessService],
})
export class LivenessModule {}
