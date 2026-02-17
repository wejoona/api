import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';

/**
 * Compliance Event Bridge
 *
 * Forwards compliance-relevant events to Risk Manager via HTTP webhook.
 * When Kafka is enabled, these events will also be published to Kafka topics:
 * - user.registered
 * - kyc.status.changed
 * - consent.granted / consent.revoked
 * - transaction.created (handled by TransactionRiskListener)
 *
 * All calls are fire-and-forget to never block the main flow.
 */
@Injectable()
export class ComplianceEventBridgeListener {
  private readonly logger = new Logger(ComplianceEventBridgeListener.name);
  private readonly riskManagerUrl: string;
  private readonly apiKey: string;
  private readonly enabled: boolean;

  constructor(private readonly configService: ConfigService) {
    this.riskManagerUrl = this.configService.get<string>(
      'RISK_MANAGER_URL',
      'http://risk-manager:3000',
    );
    this.apiKey = this.configService.get<string>(
      'RISK_MANAGER_API_KEY',
      'dev-api-key',
    );
    this.enabled =
      this.configService.get<string>('RISK_MANAGER_ENABLED', 'false') ===
      'true';
  }

  // ─── USER REGISTRATION → Sanctions screening ────────────────────────

  @OnEvent('user.registered')
  async onUserRegistered(payload: {
    userId: string;
    phone: string;
    country?: string;
    timestamp?: Date;
  }) {
    this.logger.log(`User registered event: userId=${payload.userId}`);
    await this.forwardToRiskManager('user.registered', {
      userId: payload.userId,
      phone: payload.phone,
      country: payload.country,
      timestamp: payload.timestamp || new Date(),
    });
  }

  // ─── KYC STATUS CHANGES → Risk profile update ───────────────────────

  @OnEvent('kyc.submitted')
  async onKycSubmitted(payload: {
    userId: string;
    kycVerificationId: string;
    firstName: string;
    lastName: string;
  }) {
    this.logger.log(
      `KYC submitted event: userId=${payload.userId}`,
    );
    await this.forwardToRiskManager('kyc.status.changed', {
      userId: payload.userId,
      kycVerificationId: payload.kycVerificationId,
      status: 'submitted',
      firstName: payload.firstName,
      lastName: payload.lastName,
      timestamp: new Date(),
    });
  }

  @OnEvent('kyc.approved')
  async onKycApproved(payload: {
    userId: string;
    kycVerificationId: string;
    firstName: string;
    lastName: string;
    country: string;
  }) {
    this.logger.log(`KYC approved event: userId=${payload.userId}`);
    await this.forwardToRiskManager('kyc.status.changed', {
      userId: payload.userId,
      kycVerificationId: payload.kycVerificationId,
      status: 'approved',
      firstName: payload.firstName,
      lastName: payload.lastName,
      country: payload.country,
      timestamp: new Date(),
    });
  }

  @OnEvent('kyc.rejected')
  async onKycRejected(payload: {
    userId: string;
    kycVerificationId: string;
    reason: string;
  }) {
    this.logger.log(`KYC rejected event: userId=${payload.userId}`);
    await this.forwardToRiskManager('kyc.status.changed', {
      userId: payload.userId,
      kycVerificationId: payload.kycVerificationId,
      status: 'rejected',
      reason: payload.reason,
      timestamp: new Date(),
    });
  }

  // ─── CONSENT CHANGES → Audit trail ──────────────────────────────────

  @OnEvent('consent.granted')
  async onConsentGranted(payload: {
    userId: string;
    consentType: string;
    version: string;
    ipAddress: string;
    timestamp: Date;
  }) {
    this.logger.debug(
      `Consent granted: userId=${payload.userId} type=${payload.consentType}`,
    );
    await this.forwardToRiskManager('consent.granted', payload);
  }

  @OnEvent('consent.revoked')
  async onConsentRevoked(payload: {
    userId: string;
    consentType: string;
    ipAddress: string;
    timestamp: Date;
  }) {
    this.logger.log(
      `Consent revoked: userId=${payload.userId} type=${payload.consentType}`,
    );
    await this.forwardToRiskManager('consent.revoked', payload);
  }

  // ─── AUTH / SECURITY EVENTS ─────────────────────────────────────────

  @OnEvent('security.login.success')
  async onLoginSuccess(payload: {
    userId: string;
    ip?: string;
    deviceId?: string;
  }) {
    await this.forwardToRiskManager('auth.login.success', {
      ...payload,
      timestamp: new Date(),
    });
  }

  @OnEvent('security.pin.changed')
  async onPinChanged(payload: { userId: string }) {
    await this.forwardToRiskManager('auth.pin.changed', {
      ...payload,
      timestamp: new Date(),
    });
  }

  // ─── HTTP Webhook to Risk Manager ───────────────────────────────────

  private async forwardToRiskManager(
    eventType: string,
    payload: Record<string, any>,
  ): Promise<void> {
    if (!this.enabled) {
      this.logger.debug(
        `Risk Manager disabled, skipping event: ${eventType}`,
      );
      return;
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(
        `${this.riskManagerUrl}/api/v1/monitoring/events`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': this.apiKey,
            'X-Source': 'korido',
            'X-Event-Type': eventType,
          },
          body: JSON.stringify({
            eventType,
            source: 'korido',
            timestamp: new Date().toISOString(),
            payload,
          }),
          signal: controller.signal,
        },
      );

      clearTimeout(timeout);

      if (!response.ok) {
        this.logger.warn(
          `Risk Manager webhook returned ${response.status} for ${eventType}`,
        );
      }
    } catch (error) {
      // Fire-and-forget: never block the caller
      this.logger.debug(
        `Risk Manager webhook failed for ${eventType} (non-blocking): ${error instanceof Error ? error.message : 'Unknown'}`,
      );
    }
  }
}
