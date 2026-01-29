/**
 * Risk Assessment Guard
 * NestJS guard for pre-transaction risk checks
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TransactionRiskService } from '../services/transaction-risk.service';

export const RISK_CHECK_KEY = 'risk_check';
export const SKIP_RISK_CHECK_KEY = 'skip_risk_check';

export interface RiskCheckOptions {
  transactionType: 'transfer' | 'deposit' | 'withdrawal' | 'exchange';
  amountField?: string;
  currencyField?: string;
  recipientField?: string;
  skipSanctionsCheck?: boolean;
}

/**
 * Decorator to enable risk check on a route
 */
export function RiskCheck(options: RiskCheckOptions) {
  return (target: any, key?: string, descriptor?: PropertyDescriptor) => {
    Reflect.defineMetadata(
      RISK_CHECK_KEY,
      options,
      descriptor?.value || target,
    );
    return descriptor;
  };
}

/**
 * Decorator to skip risk check
 */
export function SkipRiskCheck() {
  return (target: any, key?: string, descriptor?: PropertyDescriptor) => {
    Reflect.defineMetadata(
      SKIP_RISK_CHECK_KEY,
      true,
      descriptor?.value || target,
    );
    return descriptor;
  };
}

@Injectable()
export class RiskAssessmentGuard implements CanActivate {
  private readonly logger = new Logger(RiskAssessmentGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly riskService: TransactionRiskService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if risk check should be skipped
    const skipCheck = this.reflector.get<boolean>(
      SKIP_RISK_CHECK_KEY,
      context.getHandler(),
    );
    if (skipCheck) {
      return true;
    }

    // Get risk check options
    const options = this.reflector.get<RiskCheckOptions>(
      RISK_CHECK_KEY,
      context.getHandler(),
    );
    if (!options) {
      return true; // No risk check configured
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const body = request.body;

    if (!user) {
      throw new HttpException(
        'User not authenticated',
        HttpStatus.UNAUTHORIZED,
      );
    }

    // Extract transaction details from request
    const transactionId = body.transactionId || `tx_${Date.now()}_${user.id}`;
    const amount = options.amountField
      ? body[options.amountField]
      : body.amount;
    const currency = options.currencyField
      ? body[options.currencyField]
      : body.currency || 'USDC';
    const recipientId = options.recipientField
      ? body[options.recipientField]
      : body.recipientId;

    // Get device fingerprint from headers
    const deviceFingerprint = this.extractDeviceFingerprint(request);

    try {
      const result = await this.riskService.checkTransaction({
        transactionId,
        userId: user.id,
        userFirstName: user.firstName || 'Unknown',
        userLastName: user.lastName || 'User',
        userDateOfBirth: user.dateOfBirth,
        userNationality: user.nationality,
        type: options.transactionType,
        amount: parseFloat(amount) || 0,
        currency,
        recipientId,
        recipientType: this.determineRecipientType(recipientId),
        channel: this.determineChannel(request),
        deviceFingerprint,
        skipSanctionsCheck: options.skipSanctionsCheck,
      });

      // Attach risk assessment to request for use in controller
      request.riskAssessment = result;

      if (!result.allowed && !result.requiresStepUp) {
        throw new HttpException(
          {
            statusCode: HttpStatus.FORBIDDEN,
            error: 'Transaction blocked',
            message: 'This transaction has been blocked due to risk assessment',
            code: 'RISK_BLOCKED',
            reasons: result.blockedReasons,
            riskScore: result.riskScore,
          },
          HttpStatus.FORBIDDEN,
        );
      }

      if (result.requiresStepUp) {
        // Check if step-up was provided
        const stepUpToken = request.headers['x-step-up-token'];
        if (!stepUpToken) {
          throw new HttpException(
            {
              statusCode: HttpStatus.PRECONDITION_REQUIRED,
              error: 'Step-up authentication required',
              message:
                'Additional verification is required for this transaction',
              code: 'STEP_UP_REQUIRED',
              stepUpType: result.stepUpType,
              riskScore: result.riskScore,
            },
            HttpStatus.PRECONDITION_REQUIRED,
          );
        }

        // TODO: Validate step-up token
        this.logger.log(
          `Step-up token provided for transaction: ${transactionId}`,
        );
      }

      return true;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(
        `Risk check failed for transaction: ${transactionId}`,
        error,
      );

      // On error, allow transaction but log for review
      // This prevents risk service outage from blocking all transactions
      request.riskAssessment = {
        allowed: true,
        requiresStepUp: false,
        riskScore: -1,
        riskLevel: 'unknown',
        error: true,
      };

      return true;
    }
  }

  private extractDeviceFingerprint(request: any) {
    const deviceId = request.headers['x-device-id'];
    if (!deviceId) return undefined;

    return {
      deviceId,
      platform: request.headers['x-device-platform'] || 'web',
      osVersion: request.headers['x-os-version'],
      appVersion: request.headers['x-app-version'],
      ipAddress: request.ip || request.headers['x-forwarded-for'],
      userAgent: request.headers['user-agent'],
      isEmulator: request.headers['x-is-emulator'] === 'true',
      isRooted: request.headers['x-is-rooted'] === 'true',
    };
  }

  private determineRecipientType(
    recipientId?: string,
  ): 'internal' | 'external' | 'merchant' {
    if (!recipientId) return 'external';
    if (recipientId.startsWith('merchant_')) return 'merchant';
    // TODO: Check if recipient is internal user
    return 'external';
  }

  private determineChannel(request: any): 'mobile' | 'web' | 'api' {
    const platform = request.headers['x-device-platform'];
    if (platform === 'ios' || platform === 'android') return 'mobile';
    if (request.headers['x-api-client']) return 'api';
    return 'web';
  }
}
