import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { TwilioSmsAdapter } from './twilio-sms.adapter';

// Mock Twilio SDK
jest.mock('twilio', () => {
  return {
    Twilio: jest.fn().mockImplementation(() => ({
      messages: {
        create: jest.fn(),
      },
    })),
  };
});

// Mock Redis
jest.mock('ioredis', () => {
  const mockRedis = jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    set: jest.fn(),
    setex: jest.fn(),
    incr: jest.fn(),
    expire: jest.fn(),
    pipeline: jest.fn().mockReturnValue({
      incr: jest.fn().mockReturnThis(),
      expire: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([]),
    }),
    on: jest.fn(),
    quit: jest.fn(),
  }));
  return { default: mockRedis, __esModule: true };
});

describe('TwilioSmsAdapter', () => {
  let adapter: TwilioSmsAdapter;
  let mockTwilioCreate: jest.Mock;

  beforeEach(async () => {
    mockTwilioCreate = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TwilioSmsAdapter,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              const config: Record<string, any> = {
                TWILIO_ACCOUNT_SID: 'test_account_sid',
                TWILIO_AUTH_TOKEN: 'test_auth_token',
                TWILIO_PHONE_NUMBER: '+1234567890',
                TWILIO_MAX_RETRIES: 3,
                TWILIO_INITIAL_RETRY_DELAY_MS: 1000,
                TWILIO_MAX_RETRY_DELAY_MS: 10000,
                TWILIO_RATE_LIMIT_PER_MINUTE: 5,
                TWILIO_RATE_LIMIT_PER_HOUR: 10,
                'redis.host': 'localhost',
                'redis.port': 6379,
                'otp.useDevOtp': false,
                nodeEnv: 'test',
              };
              return config[key] ?? defaultValue;
            }),
          },
        },
      ],
    }).compile();

    adapter = module.get<TwilioSmsAdapter>(TwilioSmsAdapter);

    // Mock Twilio client
    (adapter as any).twilioClient = {
      messages: {
        create: mockTwilioCreate,
      },
    };

    // Mock Redis
    (adapter as any).redis = {
      get: jest.fn().mockResolvedValue(null),
      setex: jest.fn().mockResolvedValue('OK'),
      pipeline: jest.fn().mockReturnValue({
        incr: jest.fn().mockReturnThis(),
        expire: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      }),
    };

    // Enable production mode for tests
    (adapter as any).useDevMode = false;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('send', () => {
    it('should send SMS successfully', async () => {
      mockTwilioCreate.mockResolvedValue({
        sid: 'SM123456789',
        to: '+2250701234567',
        status: 'queued',
        dateCreated: new Date(),
      });

      const result = await adapter.send({
        to: '+2250701234567',
        message: 'Test message',
      });

      expect(result).toEqual({
        id: 'SM123456789',
        to: '+2250701234567',
        status: 'queued',
        provider: 'twilio',
        createdAt: expect.any(Date),
      });

      expect(mockTwilioCreate).toHaveBeenCalledWith({
        to: '+2250701234567',
        body: 'Test message',
        from: '+1234567890',
      });
    });

    it('should use messaging service SID when configured', async () => {
      // Reconfigure with messaging service SID
      (adapter as any).config.messagingServiceSid = 'MG123456789';

      mockTwilioCreate.mockResolvedValue({
        sid: 'SM123456789',
        to: '+2250701234567',
        status: 'queued',
        dateCreated: new Date(),
      });

      await adapter.send({
        to: '+2250701234567',
        message: 'Test message',
      });

      expect(mockTwilioCreate).toHaveBeenCalledWith({
        to: '+2250701234567',
        body: 'Test message',
        messagingServiceSid: 'MG123456789',
      });
    });

    it('should check rate limits before sending', async () => {
      const mockRedis = (adapter as any).redis;
      mockRedis.get.mockResolvedValue('5'); // At rate limit

      await expect(
        adapter.send({
          to: '+2250701234567',
          message: 'Test message',
        }),
      ).rejects.toThrow('Rate limit exceeded');

      expect(mockTwilioCreate).not.toHaveBeenCalled();
    });

    it('should retry on retryable errors', async () => {
      const retryableError: any = new Error('Network error');
      retryableError.code = 20500;

      mockTwilioCreate
        .mockRejectedValueOnce(retryableError)
        .mockResolvedValueOnce({
          sid: 'SM123456789',
          to: '+2250701234567',
          status: 'queued',
          dateCreated: new Date(),
        });

      // Speed up retry delay for testing
      jest.spyOn(adapter as any, 'calculateRetryDelay').mockReturnValue(10);

      const result = await adapter.send({
        to: '+2250701234567',
        message: 'Test message',
      });

      expect(result.id).toBe('SM123456789');
      expect(mockTwilioCreate).toHaveBeenCalledTimes(2);
    });

    it('should not retry on non-retryable errors', async () => {
      const nonRetryableError: any = new Error('Invalid phone number');
      nonRetryableError.code = 21211;

      mockTwilioCreate.mockRejectedValue(nonRetryableError);

      await expect(
        adapter.send({
          to: 'invalid',
          message: 'Test message',
        }),
      ).rejects.toThrow('Invalid phone number');

      expect(mockTwilioCreate).toHaveBeenCalledTimes(1);
    });
  });

  describe('sendOtp', () => {
    it('should send OTP in French for Ivorian number', async () => {
      mockTwilioCreate.mockResolvedValue({
        sid: 'SM123456789',
        to: '+2250701234567',
        status: 'queued',
        dateCreated: new Date(),
      });

      await adapter.sendOtp('+2250701234567', '123456');

      expect(mockTwilioCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          to: '+2250701234567',
          body: expect.stringContaining('Votre code JoonaPay est: 123456'),
        }),
      );
    });

    it('should send OTP in French for Senegalese number', async () => {
      mockTwilioCreate.mockResolvedValue({
        sid: 'SM123456789',
        to: '+221701234567',
        status: 'queued',
        dateCreated: new Date(),
      });

      await adapter.sendOtp('+221701234567', '123456');

      expect(mockTwilioCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          to: '+221701234567',
          body: expect.stringContaining('Votre code JoonaPay est: 123456'),
        }),
      );
    });

    it('should send OTP in English for non-French numbers', async () => {
      mockTwilioCreate.mockResolvedValue({
        sid: 'SM123456789',
        to: '+1234567890',
        status: 'queued',
        dateCreated: new Date(),
      });

      await adapter.sendOtp('+1234567890', '123456');

      expect(mockTwilioCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          to: '+1234567890',
          body: expect.stringContaining('Your JoonaPay code is: 123456'),
        }),
      );
    });

    it('should optimize message length for SMS', async () => {
      mockTwilioCreate.mockResolvedValue({
        sid: 'SM123456789',
        to: '+2250701234567',
        status: 'queued',
        dateCreated: new Date(),
      });

      await adapter.sendOtp('+2250701234567', '123456');

      const call = mockTwilioCreate.mock.calls[0][0];
      expect(call.body.length).toBeLessThan(160); // Single SMS segment
    });
  });

  describe('getStatus', () => {
    it('should fetch message status from Twilio', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        sid: 'SM123456789',
        to: '+2250701234567',
        status: 'delivered',
        dateCreated: new Date(),
      });

      (adapter as any).twilioClient.messages = jest.fn().mockReturnValue({
        fetch: mockFetch,
      });

      const result = await adapter.getStatus('SM123456789');

      expect(result).toEqual({
        id: 'SM123456789',
        to: '+2250701234567',
        status: 'delivered',
        provider: 'twilio',
        createdAt: expect.any(Date),
      });
    });

    it('should handle status fetch errors', async () => {
      (adapter as any).twilioClient.messages = jest.fn().mockReturnValue({
        fetch: jest.fn().mockRejectedValue(new Error('Message not found')),
      });

      await expect(adapter.getStatus('INVALID')).rejects.toThrow(
        'Message not found',
      );
    });
  });

  describe('dev mode', () => {
    beforeEach(() => {
      (adapter as any).useDevMode = true;
    });

    it('should simulate SMS send in dev mode', async () => {
      const result = await adapter.send({
        to: '+2250701234567',
        message: 'Test message',
      });

      expect(result.id).toMatch(/^DEV_/);
      expect(result.status).toBe('delivered');
      expect(mockTwilioCreate).not.toHaveBeenCalled();
    });

    it('should return mock status in dev mode', async () => {
      const result = await adapter.getStatus('DEV_123456');

      expect(result.status).toBe('delivered');
      expect(result.id).toBe('DEV_123456');
    });
  });

  describe('language detection', () => {
    it.each([
      ['+225', 'fr'], // Côte d'Ivoire
      ['+221', 'fr'], // Senegal
      ['+223', 'fr'], // Mali
      ['+226', 'fr'], // Burkina Faso
      ['+237', 'fr'], // Cameroon
      ['+1', 'en'], // USA
      ['+44', 'en'], // UK
      ['+234', 'en'], // Nigeria
    ])('should detect %s as %s', (prefix, expectedLang) => {
      const language = (adapter as any).detectLanguage(`${prefix}123456789`);
      expect(language).toBe(expectedLang);
    });
  });

  describe('rate limiting', () => {
    it('should increment rate limit counters after successful send', async () => {
      mockTwilioCreate.mockResolvedValue({
        sid: 'SM123456789',
        to: '+2250701234567',
        status: 'queued',
        dateCreated: new Date(),
      });

      const mockPipeline = {
        incr: jest.fn().mockReturnThis(),
        expire: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      };

      (adapter as any).redis.pipeline = jest.fn().mockReturnValue(mockPipeline);

      await adapter.send({
        to: '+2250701234567',
        message: 'Test message',
      });

      expect(mockPipeline.incr).toHaveBeenCalledWith(
        expect.stringContaining(':minute'),
      );
      expect(mockPipeline.incr).toHaveBeenCalledWith(
        expect.stringContaining(':hour'),
      );
      expect(mockPipeline.exec).toHaveBeenCalled();
    });
  });
});
