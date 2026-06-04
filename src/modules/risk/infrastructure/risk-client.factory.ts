/**
 * Risk Client Factory
 * Creates the appropriate risk client based on configuration
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { IRiskClient } from '../domain/interfaces/risk-client.interface';
import { RiskManagerClient } from './clients/risk-manager.client';
import { MockRiskClient } from './clients/mock-risk.client';

export type RiskClientMode = 'live' | 'mock' | 'hybrid';

export interface RiskClientRuntimeStatus {
  mode: RiskClientMode;
  configuredMode: string | null;
  productionLike: boolean;
  mockAllowed: boolean;
  fallbackAllowed: boolean;
  liveConfigured: boolean;
}

@Injectable()
export class RiskClientFactory {
  private readonly logger = new Logger(RiskClientFactory.name);
  private readonly mode: RiskClientMode;
  private liveClient?: RiskManagerClient;
  private mockClient?: MockRiskClient;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.mode = this.resolveMode();
    this.validateModeForEnvironment(this.mode);
    this.logger.log(`Risk client mode: ${this.mode}`);
  }

  /**
   * Get the risk client based on configuration
   */
  getClient(): IRiskClient {
    switch (this.mode) {
      case 'live':
        return this.getLiveClient();
      case 'mock':
        return this.getMockClient();
      case 'hybrid':
        // In hybrid mode, try live first, fallback to mock
        return this.getHybridClient();
      default:
        throw new Error(`Unsupported Risk client mode: ${this.mode}`);
    }
  }

  getRuntimeStatus(): RiskClientRuntimeStatus {
    return {
      mode: this.mode,
      configuredMode:
        this.configService.get<string>('RISK_CLIENT_MODE', null) ?? null,
      productionLike: this.isProductionLike(),
      mockAllowed: this.isMockAllowed(),
      fallbackAllowed: this.mode === 'hybrid' && this.isMockAllowed(),
      liveConfigured: this.isLiveConfigured(),
    };
  }

  private resolveMode(): RiskClientMode {
    const configured = this.configService.get<string>('RISK_CLIENT_MODE');
    if (!configured) {
      return this.isProductionLike() ? 'live' : 'mock';
    }

    if (
      configured === 'live' ||
      configured === 'mock' ||
      configured === 'hybrid'
    ) {
      return configured;
    }

    if (this.isProductionLike()) {
      throw new Error(`Invalid RISK_CLIENT_MODE for production: ${configured}`);
    }

    this.logger.warn(
      `Invalid RISK_CLIENT_MODE=${configured}; using mock in non-production environment`,
    );
    return 'mock';
  }

  private validateModeForEnvironment(mode: RiskClientMode): void {
    if (mode === 'live') {
      this.assertLiveConfigured();
      return;
    }

    if (!this.isMockAllowed()) {
      throw new Error(
        `RISK_CLIENT_MODE=${mode} is not allowed in production-like environments`,
      );
    }
  }

  private getLiveClient(): RiskManagerClient {
    this.assertLiveConfigured();
    if (!this.liveClient) {
      this.liveClient = new RiskManagerClient(
        this.configService,
        this.httpService,
      );
    }
    return this.liveClient;
  }

  private getMockClient(): MockRiskClient {
    if (!this.mockClient) {
      this.mockClient = new MockRiskClient();
    }
    return this.mockClient;
  }

  private getHybridClient(): IRiskClient {
    if (!this.isMockAllowed()) {
      throw new Error(
        'RISK_CLIENT_MODE=hybrid is not allowed because mock fallback is disabled',
      );
    }
    // Create a proxy that tries live first, falls back to mock
    const live = this.getLiveClient();
    const mock = this.getMockClient();
    const logger = this.logger;

    return new Proxy(live, {
      get(target, prop, receiver) {
        const originalMethod = Reflect.get(target, prop, receiver);

        if (typeof originalMethod === 'function') {
          return async function (...args: any[]) {
            try {
              return await originalMethod.apply(target, args);
            } catch (error) {
              logger.warn(
                `Live risk client failed, falling back to mock for ${String(prop)}`,
              );
              const mockMethod = Reflect.get(mock, prop);
              if (typeof mockMethod === 'function') {
                return mockMethod.apply(mock, args);
              }
              throw error;
            }
          };
        }

        return originalMethod;
      },
    }) as IRiskClient;
  }

  private isProductionLike(): boolean {
    const nodeEnv =
      this.configService.get<string>('nodeEnv') ||
      this.configService.get<string>('NODE_ENV') ||
      process.env.NODE_ENV ||
      'development';

    return ['production', 'staging'].includes(nodeEnv);
  }

  private isMockAllowed(): boolean {
    return !this.isProductionLike();
  }

  private isLiveConfigured(): boolean {
    const url = this.configService.get<string>('RISK_MANAGER_URL');
    const apiKey = this.configService.get<string>('RISK_MANAGER_API_KEY');

    return Boolean(url && apiKey && apiKey !== 'dev-api-key');
  }

  private assertLiveConfigured(): void {
    if (this.isLiveConfigured()) {
      return;
    }

    if (this.isProductionLike()) {
      throw new Error(
        'Risk Manager live mode requires RISK_MANAGER_URL and a non-dev RISK_MANAGER_API_KEY',
      );
    }
  }
}
