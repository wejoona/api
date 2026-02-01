import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NovuAdapter } from './novu-adapter';

// Mock Novu SDK
const mockNovuInstance = {
  subscribers: {
    identify: jest.fn().mockResolvedValue({ data: { subscriberId: 'test-user' } }),
    delete: jest.fn().mockResolvedValue({ data: {} }),
    update: jest.fn().mockResolvedValue({ data: {} }),
    setCredentials: jest.fn().mockResolvedValue({ data: {} }),
    getPreference: jest.fn().mockResolvedValue({ data: { preference: {} } }),
    updatePreference: jest.fn().mockResolvedValue({ data: {} }),
    getNotificationsFeed: jest.fn().mockResolvedValue({ data: [] }),
    markMessageAs: jest.fn().mockResolvedValue({ data: {} }),
    markAllMessagesAs: jest.fn().mockResolvedValue({ data: {} }),
    getUnseenCount: jest.fn().mockResolvedValue({ data: { count: 0 } }),
  },
  trigger: jest.fn().mockResolvedValue({ data: { transactionId: 'tx-123' } }),
  bulkTrigger: jest.fn().mockResolvedValue({ data: [{ transactionId: 'tx-123' }] }),
  topics: {
    addSubscribers: jest.fn().mockResolvedValue({ data: {} }),
    removeSubscribers: jest.fn().mockResolvedValue({ data: {} }),
  },
};

jest.mock('@novu/node', () => ({
  Novu: jest.fn().mockImplementation(() => mockNovuInstance),
  TriggerRecipientsTypeEnum: {
    SUBSCRIBER: 'Subscriber',
    TOPIC: 'Topic',
  },
}));

describe('NovuAdapter', () => {
  let adapter: NovuAdapter;
  let configService: ConfigService;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, any> = {
        'novu.apiKey': 'test-api-key',
        'novu.appId': 'test-app-id',
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NovuAdapter,
        {
          provide: ConfigService,
          useValue: mockConfigService as any,
        },
      ],
    }).compile();

    adapter = module.get<NovuAdapter>(NovuAdapter);
    configService = module.get<ConfigService>(ConfigService);
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(adapter).toBeDefined();
    });

    it('should be enabled when credentials are provided', () => {
      expect(adapter.isEnabled()).toBe(true);
    });
  });

  describe('subscriber management', () => {
    it('should upsert a subscriber', async () => {
      const userId = 'test-user-123';
      const userData = {
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        phone: '+2250123456789',
        locale: 'fr',
      };

      // This will call the actual Novu API if credentials are valid
      // In production tests, you'd mock the Novu SDK
      await expect(
        adapter.upsertSubscriber(userId, userData),
      ).resolves.not.toThrow();
    });

    it('should handle upsert errors gracefully', async () => {
      // Mock the SDK to throw an error
      mockNovuInstance.subscribers.identify.mockRejectedValueOnce(
        new Error('Invalid subscriber data'),
      );

      await expect(
        adapter.upsertSubscriber('', {}),
      ).rejects.toThrow('Invalid subscriber data');
    });
  });

  describe('device token management', () => {
    it('should set device token for FCM', async () => {
      const userId = 'test-user-123';
      const deviceTokens = ['fcm-token-123'];

      await expect(
        adapter.setDeviceToken(userId, 'fcm', deviceTokens),
      ).resolves.not.toThrow();
    });

    it('should set device token for APNS', async () => {
      const userId = 'test-user-123';
      const deviceTokens = ['apns-token-123'];

      await expect(
        adapter.setDeviceToken(userId, 'apns', deviceTokens),
      ).resolves.not.toThrow();
    });
  });

  describe('notification triggering', () => {
    it('should trigger a transaction notification', async () => {
      const userId = 'test-user-123';
      const templateId = 'transaction-received';
      const payload = {
        amount: '100',
        currency: 'USDC',
        senderName: 'Jane Doe',
        transactionId: 'tx-123',
        timestamp: new Date().toISOString(),
      };

      const result = await adapter.trigger(templateId, userId, payload);

      expect(result.success).toBe(true);
      expect(result.transactionId).toBeDefined();
    });

    it('should handle trigger errors', async () => {
      // Mock the SDK to throw an error
      mockNovuInstance.trigger.mockRejectedValueOnce(
        new Error('Template not found'),
      );

      const result = await adapter.trigger(
        'non-existent-template',
        'invalid-user',
        {},
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('topic management', () => {
    it('should subscribe user to topic', async () => {
      const userId = 'test-user-123';
      const topicKey = 'premium-users';

      await expect(
        adapter.subscribeToTopic(userId, topicKey),
      ).resolves.not.toThrow();
    });

    it('should unsubscribe user from topic', async () => {
      const userId = 'test-user-123';
      const topicKey = 'premium-users';

      await expect(
        adapter.unsubscribeFromTopic(userId, topicKey),
      ).resolves.not.toThrow();
    });
  });

  describe('notification activity', () => {
    it('should get notifications for user', async () => {
      const userId = 'test-user-123';

      const notifications = await adapter.getNotifications(userId);

      expect(Array.isArray(notifications)).toBe(true);
    });

    it('should get unread count', async () => {
      const userId = 'test-user-123';

      const count = await adapter.getUnreadCount(userId);

      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  describe('preferences management', () => {
    it('should update user preferences', async () => {
      const userId = 'test-user-123';
      const preferences = {
        enabled: true,
        channels: {
          push: true,
          email: true,
          sms: false,
        },
      };

      await expect(
        adapter.updatePreferences(userId, preferences),
      ).resolves.not.toThrow();
    });

    it('should get user preferences', async () => {
      const userId = 'test-user-123';

      const prefs = await adapter.getPreferences(userId);

      // Preferences may be null if not set
      expect(prefs === null || typeof prefs === 'object').toBe(true);
    });
  });

  describe('disabled state', () => {
    beforeEach(() => {
      // Mock config to return no credentials
      mockConfigService.get.mockReturnValue(undefined);

      // Create new adapter with disabled config
      adapter = new NovuAdapter(configService as any);
    });

    it('should be disabled when credentials not provided', () => {
      expect(adapter.isEnabled()).toBe(false);
    });

    it('should handle operations gracefully when disabled', async () => {
      // All operations should complete without errors when disabled
      await expect(
        adapter.upsertSubscriber('user-123', { email: 'test@test.com' }),
      ).resolves.not.toThrow();

      await expect(
        adapter.trigger('template-id', 'user-123', {}),
      ).resolves.toEqual({ success: false, error: 'Novu not enabled' });

      const notifications = await adapter.getNotifications('user-123');
      expect(notifications).toEqual([]);

      const count = await adapter.getUnreadCount('user-123');
      expect(count).toBe(0);
    });
  });
});
