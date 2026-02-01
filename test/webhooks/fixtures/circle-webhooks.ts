/**
 * Circle Webhook Fixtures
 *
 * Sample webhook payloads from Circle's Programmable Wallets API.
 * Use these for testing webhook handlers without hitting production.
 */

export const circleWebhookFixtures = {
  // ============================================
  // Transfer Complete Events
  // ============================================

  transferComplete: {
    subscriptionId: 'sub_01234567-89ab-cdef-0123-456789abcdef',
    notificationId: 'notif_fedcba98-7654-3210-fedc-ba9876543210',
    notificationType: 'wallets.transfer.complete',
    notification: {
      id: 'txn_a1b2c3d4-e5f6-4789-a0b1-c2d3e4f5a6b7',
      state: 'COMPLETE',
      walletId: 'wallet_xyz123abc456',
      userId: 'user_joona_001',
      blockchain: 'ETH-SEPOLIA',
      amounts: [
        {
          amount: '10.00',
          tokenId: '36b6931a-873a-56a8-8a27-b706b17104ee',
        },
      ],
      destinationAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      txHash:
        '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      createDate: '2024-01-15T10:30:00.000Z',
      updateDate: '2024-01-15T10:31:30.000Z',
    },
  },

  transferCompletePolygon: {
    subscriptionId: 'sub_01234567-89ab-cdef-0123-456789abcdef',
    notificationId: 'notif_aaaabbbb-cccc-dddd-eeee-ffffaaaabbbb',
    notificationType: 'wallets.transfer.complete',
    notification: {
      id: 'txn_polygon_001',
      state: 'COMPLETE',
      walletId: 'wallet_polygon_abc',
      userId: 'user_joona_002',
      blockchain: 'MATIC-AMOY',
      amounts: [
        {
          amount: '25.50',
          tokenId: 'matic-amoy-usdc',
        },
      ],
      destinationAddress: '0x8ba1f109551bD432803012645Ac136ddd64DBA72',
      txHash:
        '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      feeLevel: 'MEDIUM',
      fees: [
        {
          amount: '0.01',
          tokenId: 'matic-amoy-usdc',
        },
      ],
      createDate: '2024-01-15T14:20:00.000Z',
      updateDate: '2024-01-15T14:21:00.000Z',
    },
  },

  transferCompleteLarge: {
    subscriptionId: 'sub_01234567-89ab-cdef-0123-456789abcdef',
    notificationId: 'notif_large_transfer_001',
    notificationType: 'wallets.transfer.complete',
    notification: {
      id: 'txn_large_001',
      state: 'COMPLETE',
      walletId: 'wallet_whale_001',
      userId: 'user_joona_whale',
      blockchain: 'ETH-SEPOLIA',
      amounts: [
        {
          amount: '10000.00',
          tokenId: '36b6931a-873a-56a8-8a27-b706b17104ee',
        },
      ],
      destinationAddress: '0x9876543210fedcba9876543210fedcba98765432',
      txHash:
        '0xfedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210',
      feeLevel: 'HIGH',
      createDate: '2024-01-15T16:45:00.000Z',
      updateDate: '2024-01-15T16:46:30.000Z',
    },
  },

  // ============================================
  // Transfer Failed Events
  // ============================================

  transferFailed: {
    subscriptionId: 'sub_01234567-89ab-cdef-0123-456789abcdef',
    notificationId: 'notif_failed_001',
    notificationType: 'wallets.transfer.failed',
    notification: {
      id: 'txn_failed_001',
      state: 'FAILED',
      walletId: 'wallet_xyz123abc456',
      userId: 'user_joona_003',
      blockchain: 'ETH-SEPOLIA',
      amounts: [
        {
          amount: '100.00',
          tokenId: '36b6931a-873a-56a8-8a27-b706b17104ee',
        },
      ],
      destinationAddress: '0x1111222233334444555566667777888899990000',
      errorDetails: {
        code: 'INSUFFICIENT_FUNDS',
        message: 'Wallet balance is insufficient to complete this transfer',
      },
      createDate: '2024-01-15T11:00:00.000Z',
      updateDate: '2024-01-15T11:00:30.000Z',
    },
  },

  transferDenied: {
    subscriptionId: 'sub_01234567-89ab-cdef-0123-456789abcdef',
    notificationId: 'notif_denied_001',
    notificationType: 'wallets.transfer.failed',
    notification: {
      id: 'txn_denied_001',
      state: 'DENIED',
      walletId: 'wallet_risk_001',
      userId: 'user_joona_004',
      blockchain: 'ETH-SEPOLIA',
      amounts: [
        {
          amount: '50.00',
          tokenId: '36b6931a-873a-56a8-8a27-b706b17104ee',
        },
      ],
      destinationAddress: '0xsanctioned_address_example',
      riskScreening: {
        result: 'DENIED',
        reason: 'Destination address flagged in sanctions screening',
      },
      createDate: '2024-01-15T12:00:00.000Z',
      updateDate: '2024-01-15T12:00:15.000Z',
    },
  },

  // ============================================
  // Inbound Transfer Events
  // ============================================

  inboundComplete: {
    subscriptionId: 'sub_01234567-89ab-cdef-0123-456789abcdef',
    notificationId: 'notif_inbound_001',
    notificationType: 'wallets.inbound.complete',
    notification: {
      id: 'txn_inbound_001',
      state: 'COMPLETE',
      transactionType: 'INBOUND',
      walletId: 'wallet_xyz123abc456',
      userId: 'user_joona_005',
      blockchain: 'MATIC-AMOY',
      sourceAddress: '0xexternal_sender_address_001',
      destinationAddress: '0xjoona_wallet_address_001',
      amounts: [
        {
          amount: '75.00',
          tokenId: 'matic-amoy-usdc',
        },
      ],
      txHash:
        '0x1234abcd5678efab1234abcd5678efab1234abcd5678efab1234abcd5678efab',
      confirmations: 12,
      createDate: '2024-01-15T13:00:00.000Z',
      updateDate: '2024-01-15T13:05:00.000Z',
    },
  },

  inboundCompleteMultipleTokens: {
    subscriptionId: 'sub_01234567-89ab-cdef-0123-456789abcdef',
    notificationId: 'notif_inbound_multi_001',
    notificationType: 'wallets.inbound.complete',
    notification: {
      id: 'txn_inbound_multi_001',
      state: 'COMPLETE',
      transactionType: 'INBOUND',
      walletId: 'wallet_multi_token_001',
      userId: 'user_joona_006',
      blockchain: 'ETH-SEPOLIA',
      sourceAddress: '0xmulti_sender_001',
      destinationAddress: '0xjoona_wallet_address_002',
      amounts: [
        {
          amount: '50.00',
          tokenId: '36b6931a-873a-56a8-8a27-b706b17104ee',
        },
        {
          amount: '0.05',
          tokenId: 'eth-sepolia-native', // Gas token
        },
      ],
      txHash:
        '0xmultitoken123456789abcdef123456789abcdef123456789abcdef123456789abc',
      createDate: '2024-01-15T15:00:00.000Z',
      updateDate: '2024-01-15T15:02:00.000Z',
    },
  },

  // ============================================
  // Pending States
  // ============================================

  transferPendingRiskScreening: {
    subscriptionId: 'sub_01234567-89ab-cdef-0123-456789abcdef',
    notificationId: 'notif_pending_risk_001',
    notificationType: 'wallets.transfer.pending',
    notification: {
      id: 'txn_pending_risk_001',
      state: 'PENDING_RISK_SCREENING',
      walletId: 'wallet_screening_001',
      userId: 'user_joona_007',
      blockchain: 'ETH-SEPOLIA',
      amounts: [
        {
          amount: '5000.00',
          tokenId: '36b6931a-873a-56a8-8a27-b706b17104ee',
        },
      ],
      destinationAddress: '0xhigh_value_destination_001',
      createDate: '2024-01-15T17:00:00.000Z',
      updateDate: '2024-01-15T17:00:01.000Z',
    },
  },

  transferQueued: {
    subscriptionId: 'sub_01234567-89ab-cdef-0123-456789abcdef',
    notificationId: 'notif_queued_001',
    notificationType: 'wallets.transfer.queued',
    notification: {
      id: 'txn_queued_001',
      state: 'QUEUED',
      walletId: 'wallet_queue_001',
      userId: 'user_joona_008',
      blockchain: 'MATIC-AMOY',
      amounts: [
        {
          amount: '15.00',
          tokenId: 'matic-amoy-usdc',
        },
      ],
      destinationAddress: '0xqueue_destination_001',
      feeLevel: 'LOW',
      createDate: '2024-01-15T18:00:00.000Z',
      updateDate: '2024-01-15T18:00:05.000Z',
    },
  },

  // ============================================
  // Edge Cases
  // ============================================

  minimumTransfer: {
    subscriptionId: 'sub_01234567-89ab-cdef-0123-456789abcdef',
    notificationId: 'notif_minimum_001',
    notificationType: 'wallets.transfer.complete',
    notification: {
      id: 'txn_minimum_001',
      state: 'COMPLETE',
      walletId: 'wallet_min_001',
      userId: 'user_joona_009',
      blockchain: 'ETH-SEPOLIA',
      amounts: [
        {
          amount: '0.01',
          tokenId: '36b6931a-873a-56a8-8a27-b706b17104ee',
        },
      ],
      destinationAddress: '0xmin_transfer_destination',
      txHash:
        '0xmin123456789abcdef123456789abcdef123456789abcdef123456789abcdef',
      createDate: '2024-01-15T19:00:00.000Z',
      updateDate: '2024-01-15T19:00:30.000Z',
    },
  },

  highPrecisionAmount: {
    subscriptionId: 'sub_01234567-89ab-cdef-0123-456789abcdef',
    notificationId: 'notif_precision_001',
    notificationType: 'wallets.transfer.complete',
    notification: {
      id: 'txn_precision_001',
      state: 'COMPLETE',
      walletId: 'wallet_precision_001',
      userId: 'user_joona_010',
      blockchain: 'ETH-SEPOLIA',
      amounts: [
        {
          amount: '123.456789',
          tokenId: '36b6931a-873a-56a8-8a27-b706b17104ee',
        },
      ],
      destinationAddress: '0xprecision_destination_001',
      txHash:
        '0xprecision123456789abcdef123456789abcdef123456789abcdef123456789',
      createDate: '2024-01-15T20:00:00.000Z',
      updateDate: '2024-01-15T20:01:00.000Z',
    },
  },
};

// Helper to get all fixture names
export const circleWebhookFixtureNames = Object.keys(circleWebhookFixtures);

// Helper to get fixtures by type
export function getCircleFixturesByType(
  type: 'complete' | 'failed' | 'inbound' | 'pending',
): any[] {
  const filters = {
    complete: (name: string) =>
      name.includes('Complete') && !name.includes('inbound'),
    failed: (name: string) =>
      name.includes('Failed') || name.includes('Denied'),
    inbound: (name: string) => name.includes('inbound'),
    pending: (name: string) =>
      name.includes('Pending') || name.includes('Queued'),
  };

  return Object.entries(circleWebhookFixtures)
    .filter(([name]) => filters[type](name))
    .map(([_, fixture]) => fixture);
}
