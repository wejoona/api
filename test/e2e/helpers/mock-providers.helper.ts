import nock from 'nock';

/**
 * Helper class for mocking external API providers
 * Mocks Circle, Blnk, and YellowCard APIs
 */
export class MockProvidersHelper {
  private circleScope: nock.Scope;
  private blnkScope: nock.Scope;
  private yellowcardScope: nock.Scope;

  constructor() {
    this.setupDefaultMocks();
  }

  /**
   * Setup default mock responses for all providers
   */
  setupDefaultMocks() {
    this.mockCircleAPI();
    this.mockBlnkAPI();
    this.mockYellowCardAPI();
  }

  /**
   * Mock Circle API endpoints
   */
  private mockCircleAPI() {
    const circleBaseUrl =
      process.env.CIRCLE_API_URL || 'http://localhost:3999/circle';

    this.circleScope = nock(circleBaseUrl);

    // Mock wallet creation
    this.circleScope
      .post('/v1/wallets')
      .reply(200, {
        data: {
          walletId: 'mock-circle-wallet-id',
          entityId: 'mock-entity-id',
          type: 'end_user_wallet',
          createDate: new Date().toISOString(),
        },
      })
      .persist();

    // Mock wallet balance
    this.circleScope
      .get(/\/v1\/wallets\/.*\/balance/)
      .reply(200, {
        data: {
          available: [
            {
              amount: '100.00',
              currency: 'USD',
            },
          ],
        },
      })
      .persist();

    // Mock transfer creation
    this.circleScope
      .post('/v1/transfers')
      .reply(200, {
        data: {
          id: 'mock-transfer-id',
          source: {
            type: 'wallet',
            id: 'source-wallet-id',
          },
          destination: {
            type: 'wallet',
            id: 'destination-wallet-id',
          },
          amount: {
            amount: '10.00',
            currency: 'USD',
          },
          status: 'complete',
          createDate: new Date().toISOString(),
        },
      })
      .persist();

    // Mock blockchain transfer
    this.circleScope
      .post('/v1/transfers/blockchain')
      .reply(200, {
        data: {
          id: 'mock-blockchain-transfer-id',
          source: {
            type: 'wallet',
            id: 'source-wallet-id',
          },
          destination: {
            type: 'blockchain',
            address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
            chain: 'MATIC',
          },
          amount: {
            amount: '10.00',
            currency: 'USD',
          },
          transactionHash: '0xmockhash',
          status: 'pending',
          createDate: new Date().toISOString(),
        },
      })
      .persist();
  }

  /**
   * Mock Blnk API endpoints (Ledger system)
   */
  private mockBlnkAPI() {
    const blnkBaseUrl =
      process.env.BLNK_API_URL || 'http://localhost:3999/blnk';

    this.blnkScope = nock(blnkBaseUrl);

    // Mock ledger creation
    this.blnkScope
      .post('/ledgers')
      .reply(201, {
        ledger_id: 'mock-ledger-id',
        name: 'Test Ledger',
        created_at: new Date().toISOString(),
      })
      .persist();

    // Mock balance creation
    this.blnkScope
      .post('/balances')
      .reply(201, {
        balance_id: 'mock-balance-id',
        ledger_id: 'mock-ledger-id',
        balance: 0,
        credit_balance: 0,
        debit_balance: 0,
        currency: 'USD',
        created_at: new Date().toISOString(),
      })
      .persist();

    // Mock balance query
    this.blnkScope
      .get(/\/balances\/.*/)
      .reply(200, {
        balance_id: 'mock-balance-id',
        balance: 100000, // 1000.00 in cents
        credit_balance: 100000,
        debit_balance: 0,
        currency: 'USD',
      })
      .persist();

    // Mock transaction creation
    this.blnkScope
      .post('/transactions')
      .reply(201, {
        transaction_id: 'mock-transaction-id',
        source: 'mock-source-balance',
        destination: 'mock-destination-balance',
        amount: 1000,
        currency: 'USD',
        status: 'applied',
        created_at: new Date().toISOString(),
      })
      .persist();

    // Mock transaction query
    this.blnkScope
      .get(/\/transactions\/.*/)
      .reply(200, {
        transaction_id: 'mock-transaction-id',
        source: 'mock-source-balance',
        destination: 'mock-destination-balance',
        amount: 1000,
        currency: 'USD',
        status: 'applied',
      })
      .persist();
  }

  /**
   * Mock YellowCard API endpoints (On-ramp/Off-ramp)
   */
  private mockYellowCardAPI() {
    const yellowcardBaseUrl =
      process.env.YELLOWCARD_API_URL || 'http://localhost:3999/yellowcard';

    this.yellowcardScope = nock(yellowcardBaseUrl);

    // Mock rate quote
    this.yellowcardScope
      .post('/rates/quote')
      .reply(200, {
        rate: 600.5,
        sourceCurrency: 'XOF',
        targetCurrency: 'USD',
        sourceAmount: 10000,
        targetAmount: 16.65,
        fee: 150,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      })
      .persist();

    // Mock deposit channels
    this.yellowcardScope
      .get('/channels')
      .reply(200, {
        channels: [
          {
            id: 'orange_money_ci',
            name: 'Orange Money',
            type: 'mobile_money',
            provider: 'orange',
            country: 'CI',
            currency: 'XOF',
            minAmount: 1000,
            maxAmount: 500000,
            fee: 1.5,
            feeType: 'percentage',
          },
          {
            id: 'mtn_money_ci',
            name: 'MTN Money',
            type: 'mobile_money',
            provider: 'mtn',
            country: 'CI',
            currency: 'XOF',
            minAmount: 1000,
            maxAmount: 500000,
            fee: 1.5,
            feeType: 'percentage',
          },
        ],
      })
      .persist();

    // Mock deposit creation
    this.yellowcardScope
      .post('/deposits')
      .reply(201, {
        depositId: 'mock-deposit-id',
        amount: 10000,
        sourceCurrency: 'XOF',
        targetCurrency: 'USD',
        rate: 600.5,
        fee: 150,
        estimatedAmount: 16.65,
        status: 'pending',
        paymentInstructions: {
          type: 'mobile_money',
          provider: 'orange',
          accountNumber: '+2250700000000',
          reference: 'DEP-MOCK123',
          instructions:
            'Send 10000 XOF to the number above with reference DEP-MOCK123',
        },
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      })
      .persist();

    // Mock withdrawal creation
    this.yellowcardScope
      .post('/withdrawals')
      .reply(201, {
        withdrawalId: 'mock-withdrawal-id',
        amount: 10000,
        sourceCurrency: 'USD',
        targetCurrency: 'XOF',
        rate: 600.5,
        fee: 1.0,
        estimatedAmount: 5997.5,
        status: 'pending',
      })
      .persist();
  }

  /**
   * Mock a successful deposit webhook
   */
  mockDepositWebhook(depositId: string, status: 'completed' | 'failed') {
    return {
      event: 'deposit.completed',
      data: {
        depositId,
        status,
        amount: 10000,
        sourceCurrency: 'XOF',
        targetCurrency: 'USD',
        actualAmount: 16.65,
        completedAt: new Date().toISOString(),
      },
    };
  }

  /**
   * Mock a Circle transfer webhook
   */
  mockCircleWebhook(transferId: string, status: 'complete' | 'failed') {
    return {
      Type: 'Notification',
      MessageId: 'mock-message-id',
      Message: JSON.stringify({
        notificationDate: new Date().toISOString(),
        notificationType: 'transfers',
        transfer: {
          id: transferId,
          status,
        },
      }),
    };
  }

  /**
   * Clear all mocks
   */
  clearMocks() {
    nock.cleanAll();
  }

  /**
   * Reset to default mocks
   */
  resetMocks() {
    this.clearMocks();
    this.setupDefaultMocks();
  }

  /**
   * Verify all mocks were called as expected
   */
  verifyMocks() {
    if (!nock.isDone()) {
      console.warn('Not all mocked endpoints were called');
    }
  }
}

/**
 * Global setup for nock
 */
export function setupNock() {
  // Don't allow unmocked HTTP requests
  nock.disableNetConnect();
  // Allow localhost connections for supertest
  nock.enableNetConnect('127.0.0.1');
  nock.enableNetConnect('localhost');
}

/**
 * Global teardown for nock
 */
export function teardownNock() {
  nock.cleanAll();
  nock.enableNetConnect();
}
