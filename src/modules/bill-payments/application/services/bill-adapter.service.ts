import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { IBillProviderAdapter, BillPaymentError, BillPaymentErrorCodes } from '../../domain/types';
import {
  CieAdapter,
  SodeciAdapter,
  OrangeMoneyAdapter,
  MtnAdapter,
  MoovAdapter,
} from '../../infrastructure/adapters';

/**
 * Service that manages bill payment adapters
 * Provides adapter instances based on provider configuration
 */
@Injectable()
export class BillAdapterService implements OnModuleInit {
  private readonly logger = new Logger(BillAdapterService.name);
  private adapters: Map<string, IBillProviderAdapter> = new Map();

  constructor(private readonly moduleRef: ModuleRef) {}

  async onModuleInit(): Promise<void> {
    await this.initializeAdapters();
  }

  private async initializeAdapters(): Promise<void> {
    this.logger.log('Initializing bill payment adapters...');

    // Register built-in adapters
    const adapterClasses = [
      { type: 'cie', class: CieAdapter },
      { type: 'sodeci', class: SodeciAdapter },
      { type: 'orange', class: OrangeMoneyAdapter },
      { type: 'mtn', class: MtnAdapter },
      { type: 'moov', class: MoovAdapter },
    ];

    for (const { type, class: AdapterClass } of adapterClasses) {
      try {
        const adapter = this.moduleRef.get(AdapterClass, { strict: false });
        this.adapters.set(type, adapter);
        this.logger.debug(`Registered adapter: ${type}`);
      } catch (error) {
        this.logger.warn(`Failed to initialize adapter ${type}: ${error}`);
      }
    }

    this.logger.log(`Initialized ${this.adapters.size} bill payment adapters`);
  }

  /**
   * Get an adapter by type
   */
  getAdapter(adapterType: string): IBillProviderAdapter {
    const adapter = this.adapters.get(adapterType);

    if (!adapter) {
      this.logger.error(`Adapter not found: ${adapterType}`);
      throw new BillPaymentError(
        `Payment provider is not configured properly`,
        BillPaymentErrorCodes.PROVIDER_UNAVAILABLE,
        false,
      );
    }

    return adapter;
  }

  /**
   * Check if an adapter is available
   */
  hasAdapter(adapterType: string): boolean {
    return this.adapters.has(adapterType);
  }

  /**
   * Get all available adapter types
   */
  getAvailableAdapters(): string[] {
    return Array.from(this.adapters.keys());
  }

  /**
   * Check adapter health
   */
  async checkAdapterHealth(adapterType: string): Promise<boolean> {
    const adapter = this.adapters.get(adapterType);
    if (!adapter) return false;

    try {
      return await adapter.isAvailable();
    } catch (error) {
      this.logger.warn(`Health check failed for adapter ${adapterType}: ${error}`);
      return false;
    }
  }

  /**
   * Check all adapters health
   */
  async checkAllAdaptersHealth(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};

    for (const adapterType of this.adapters.keys()) {
      results[adapterType] = await this.checkAdapterHealth(adapterType);
    }

    return results;
  }
}
