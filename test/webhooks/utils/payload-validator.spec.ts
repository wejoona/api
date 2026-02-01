/**
 * Webhook Payload Validation Tests
 *
 * Tests payload structure validation for all webhook providers.
 * Ensures incoming webhooks match expected schemas and handles edge cases.
 */

describe('Webhook Payload Validation', () => {
  describe('Circle Webhook Payload Validation', () => {
    describe('Transfer Complete Events', () => {
      it('should validate valid transfer complete payload', () => {
        const payload = {
          subscriptionId: 'sub_123',
          notificationId: 'notif_456',
          notificationType: 'wallets.transfer.complete',
          notification: {
            id: 'txn_789',
            state: 'COMPLETE',
            walletId: 'wallet_abc',
            userId: 'user_xyz',
            blockchain: 'ETH-SEPOLIA',
            amounts: [
              {
                amount: '10.00',
                tokenId: '36b6931a-873a-56a8-8a27-b706b17104ee',
              },
            ],
            txHash: '0x123abc...',
            createDate: '2024-01-15T10:30:00Z',
            updateDate: '2024-01-15T10:31:00Z',
          },
        };

        const result = validateCircleWebhook(payload);

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
        expect(result.eventType).toBe('wallets.transfer.complete');
      });

      it('should reject payload with missing required fields', () => {
        const payload = {
          notificationType: 'wallets.transfer.complete',
          // Missing notification object
        };

        const result = validateCircleWebhook(payload);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Missing required field: notification');
      });

      it('should validate notification.state enum', () => {
        const payload = {
          notificationType: 'wallets.transfer.complete',
          notification: {
            id: 'txn_789',
            state: 'INVALID_STATE',
            walletId: 'wallet_abc',
          },
        };

        const result = validateCircleWebhook(payload);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain(
          'Invalid state: INVALID_STATE. Expected: INITIATED, PENDING_RISK_SCREENING, DENIED, QUEUED, SENT, CONFIRMED, COMPLETE, FAILED, CANCELLED',
        );
      });

      it('should validate amounts array', () => {
        const payload = {
          notificationType: 'wallets.transfer.complete',
          notification: {
            id: 'txn_789',
            state: 'COMPLETE',
            walletId: 'wallet_abc',
            amounts: [], // Empty amounts
          },
        };

        const result = validateCircleWebhook(payload);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('amounts array cannot be empty');
      });

      it('should validate amount format', () => {
        const payload = {
          notificationType: 'wallets.transfer.complete',
          notification: {
            id: 'txn_789',
            state: 'COMPLETE',
            walletId: 'wallet_abc',
            amounts: [
              {
                amount: 'invalid-number',
                tokenId: 'token_123',
              },
            ],
          },
        };

        const result = validateCircleWebhook(payload);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain(
          'Invalid amount format: invalid-number',
        );
      });

      it('should validate negative amounts', () => {
        const payload = {
          notificationType: 'wallets.transfer.complete',
          notification: {
            id: 'txn_789',
            state: 'COMPLETE',
            walletId: 'wallet_abc',
            amounts: [
              {
                amount: '-10.00',
                tokenId: 'token_123',
              },
            ],
          },
        };

        const result = validateCircleWebhook(payload);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Amount cannot be negative: -10.00');
      });
    });

    describe('Inbound Transfer Events', () => {
      it('should validate valid inbound transfer payload', () => {
        const payload = {
          notificationType: 'wallets.inbound.complete',
          notification: {
            id: 'txn_incoming',
            state: 'COMPLETE',
            walletId: 'wallet_abc',
            sourceAddress: '0xsender...',
            destinationAddress: '0xreceiver...',
            blockchain: 'MATIC-AMOY',
            amounts: [
              {
                amount: '50.00',
                tokenId: 'usdc-token',
              },
            ],
            txHash: '0xhash...',
          },
        };

        const result = validateCircleWebhook(payload);

        expect(result.valid).toBe(true);
        expect(result.eventType).toBe('wallets.inbound.complete');
      });

      it('should validate blockchain field', () => {
        const payload = {
          notificationType: 'wallets.inbound.complete',
          notification: {
            id: 'txn_incoming',
            state: 'COMPLETE',
            blockchain: 'INVALID_CHAIN',
          },
        };

        const result = validateCircleWebhook(payload);

        expect(result.valid).toBe(false);
        expect(
          result.errors.some((e) => e.includes('Invalid blockchain')),
        ).toBe(true);
      });
    });

    describe('Failed Transfer Events', () => {
      it('should validate failed transfer payload', () => {
        const payload = {
          notificationType: 'wallets.transfer.failed',
          notification: {
            id: 'txn_failed',
            state: 'FAILED',
            walletId: 'wallet_abc',
            errorDetails: {
              code: 'INSUFFICIENT_FUNDS',
              message: 'Wallet balance too low',
            },
          },
        };

        const result = validateCircleWebhook(payload);

        expect(result.valid).toBe(true);
      });
    });
  });

  describe('Yellow Card Webhook Payload Validation', () => {
    describe('Payment Events', () => {
      it('should validate valid payment complete payload', () => {
        const payload = {
          id: 'evt_123',
          type: 'payment.complete',
          data: {
            id: 'pay_456',
            status: 'complete',
            amount: 10000,
            currency: 'XOF',
            destinationAmount: 10,
            destinationCurrency: 'USDC',
            rate: 1000,
            fee: 200,
            reference: 'txn_789',
            channel: {
              id: 'ch_orange',
              type: 'mobile_money',
              network: 'orange',
            },
          },
          createdAt: '2024-01-15T10:30:00Z',
        };

        const result = validateYellowCardWebhook(payload);

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
        expect(result.eventType).toBe('payment.complete');
      });

      it('should reject payload with missing id', () => {
        const payload = {
          type: 'payment.complete',
          data: {},
        };

        const result = validateYellowCardWebhook(payload);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Missing required field: id');
      });

      it('should validate payment status enum', () => {
        const payload = {
          id: 'evt_123',
          type: 'payment.complete',
          data: {
            id: 'pay_456',
            status: 'invalid_status',
          },
        };

        const result = validateYellowCardWebhook(payload);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain(
          'Invalid payment status: invalid_status. Expected: pending, awaiting_payment, processing, complete, failed, expired',
        );
      });

      it('should validate currency codes', () => {
        const payload = {
          id: 'evt_123',
          type: 'payment.complete',
          data: {
            id: 'pay_456',
            status: 'complete',
            currency: 'INVALID',
            destinationCurrency: 'USDC',
          },
        };

        const result = validateYellowCardWebhook(payload);

        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.includes('Invalid currency'))).toBe(
          true,
        );
      });

      it('should validate mobile money network', () => {
        const payload = {
          id: 'evt_123',
          type: 'payment.complete',
          data: {
            id: 'pay_456',
            status: 'complete',
            channel: {
              type: 'mobile_money',
              network: 'invalid_network',
            },
          },
        };

        const result = validateYellowCardWebhook(payload);

        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.includes('Invalid network'))).toBe(
          true,
        );
      });

      it('should validate XOF amount is integer (no decimals)', () => {
        const payload = {
          id: 'evt_123',
          type: 'payment.complete',
          data: {
            id: 'pay_456',
            status: 'complete',
            amount: 10000.5, // XOF doesn't have decimals
            currency: 'XOF',
          },
        };

        const result = validateYellowCardWebhook(payload);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain(
          'XOF amount must be an integer (no decimals)',
        );
      });
    });

    describe('Payout Events', () => {
      it('should validate valid payout complete payload', () => {
        const payload = {
          id: 'evt_payout_123',
          type: 'payout.complete',
          data: {
            id: 'payout_456',
            status: 'complete',
            amount: 10,
            currency: 'USDC',
            destinationAmount: 10000,
            destinationCurrency: 'XOF',
            rate: 1000,
            fee: 0.1,
            reference: 'withdrawal_789',
            destination: {
              type: 'mobile_money',
              network: 'mtn',
              accountNumber: '+2250701234567',
              accountName: 'Koné Yacouba',
            },
            completedAt: '2024-01-15T10:35:00Z',
          },
          createdAt: '2024-01-15T10:30:00Z',
        };

        const result = validateYellowCardWebhook(payload);

        expect(result.valid).toBe(true);
        expect(result.eventType).toBe('payout.complete');
      });

      it('should validate payout status enum', () => {
        const payload = {
          id: 'evt_123',
          type: 'payout.processing',
          data: {
            id: 'payout_456',
            status: 'invalid_status',
          },
        };

        const result = validateYellowCardWebhook(payload);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain(
          'Invalid payout status: invalid_status. Expected: pending, processing, complete, failed, cancelled',
        );
      });

      it('should validate phone number format for mobile money', () => {
        const payload = {
          id: 'evt_123',
          type: 'payout.complete',
          data: {
            id: 'payout_456',
            status: 'complete',
            destination: {
              type: 'mobile_money',
              accountNumber: 'invalid-phone',
            },
          },
        };

        const result = validateYellowCardWebhook(payload);

        expect(result.valid).toBe(false);
        expect(
          result.errors.some((e) => e.includes('Invalid phone number')),
        ).toBe(true);
      });
    });

    describe('Failed Payment Events', () => {
      it('should validate failed payment with reason', () => {
        const payload = {
          id: 'evt_123',
          type: 'payment.failed',
          data: {
            id: 'pay_456',
            status: 'failed',
            failureReason: 'Insufficient funds in customer account',
          },
        };

        const result = validateYellowCardWebhook(payload);

        expect(result.valid).toBe(true);
      });
    });
  });

  describe('Twilio Webhook Payload Validation', () => {
    describe('SMS Status Callbacks', () => {
      it('should validate valid delivered status', () => {
        const payload = {
          MessageSid: 'SM123abc',
          MessageStatus: 'delivered',
          To: '+2250701234567',
          From: '+14155551234',
          AccountSid: 'AC123',
        };

        const result = validateTwilioWebhook(payload);

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
        expect(result.status).toBe('delivered');
      });

      it('should validate failed status with error details', () => {
        const payload = {
          MessageSid: 'SM123abc',
          MessageStatus: 'failed',
          To: '+2250701234567',
          From: '+14155551234',
          ErrorCode: '30008',
          ErrorMessage: 'Unknown error',
        };

        const result = validateTwilioWebhook(payload);

        expect(result.valid).toBe(true);
        expect(result.status).toBe('failed');
      });

      it('should reject payload with missing MessageSid', () => {
        const payload = {
          MessageStatus: 'delivered',
          To: '+2250701234567',
        };

        const result = validateTwilioWebhook(payload);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain(
          'Missing required field: MessageSid or SmsSid',
        );
      });

      it('should accept SmsSid as alternative to MessageSid', () => {
        const payload = {
          SmsSid: 'SM123abc',
          SmsStatus: 'delivered',
          To: '+2250701234567',
          From: '+14155551234',
        };

        const result = validateTwilioWebhook(payload);

        expect(result.valid).toBe(true);
      });

      it('should validate message status enum', () => {
        const payload = {
          MessageSid: 'SM123abc',
          MessageStatus: 'invalid_status',
          To: '+2250701234567',
        };

        const result = validateTwilioWebhook(payload);

        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.includes('Invalid status'))).toBe(
          true,
        );
      });

      it('should validate phone number format', () => {
        const payload = {
          MessageSid: 'SM123abc',
          MessageStatus: 'delivered',
          To: 'invalid-phone',
          From: '+14155551234',
        };

        const result = validateTwilioWebhook(payload);

        expect(result.valid).toBe(false);
        expect(
          result.errors.some((e) => e.includes('Invalid phone number')),
        ).toBe(true);
      });

      it('should validate Ivory Coast phone numbers', () => {
        const validNumbers = [
          '+2250701234567',
          '+2250501234567',
          '+2250701234567',
        ];

        for (const number of validNumbers) {
          const payload = {
            MessageSid: 'SM123abc',
            MessageStatus: 'delivered',
            To: number,
            From: '+14155551234',
          };

          const result = validateTwilioWebhook(payload);
          expect(result.valid).toBe(true);
        }
      });

      it('should handle all valid message statuses', () => {
        const statuses = [
          'queued',
          'sending',
          'sent',
          'delivered',
          'undelivered',
          'failed',
        ];

        for (const status of statuses) {
          const payload = {
            MessageSid: 'SM123abc',
            MessageStatus: status,
            To: '+2250701234567',
            From: '+14155551234',
          };

          const result = validateTwilioWebhook(payload);
          expect(result.valid).toBe(true);
        }
      });
    });
  });

  describe('Edge Cases and Security', () => {
    it('should handle very large payloads', () => {
      const largePayload = {
        notificationType: 'wallets.transfer.complete',
        notification: {
          id: 'txn_123',
          state: 'COMPLETE',
          metadata: {
            largeData: 'x'.repeat(100000), // 100KB of data
          },
        },
      };

      const result = validateCircleWebhook(largePayload);
      expect(result.valid).toBe(true);
    });

    it('should sanitize potentially malicious content', () => {
      const payload = {
        id: 'evt_123',
        type: 'payment.complete',
        data: {
          id: 'pay_456',
          status: 'complete',
          reference: '<script>alert("xss")</script>',
        },
      };

      const result = validateYellowCardWebhook(payload);
      expect(result.sanitized).toBeDefined();
      expect(result.sanitized?.reference).not.toContain('<script>');
    });

    it('should handle null and undefined values', () => {
      const payload = {
        MessageSid: 'SM123abc',
        MessageStatus: 'delivered',
        To: '+2250701234567',
        From: null,
        Body: undefined,
      };

      const result = validateTwilioWebhook(payload);
      expect(result.valid).toBe(true);
    });

    it('should limit string field lengths', () => {
      const payload = {
        id: 'evt_123',
        type: 'payment.complete',
        data: {
          id: 'pay_456',
          status: 'complete',
          reference: 'x'.repeat(10000), // Very long reference
        },
      };

      const result = validateYellowCardWebhook(payload);
      expect(result.warnings).toContain(
        'Reference exceeds maximum length (1000)',
      );
    });
  });
});

// ============================================
// Validation Functions
// ============================================

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
  eventType?: string;
  status?: string;
  sanitized?: any;
}

function validateCircleWebhook(payload: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!payload.notificationType) {
    errors.push('Missing required field: notificationType');
  }

  if (!payload.notification) {
    errors.push('Missing required field: notification');
  } else {
    const notification = payload.notification;

    // Validate state
    const validStates = [
      'INITIATED',
      'PENDING_RISK_SCREENING',
      'DENIED',
      'QUEUED',
      'SENT',
      'CONFIRMED',
      'COMPLETE',
      'FAILED',
      'CANCELLED',
    ];
    if (notification.state && !validStates.includes(notification.state)) {
      errors.push(
        `Invalid state: ${notification.state}. Expected: ${validStates.join(', ')}`,
      );
    }

    // Validate amounts
    if (notification.amounts) {
      if (notification.amounts.length === 0) {
        errors.push('amounts array cannot be empty');
      }

      for (const amount of notification.amounts) {
        if (isNaN(parseFloat(amount.amount))) {
          errors.push(`Invalid amount format: ${amount.amount}`);
        } else if (parseFloat(amount.amount) < 0) {
          errors.push(`Amount cannot be negative: ${amount.amount}`);
        }
      }
    }

    // Validate blockchain
    const validBlockchains = [
      'ETH',
      'MATIC',
      'SOL',
      'ETH-SEPOLIA',
      'MATIC-AMOY',
      'SOL-DEVNET',
    ];
    if (
      notification.blockchain &&
      !validBlockchains.includes(notification.blockchain)
    ) {
      errors.push(`Invalid blockchain: ${notification.blockchain}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    eventType: payload.notificationType,
  };
}

function validateYellowCardWebhook(payload: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!payload.id) {
    errors.push('Missing required field: id');
  }

  if (!payload.type) {
    errors.push('Missing required field: type');
  }

  if (payload.data) {
    const data = payload.data;

    // Validate payment status
    if (payload.type?.startsWith('payment.') && data.status) {
      const validStatuses = [
        'pending',
        'awaiting_payment',
        'processing',
        'complete',
        'failed',
        'expired',
      ];
      if (!validStatuses.includes(data.status)) {
        errors.push(
          `Invalid payment status: ${data.status}. Expected: ${validStatuses.join(', ')}`,
        );
      }
    }

    // Validate payout status
    if (payload.type?.startsWith('payout.') && data.status) {
      const validStatuses = [
        'pending',
        'processing',
        'complete',
        'failed',
        'cancelled',
      ];
      if (!validStatuses.includes(data.status)) {
        errors.push(
          `Invalid payout status: ${data.status}. Expected: ${validStatuses.join(', ')}`,
        );
      }
    }

    // Validate currency
    const validCurrencies = ['XOF', 'USDC'];
    if (data.currency && !validCurrencies.includes(data.currency)) {
      errors.push(`Invalid currency: ${data.currency}`);
    }

    // Validate XOF is integer
    if (
      data.currency === 'XOF' &&
      data.amount &&
      !Number.isInteger(data.amount)
    ) {
      errors.push('XOF amount must be an integer (no decimals)');
    }

    // Validate network
    if (data.channel?.network) {
      const validNetworks = ['orange', 'mtn', 'wave', 'moov', 'free'];
      if (!validNetworks.includes(data.channel.network)) {
        errors.push(`Invalid network: ${data.channel.network}`);
      }
    }

    // Validate phone number
    if (
      data.destination?.accountNumber &&
      data.destination.type === 'mobile_money'
    ) {
      const phoneRegex = /^\+225\d{10}$/;
      if (!phoneRegex.test(data.destination.accountNumber)) {
        errors.push(`Invalid phone number: ${data.destination.accountNumber}`);
      }
    }

    // Check reference length
    if (data.reference && data.reference.length > 1000) {
      warnings.push('Reference exceeds maximum length (1000)');
    }
  }

  // Sanitize output
  const sanitized = payload.data?.reference
    ? {
        ...payload.data,
        reference: payload.data.reference.replace(/<[^>]*>/g, ''),
      }
    : undefined;

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    eventType: payload.type,
    sanitized,
  };
}

function validateTwilioWebhook(payload: any): ValidationResult {
  const errors: string[] = [];

  const messageSid = payload.MessageSid || payload.SmsSid;
  const messageStatus = payload.MessageStatus || payload.SmsStatus;

  if (!messageSid) {
    errors.push('Missing required field: MessageSid or SmsSid');
  }

  if (messageStatus) {
    const validStatuses = [
      'queued',
      'sending',
      'sent',
      'delivered',
      'undelivered',
      'failed',
    ];
    if (!validStatuses.includes(messageStatus)) {
      errors.push(
        `Invalid status: ${messageStatus}. Expected: ${validStatuses.join(', ')}`,
      );
    }
  }

  // Validate phone numbers
  const phoneRegex = /^\+\d{10,15}$/;
  if (payload.To && !phoneRegex.test(payload.To)) {
    errors.push(`Invalid phone number format: ${payload.To}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    status: messageStatus,
  };
}
