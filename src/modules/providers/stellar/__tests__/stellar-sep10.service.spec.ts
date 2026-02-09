import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { StellarSep10Service } from '../services/stellar-sep10.service';
import { StellarAuthError, TESTNET_PASSPHRASE } from '../stellar.types';

// Mock Stellar SDK
jest.mock('@stellar/stellar-sdk', () => {
  return {
    Keypair: {
      fromSecret: jest.fn(() => ({
        publicKey: jest.fn(() => 'GBTEST1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ12345'),
        sign: jest.fn((buffer: Buffer) => Buffer.from('signature')),
      })),
    },
    Transaction: jest.fn((xdr: string, networkPassphrase: string) => ({
      xdr,
      networkPassphrase,
      sign: jest.fn(),
      toXDR: jest.fn(() => 'signed-xdr-string'),
    })),
  };
});

describe('StellarSep10Service', () => {
  let service: StellarSep10Service;

  const mockConfigValues: Record<string, any> = {
    'stellar.network': 'testnet',
    'stellar.horizonUrl': 'https://horizon-testnet.stellar.org',
    'stellar.usdcAssetCode': 'USDC',
    'stellar.usdcIssuer': 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
    'stellar.anchorDomain': 'test-anchor.stellar.org',
    'stellar.useMock': false,
  };

  beforeEach(async () => {
    global.fetch = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StellarSep10Service,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => mockConfigValues[key]),
          },
        },
      ],
    }).compile();

    service = module.get<StellarSep10Service>(StellarSep10Service);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should use testnet passphrase', () => {
      expect(service.getNetworkPassphrase()).toBe(TESTNET_PASSPHRASE);
    });
  });

  describe('getAuthEndpoint', () => {
    it('should extract WEB_AUTH_ENDPOINT from stellar.toml', async () => {
      const mockToml = `
        WEB_AUTH_ENDPOINT="https://test-anchor.stellar.org/auth"
        TRANSFER_SERVER="https://test-anchor.stellar.org/sep24"
      `;

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: jest.fn().mockResolvedValue(mockToml),
      });

      const endpoint = await service.getAuthEndpoint('test-anchor.stellar.org');

      expect(endpoint).toBe('https://test-anchor.stellar.org/auth');
      expect(global.fetch).toHaveBeenCalledWith(
        'https://test-anchor.stellar.org/.well-known/stellar.toml',
      );
    });

    it('should throw error when stellar.toml fetch fails', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404,
      });

      await expect(service.getAuthEndpoint('invalid-domain.com')).rejects.toThrow(
        StellarAuthError,
      );
    });

    it('should throw error when WEB_AUTH_ENDPOINT not found', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: jest.fn().mockResolvedValue('TRANSFER_SERVER="https://example.com"'),
      });

      await expect(service.getAuthEndpoint('test-anchor.stellar.org')).rejects.toThrow(
        StellarAuthError,
      );
    });
  });

  describe('getChallenge', () => {
    const mockToml = `WEB_AUTH_ENDPOINT="https://test-anchor.stellar.org/auth"`;

    beforeEach(() => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          text: jest.fn().mockResolvedValue(mockToml),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({
            transaction: 'challenge-xdr-string',
            network_passphrase: TESTNET_PASSPHRASE,
          }),
        });
    });

    it('should request a challenge from the anchor', async () => {
      const challenge = await service.getChallenge({
        account: 'GBTEST1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ12345',
        homeDomain: 'test-anchor.stellar.org',
      });

      expect(challenge.transaction).toBe('challenge-xdr-string');
      expect(challenge.networkPassphrase).toBe(TESTNET_PASSPHRASE);
    });

    it('should throw error when anchor domain not configured', async () => {
      const serviceWithoutDomain = new StellarSep10Service({
        get: jest.fn((key: string) => {
          if (key === 'stellar.anchorDomain') return undefined;
          return mockConfigValues[key];
        }),
      } as any);

      await expect(
        serviceWithoutDomain.getChallenge({
          account: 'GBTEST',
        }),
      ).rejects.toThrow('Anchor domain not configured');
    });

    it('should include memo in challenge request when provided', async () => {
      const challenge = await service.getChallenge({
        account: 'GBTEST1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ12345',
        homeDomain: 'test-anchor.stellar.org',
        memo: '12345',
      });

      expect(challenge).toBeDefined();
      // The URL should include memo parameter
      const fetchCall = (global.fetch as jest.Mock).mock.calls[1][0];
      expect(fetchCall).toContain('memo=12345');
    });

    it('should throw error when challenge request fails', async () => {
      (global.fetch as jest.Mock)
        .mockReset()
        .mockResolvedValueOnce({
          ok: true,
          text: jest.fn().mockResolvedValue(mockToml),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 400,
          text: jest.fn().mockResolvedValue('Invalid account'),
        });

      await expect(
        service.getChallenge({
          account: 'GBINVALID',
          homeDomain: 'test-anchor.stellar.org',
        }),
      ).rejects.toThrow(StellarAuthError);
    });
  });

  describe('signChallenge', () => {
    it('should sign the challenge transaction', () => {
      const challenge = {
        transaction: 'unsigned-xdr',
        networkPassphrase: TESTNET_PASSPHRASE,
      };

      const signedXdr = service.signChallenge(
        challenge,
        'SBSECRET1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234',
      );

      expect(signedXdr).toBe('signed-xdr-string');
    });

    it('should throw error with invalid secret key', () => {
      const { Keypair } = require('@stellar/stellar-sdk');
      Keypair.fromSecret.mockImplementationOnce(() => {
        throw new Error('Invalid secret key');
      });

      const challenge = {
        transaction: 'unsigned-xdr',
        networkPassphrase: TESTNET_PASSPHRASE,
      };

      expect(() =>
        service.signChallenge(challenge, 'INVALID_SECRET'),
      ).toThrow(StellarAuthError);
    });
  });

  describe('submitChallenge', () => {
    const mockToml = `WEB_AUTH_ENDPOINT="https://test-anchor.stellar.org/auth"`;

    // Create a valid JWT token for testing
    const createMockJwt = (exp: number, sub: string) => {
      const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
      const payload = Buffer.from(JSON.stringify({ exp, sub })).toString('base64');
      const signature = 'mock-signature';
      return `${header}.${payload}.${signature}`;
    };

    it('should submit signed challenge and receive JWT token', async () => {
      const futureExp = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      const mockToken = createMockJwt(futureExp, 'GBTEST1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ12345');

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          text: jest.fn().mockResolvedValue(mockToml),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({ token: mockToken }),
        });

      const authToken = await service.submitChallenge(
        'signed-xdr',
        'test-anchor.stellar.org',
      );

      expect(authToken.token).toBe(mockToken);
      expect(authToken.account).toBe('GBTEST1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ12345');
      expect(authToken.expiresAt).toBeInstanceOf(Date);
    });

    it('should throw error when token submission fails', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          text: jest.fn().mockResolvedValue(mockToml),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          text: jest.fn().mockResolvedValue('Invalid signature'),
        });

      await expect(
        service.submitChallenge('invalid-signed-xdr', 'test-anchor.stellar.org'),
      ).rejects.toThrow(StellarAuthError);
    });

    it('should throw error for invalid JWT format', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          text: jest.fn().mockResolvedValue(mockToml),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({ token: 'invalid-token' }),
        });

      await expect(
        service.submitChallenge('signed-xdr', 'test-anchor.stellar.org'),
      ).rejects.toThrow(StellarAuthError);
    });
  });

  describe('authenticate', () => {
    const mockToml = `WEB_AUTH_ENDPOINT="https://test-anchor.stellar.org/auth"`;

    it('should complete full authentication flow', async () => {
      const futureExp = Math.floor(Date.now() / 1000) + 3600;
      const mockToken = Buffer.from(JSON.stringify({ alg: 'HS256' })).toString('base64') +
        '.' +
        Buffer.from(JSON.stringify({ exp: futureExp, sub: 'GBTEST1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ12345' })).toString('base64') +
        '.signature';

      (global.fetch as jest.Mock)
        // First call: get toml for getChallenge
        .mockResolvedValueOnce({
          ok: true,
          text: jest.fn().mockResolvedValue(mockToml),
        })
        // Second call: get challenge
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({
            transaction: 'challenge-xdr',
            network_passphrase: TESTNET_PASSPHRASE,
          }),
        })
        // Third call: get toml for submitChallenge
        .mockResolvedValueOnce({
          ok: true,
          text: jest.fn().mockResolvedValue(mockToml),
        })
        // Fourth call: submit challenge
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({ token: mockToken }),
        });

      const authToken = await service.authenticate(
        'GBTEST1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ12345',
        'SBSECRET1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234',
        'test-anchor.stellar.org',
      );

      expect(authToken.token).toBeDefined();
      expect(authToken.account).toBe('GBTEST1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ12345');
    });

    it('should throw error when anchor domain not provided', async () => {
      const serviceWithoutDomain = new StellarSep10Service({
        get: jest.fn((key: string) => {
          if (key === 'stellar.anchorDomain') return undefined;
          return mockConfigValues[key];
        }),
      } as any);

      await expect(
        serviceWithoutDomain.authenticate(
          'GBTEST',
          'SBSECRET',
          undefined, // No domain provided
        ),
      ).rejects.toThrow('Anchor domain not configured');
    });
  });

  describe('isTokenValid', () => {
    it('should return true for valid non-expired token', () => {
      const futureDate = new Date(Date.now() + 3600000); // 1 hour from now
      const token = {
        token: 'mock-token',
        expiresAt: futureDate,
        account: 'GBTEST',
      };

      expect(service.isTokenValid(token)).toBe(true);
    });

    it('should return false for expired token', () => {
      const pastDate = new Date(Date.now() - 3600000); // 1 hour ago
      const token = {
        token: 'mock-token',
        expiresAt: pastDate,
        account: 'GBTEST',
      };

      expect(service.isTokenValid(token)).toBe(false);
    });

    it('should return false for token expiring within buffer period', () => {
      const nearFuture = new Date(Date.now() + 30000); // 30 seconds from now (within 60s buffer)
      const token = {
        token: 'mock-token',
        expiresAt: nearFuture,
        account: 'GBTEST',
      };

      expect(service.isTokenValid(token)).toBe(false);
    });
  });

  describe('verifyTokenStructure', () => {
    it('should return true for valid JWT structure', () => {
      const futureExp = Math.floor(Date.now() / 1000) + 3600;
      const header = Buffer.from(JSON.stringify({ alg: 'HS256' })).toString('base64');
      const payload = Buffer.from(JSON.stringify({ exp: futureExp, sub: 'GBTEST' })).toString('base64');
      const token = `${header}.${payload}.signature`;

      expect(service.verifyTokenStructure(token)).toBe(true);
    });

    it('should return false for invalid JWT structure', () => {
      expect(service.verifyTokenStructure('invalid-token')).toBe(false);
      expect(service.verifyTokenStructure('part1.part2')).toBe(false);
      expect(service.verifyTokenStructure('')).toBe(false);
    });

    it('should return false for expired token', () => {
      const pastExp = Math.floor(Date.now() / 1000) - 3600;
      const header = Buffer.from(JSON.stringify({ alg: 'HS256' })).toString('base64');
      const payload = Buffer.from(JSON.stringify({ exp: pastExp })).toString('base64');
      const token = `${header}.${payload}.signature`;

      expect(service.verifyTokenStructure(token)).toBe(false);
    });

    it('should return false for malformed payload', () => {
      const header = Buffer.from(JSON.stringify({ alg: 'HS256' })).toString('base64');
      const token = `${header}.invalid-payload.signature`;

      expect(service.verifyTokenStructure(token)).toBe(false);
    });
  });
});
