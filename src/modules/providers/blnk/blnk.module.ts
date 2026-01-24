import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import {
  BlnkLedgerAdapter,
  BlnkBalanceMonitorAdapter,
  BlnkSearchAdapter,
  BlnkReconciliationAdapter,
  BlnkIdentityAdapter,
} from './adapters';
import { WebhookLedgerListener } from './listeners';
import {
  LEDGER_PROVIDER,
  BALANCE_MONITOR_PROVIDER,
  SEARCH_PROVIDER,
  RECONCILIATION_PROVIDER,
  LEDGER_IDENTITY_PROVIDER,
} from '@modules/providers/interfaces';

/**
 * Blnk Finance Module
 *
 * Provides comprehensive ledger functionality using Blnk Finance open-source ledger.
 * This module is global so providers can be injected anywhere.
 *
 * Services provided:
 * - LEDGER_PROVIDER: Core double-entry ledger operations
 * - BALANCE_MONITOR_PROVIDER: Fraud detection, compliance alerts
 * - SEARCH_PROVIDER: Transaction and balance search
 * - RECONCILIATION_PROVIDER: External data matching
 * - LEDGER_IDENTITY_PROVIDER: User identity linking (separate from Circle KYC)
 *
 * Configuration required:
 * - BLNK_URL: URL of the Blnk server (default: http://localhost:5001)
 * - BLNK_API_KEY: API key for Blnk authentication
 *
 * @see https://docs.blnkfinance.com/
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    // Blnk Adapters
    BlnkLedgerAdapter,
    BlnkBalanceMonitorAdapter,
    BlnkSearchAdapter,
    BlnkReconciliationAdapter,
    BlnkIdentityAdapter,

    // Event Listeners
    WebhookLedgerListener,

    // Bind to interfaces
    {
      provide: LEDGER_PROVIDER,
      useExisting: BlnkLedgerAdapter,
    },
    {
      provide: BALANCE_MONITOR_PROVIDER,
      useExisting: BlnkBalanceMonitorAdapter,
    },
    {
      provide: SEARCH_PROVIDER,
      useExisting: BlnkSearchAdapter,
    },
    {
      provide: RECONCILIATION_PROVIDER,
      useExisting: BlnkReconciliationAdapter,
    },
    {
      provide: LEDGER_IDENTITY_PROVIDER,
      useExisting: BlnkIdentityAdapter,
    },
  ],
  exports: [
    // Export interface symbols
    LEDGER_PROVIDER,
    BALANCE_MONITOR_PROVIDER,
    SEARCH_PROVIDER,
    RECONCILIATION_PROVIDER,
    LEDGER_IDENTITY_PROVIDER,
    // Export concrete adapters (for direct usage if needed)
    BlnkLedgerAdapter,
    BlnkBalanceMonitorAdapter,
    BlnkSearchAdapter,
    BlnkReconciliationAdapter,
    BlnkIdentityAdapter,
  ],
})
export class BlnkModule {}
