import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AMLCFTService } from '../services/aml-cft.service';
import { SARGeneratorService } from '../services/sar-generator.service';

/**
 * Transaction Screening Guard
 *
 * Applies AML/CFT screening to transactions before execution.
 * Blocks or flags transactions based on risk assessment.
 *
 * Usage:
 * @UseGuards(TransactionScreeningGuard)
 * async createTransfer(@Body() dto: CreateTransferDto) { ... }
 *
 * Expected request body shape:
 * - userId: string
 * - amount: number
 * - recipientId?: string
 * - metadata?: object
 */
@Injectable()
export class TransactionScreeningGuard implements CanActivate {
  private readonly logger = new Logger(TransactionScreeningGuard.name);

  constructor(
    private readonly amlCftService: AMLCFTService,
    private readonly sarGenerator: SARGeneratorService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const complianceEnabled =
      this.configService.get<boolean>('compliance.bceaoEnabled') !== false;

    // Skip screening if compliance disabled (dev/test mode)
    if (!complianceEnabled) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const { userId, amount, recipientId, metadata } = request.body;

    if (!userId || !amount) {
      // Missing required fields - let validation handle it
      return true;
    }

    try {
      // Perform AML/CFT analysis
      const assessment = await this.amlCftService.analyzeTransaction(
        userId,
        amount,
        recipientId,
        metadata,
      );

      // Attach assessment to request for downstream use
      request.complianceAssessment = assessment;

      // Block critical risk transactions
      if (!assessment.approved) {
        this.logger.warn(
          `Transaction blocked for user ${userId}: ${assessment.flags.join(', ')}`,
        );

        // Auto-generate SAR for critical risk
        const autoGenerateSar =
          this.configService.get<boolean>('compliance.autoGenerateSar') ||
          false;

        if (autoGenerateSar && assessment.riskScore >= 85) {
          await this.sarGenerator.createAutomatedSAR(
            userId,
            [], // No transaction ID yet since it's blocked
            this.determinePrimaryFlag(assessment.flags),
            assessment.riskScore,
            assessment.flags,
          );
        }

        throw new ForbiddenException({
          message: 'Transaction blocked due to compliance risk',
          riskLevel: assessment.riskLevel,
          reason: 'COMPLIANCE_RISK',
        });
      }

      // Allow transaction but flag for review if high risk
      if (assessment.requiresManualReview) {
        this.logger.log(
          `Transaction flagged for manual review: user ${userId}, risk=${assessment.riskLevel}`,
        );
        request.requiresComplianceReview = true;
      }

      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }

      // Log error but don't block transaction if screening fails
      this.logger.error(
        `Compliance screening error for user ${userId}: ${error.message}`,
      );

      // Fail-open in case of screening system error (log and alert)
      return true;
    }
  }

  /**
   * Determine primary flag from list of flags
   */
  private determinePrimaryFlag(flags: string[]): any {
    if (flags.includes('potential_structuring')) return 'structuring';
    if (flags.includes('velocity_exceeded')) return 'velocity_anomaly';
    if (flags.includes('high_risk_geography')) return 'geographic_risk';
    if (flags.includes('pep_transaction')) return 'pep_transaction';
    return 'manual_flag';
  }
}
