/**
 * Yellow Card Webhook Fixtures
 *
 * Sample webhook payloads from Yellow Card API.
 * Covers on-ramp (XOF → USDC) and off-ramp (USDC → XOF) flows.
 */

export const yellowCardWebhookFixtures = {
  // ============================================
  // Payment (On-Ramp) Events - XOF → USDC
  // ============================================

  paymentCompleteOrangeMoney: {
    id: 'evt_payment_orange_001',
    type: 'payment.complete',
    data: {
      id: 'pay_orange_123456',
      status: 'complete',
      amount: 10000, // 10,000 XOF
      currency: 'XOF',
      destinationAmount: 10, // 10 USDC (rate: 1000 XOF/USDC)
      destinationCurrency: 'USDC',
      destinationAddress: '0xjoona_pool_address_001',
      rate: 1000,
      fee: 200, // 200 XOF fee
      channel: {
        id: 'ch_orange_ci',
        type: 'mobile_money',
        network: 'orange',
      },
      paymentDetails: {
        accountNumber: '+2250701234567',
        accountName: 'ORANGE MONEY CI',
        reference: 'OM-20240115-001',
        instructions: 'Payment received via Orange Money',
      },
      reference: 'dep_joona_orange_001',
      metadata: {
        userId: 'user_joona_001',
        depositId: 'dep_internal_001',
      },
      createdAt: '2024-01-15T10:30:00.000Z',
      updatedAt: '2024-01-15T10:32:00.000Z',
    },
    createdAt: '2024-01-15T10:32:00.000Z',
  },

  paymentCompleteMTN: {
    id: 'evt_payment_mtn_001',
    type: 'payment.complete',
    data: {
      id: 'pay_mtn_789012',
      status: 'complete',
      amount: 50000, // 50,000 XOF
      currency: 'XOF',
      destinationAmount: 50, // 50 USDC
      destinationCurrency: 'USDC',
      destinationAddress: '0xjoona_pool_address_001',
      rate: 1000,
      fee: 500,
      channel: {
        id: 'ch_mtn_ci',
        type: 'mobile_money',
        network: 'mtn',
      },
      paymentDetails: {
        accountNumber: '+2250501234567',
        accountName: 'MTN MOBILE MONEY',
        reference: 'MTN-20240115-002',
        instructions: 'Payment received via MTN Mobile Money',
      },
      reference: 'dep_joona_mtn_001',
      metadata: {
        userId: 'user_joona_002',
        depositId: 'dep_internal_002',
      },
      createdAt: '2024-01-15T11:00:00.000Z',
      updatedAt: '2024-01-15T11:03:00.000Z',
    },
    createdAt: '2024-01-15T11:03:00.000Z',
  },

  paymentCompleteWave: {
    id: 'evt_payment_wave_001',
    type: 'payment.complete',
    data: {
      id: 'pay_wave_345678',
      status: 'complete',
      amount: 25000, // 25,000 XOF
      currency: 'XOF',
      destinationAmount: 25, // 25 USDC
      destinationCurrency: 'USDC',
      destinationAddress: '0xjoona_pool_address_001',
      rate: 1000,
      fee: 0, // Wave often has zero fees
      channel: {
        id: 'ch_wave_sn',
        type: 'mobile_money',
        network: 'wave',
      },
      paymentDetails: {
        accountNumber: '+221701234567', // Senegal number
        accountName: 'WAVE SENEGAL',
        reference: 'WAVE-20240115-003',
        instructions: 'Payment received via Wave',
      },
      reference: 'dep_joona_wave_001',
      metadata: {
        userId: 'user_joona_003',
        depositId: 'dep_internal_003',
        country: 'SN',
      },
      createdAt: '2024-01-15T12:00:00.000Z',
      updatedAt: '2024-01-15T12:01:30.000Z',
    },
    createdAt: '2024-01-15T12:01:30.000Z',
  },

  paymentAwaitingPayment: {
    id: 'evt_payment_awaiting_001',
    type: 'payment.awaiting_payment',
    data: {
      id: 'pay_awaiting_111111',
      status: 'awaiting_payment',
      amount: 15000,
      currency: 'XOF',
      destinationAmount: 15,
      destinationCurrency: 'USDC',
      destinationAddress: '0xjoona_pool_address_001',
      rate: 1000,
      fee: 300,
      channel: {
        id: 'ch_orange_ci',
        type: 'mobile_money',
        network: 'orange',
      },
      paymentDetails: {
        accountNumber: '+2250701234567',
        accountName: 'ORANGE MONEY CI',
        reference: 'OM-PENDING-001',
        instructions: 'Dial *144# and follow the prompts to complete payment',
        expiresAt: '2024-01-15T14:30:00.000Z',
      },
      reference: 'dep_joona_pending_001',
      metadata: {
        userId: 'user_joona_004',
      },
      createdAt: '2024-01-15T13:30:00.000Z',
      updatedAt: '2024-01-15T13:30:01.000Z',
    },
    createdAt: '2024-01-15T13:30:01.000Z',
  },

  paymentFailed: {
    id: 'evt_payment_failed_001',
    type: 'payment.failed',
    data: {
      id: 'pay_failed_222222',
      status: 'failed',
      amount: 20000,
      currency: 'XOF',
      destinationAmount: 20,
      destinationCurrency: 'USDC',
      rate: 1000,
      fee: 400,
      channel: {
        id: 'ch_mtn_ci',
        type: 'mobile_money',
        network: 'mtn',
      },
      reference: 'dep_joona_failed_001',
      failureReason: 'Insufficient funds in customer mobile money account',
      metadata: {
        userId: 'user_joona_005',
      },
      createdAt: '2024-01-15T14:00:00.000Z',
      updatedAt: '2024-01-15T14:02:00.000Z',
    },
    createdAt: '2024-01-15T14:02:00.000Z',
  },

  paymentExpired: {
    id: 'evt_payment_expired_001',
    type: 'payment.expired',
    data: {
      id: 'pay_expired_333333',
      status: 'expired',
      amount: 30000,
      currency: 'XOF',
      destinationAmount: 30,
      destinationCurrency: 'USDC',
      rate: 1000,
      fee: 600,
      channel: {
        id: 'ch_orange_ci',
        type: 'mobile_money',
        network: 'orange',
      },
      paymentDetails: {
        expiresAt: '2024-01-15T15:00:00.000Z',
      },
      reference: 'dep_joona_expired_001',
      metadata: {
        userId: 'user_joona_006',
      },
      createdAt: '2024-01-15T14:30:00.000Z',
      updatedAt: '2024-01-15T15:01:00.000Z',
    },
    createdAt: '2024-01-15T15:01:00.000Z',
  },

  // ============================================
  // Payout (Off-Ramp) Events - USDC → XOF
  // ============================================

  payoutCompleteOrangeMoney: {
    id: 'evt_payout_orange_001',
    type: 'payout.complete',
    data: {
      id: 'payout_orange_555555',
      status: 'complete',
      amount: 15, // 15 USDC
      currency: 'USDC',
      destinationAmount: 15000, // 15,000 XOF
      destinationCurrency: 'XOF',
      rate: 1000,
      fee: 0.15, // 0.15 USDC fee
      destination: {
        type: 'mobile_money',
        network: 'orange',
        accountNumber: '+2250707654321',
        accountName: 'Koné Yacouba',
      },
      reference: 'wdr_joona_orange_001',
      metadata: {
        userId: 'user_joona_007',
        withdrawalId: 'wdr_internal_001',
      },
      createdAt: '2024-01-15T16:00:00.000Z',
      updatedAt: '2024-01-15T16:02:00.000Z',
      completedAt: '2024-01-15T16:02:00.000Z',
    },
    createdAt: '2024-01-15T16:02:00.000Z',
  },

  payoutCompleteMTN: {
    id: 'evt_payout_mtn_001',
    type: 'payout.complete',
    data: {
      id: 'payout_mtn_666666',
      status: 'complete',
      amount: 50, // 50 USDC
      currency: 'USDC',
      destinationAmount: 50000, // 50,000 XOF
      destinationCurrency: 'XOF',
      rate: 1000,
      fee: 0.5,
      destination: {
        type: 'mobile_money',
        network: 'mtn',
        accountNumber: '+2250509876543',
        accountName: 'Traoré Aminata',
      },
      reference: 'wdr_joona_mtn_001',
      metadata: {
        userId: 'user_joona_008',
        withdrawalId: 'wdr_internal_002',
      },
      createdAt: '2024-01-15T17:00:00.000Z',
      updatedAt: '2024-01-15T17:03:00.000Z',
      completedAt: '2024-01-15T17:03:00.000Z',
    },
    createdAt: '2024-01-15T17:03:00.000Z',
  },

  payoutProcessing: {
    id: 'evt_payout_processing_001',
    type: 'payout.processing',
    data: {
      id: 'payout_processing_777777',
      status: 'processing',
      amount: 25,
      currency: 'USDC',
      destinationAmount: 25000,
      destinationCurrency: 'XOF',
      rate: 1000,
      fee: 0.25,
      destination: {
        type: 'mobile_money',
        network: 'wave',
        accountNumber: '+221701112233',
        accountName: 'Diallo Mamadou',
      },
      reference: 'wdr_joona_wave_001',
      metadata: {
        userId: 'user_joona_009',
        withdrawalId: 'wdr_internal_003',
      },
      createdAt: '2024-01-15T18:00:00.000Z',
      updatedAt: '2024-01-15T18:00:30.000Z',
    },
    createdAt: '2024-01-15T18:00:30.000Z',
  },

  payoutFailed: {
    id: 'evt_payout_failed_001',
    type: 'payout.failed',
    data: {
      id: 'payout_failed_888888',
      status: 'failed',
      amount: 100,
      currency: 'USDC',
      destinationAmount: 100000,
      destinationCurrency: 'XOF',
      rate: 1000,
      fee: 1.0,
      destination: {
        type: 'mobile_money',
        network: 'orange',
        accountNumber: '+2250701111111',
        accountName: 'Invalid Account',
      },
      reference: 'wdr_joona_failed_001',
      failureReason: 'Invalid or closed mobile money account',
      metadata: {
        userId: 'user_joona_010',
        withdrawalId: 'wdr_internal_004',
      },
      createdAt: '2024-01-15T19:00:00.000Z',
      updatedAt: '2024-01-15T19:02:00.000Z',
    },
    createdAt: '2024-01-15T19:02:00.000Z',
  },

  // ============================================
  // Edge Cases
  // ============================================

  paymentLargeAmount: {
    id: 'evt_payment_large_001',
    type: 'payment.complete',
    data: {
      id: 'pay_large_999999',
      status: 'complete',
      amount: 500000, // 500,000 XOF (large transaction)
      currency: 'XOF',
      destinationAmount: 500,
      destinationCurrency: 'USDC',
      destinationAddress: '0xjoona_pool_address_001',
      rate: 1000,
      fee: 5000, // Higher fee for large amount
      channel: {
        id: 'ch_orange_ci',
        type: 'mobile_money',
        network: 'orange',
      },
      paymentDetails: {
        accountNumber: '+2250701234567',
        accountName: 'ORANGE MONEY CI',
        reference: 'OM-LARGE-001',
      },
      reference: 'dep_joona_large_001',
      metadata: {
        userId: 'user_joona_whale',
        kycVerified: true,
      },
      createdAt: '2024-01-15T20:00:00.000Z',
      updatedAt: '2024-01-15T20:05:00.000Z',
    },
    createdAt: '2024-01-15T20:05:00.000Z',
  },

  paymentMinimumAmount: {
    id: 'evt_payment_min_001',
    type: 'payment.complete',
    data: {
      id: 'pay_min_100100',
      status: 'complete',
      amount: 1000, // 1,000 XOF (minimum)
      currency: 'XOF',
      destinationAmount: 1,
      destinationCurrency: 'USDC',
      destinationAddress: '0xjoona_pool_address_001',
      rate: 1000,
      fee: 50,
      channel: {
        id: 'ch_wave_sn',
        type: 'mobile_money',
        network: 'wave',
      },
      reference: 'dep_joona_min_001',
      createdAt: '2024-01-15T21:00:00.000Z',
      updatedAt: '2024-01-15T21:01:00.000Z',
    },
    createdAt: '2024-01-15T21:01:00.000Z',
  },

  payoutWithSpecialCharacters: {
    id: 'evt_payout_special_001',
    type: 'payout.complete',
    data: {
      id: 'payout_special_101010',
      status: 'complete',
      amount: 20,
      currency: 'USDC',
      destinationAmount: 20000,
      destinationCurrency: 'XOF',
      rate: 1000,
      fee: 0.2,
      destination: {
        type: 'mobile_money',
        network: 'orange',
        accountNumber: '+2250701234567',
        accountName: "N'Guessan Kouassi François-Xavier", // Special chars
      },
      reference: 'wdr_joona_special_001',
      metadata: {
        userId: 'user_joona_011',
        note: "Paiement pour Côte d'Ivoire 🇨🇮",
      },
      createdAt: '2024-01-15T22:00:00.000Z',
      updatedAt: '2024-01-15T22:02:00.000Z',
      completedAt: '2024-01-15T22:02:00.000Z',
    },
    createdAt: '2024-01-15T22:02:00.000Z',
  },
};

// Helper to get all fixture names
export const yellowCardWebhookFixtureNames = Object.keys(
  yellowCardWebhookFixtures,
);

// Helper to get fixtures by type
export function getYellowCardFixturesByType(
  type: 'payment' | 'payout' | 'complete' | 'failed' | 'pending',
): any[] {
  const filters = {
    payment: (name: string) => name.startsWith('payment'),
    payout: (name: string) => name.startsWith('payout'),
    complete: (name: string) => name.includes('Complete'),
    failed: (name: string) => name.includes('Failed'),
    pending: (name: string) =>
      name.includes('Awaiting') || name.includes('Processing'),
  };

  return Object.entries(yellowCardWebhookFixtures)
    .filter(([name]) => filters[type](name))
    .map(([_, fixture]) => fixture);
}

// Helper to get fixtures by network
export function getYellowCardFixturesByNetwork(
  network: 'orange' | 'mtn' | 'wave',
): any[] {
  return Object.values(yellowCardWebhookFixtures).filter((fixture) => {
    const data = fixture.data;
    return (
      data.channel?.network === network || data.destination?.network === network
    );
  });
}
