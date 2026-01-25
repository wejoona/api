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
    this.mode = this.configService.get<RiskClientMode>('RISK_CLIENT_MODE', 'mock');
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
        return this.getMockClient();
    }
  }

  private getLiveClient(): RiskManagerClient {
    if (!this.liveClient) {
      this.liveClient = new RiskManagerClient(this.configService, this.httpService);
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
              logger.warn(`Live risk client failed, falling back to mock for ${String(prop)}`);
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
}
