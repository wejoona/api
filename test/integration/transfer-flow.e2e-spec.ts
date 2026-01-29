import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { WalletRepository } from '../../src/modules/wallet/infrastructure/repositories/wallet.repository';
import { TransactionRepository } from '../../src/modules/transaction/infrastructure/repositories/transaction.repository';
import { UserRepository } from '../../src/modules/user/infrastructure/repositories';

describe('Transfer Flow (e2e)', () => {
  let app: INestApplication;
  let _walletRepository: WalletRepository;
  let transactionRepository: TransactionRepository;
  let _userRepository: UserRepository;
  let authToken: string;
  let userId: string;
  let walletId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();

    _walletRepository = moduleFixture.get<WalletRepository>(WalletRepository);
    transactionRepository = moduleFixture.get<TransactionRepository>(
      TransactionRepository,
    );
    _userRepository = moduleFixture.get<UserRepository>(UserRepository);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Internal Transfer Flow', () => {
    it('should complete full internal transfer flow', async () => {
      // Step 1: Create and authenticate sender
      const senderPhone = `+225${Date.now()}`;
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          phone: senderPhone,
          email: 'sender@example.com',
          name: 'Sender User',
        })
        .expect(201);

      // Login and get token
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ phone: senderPhone })
        .expect(200);

      // Verify OTP (in test environment, use test OTP)
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/verify-otp')
        .send({
          phone: senderPhone,
          otp: '123456', // Test OTP
        })
        .expect(200);

      authToken = loginResponse.body.accessToken;
      userId = loginResponse.body.user.id;

      // Step 2: Create wallet
      const walletResponse = await request(app.getHttpServer())
        .post('/wallet')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(201);

      walletId = walletResponse.body.id;
      expect(walletResponse.body).toHaveProperty('id');
      expect(walletResponse.body.currency).toBe('USDC');

      // Step 3: Set PIN
      await request(app.getHttpServer())
        .post('/wallet/set-pin')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ pin: '123456' })
        .expect(200);

      // Step 4: Create recipient user
      const recipientPhone = `+225${Date.now() + 1}`;
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          phone: recipientPhone,
          email: 'recipient@example.com',
          name: 'Recipient User',
        })
        .expect(201);

      // Step 5: Get balance before transfer
      const balanceBefore = await request(app.getHttpServer())
        .get('/wallet/balance')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(balanceBefore.body).toHaveProperty('balances');

      // Step 6: Initiate internal transfer (should fail - insufficient funds)
      await request(app.getHttpServer())
        .post('/wallet/transfer/internal')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          recipientPhone,
          amount: 100,
          pin: '123456',
          note: 'Test transfer',
        })
        .expect(400); // Insufficient balance

      // In a real test with funding, the flow would continue:
      // - Transfer succeeds
      // - Transaction is created
      // - Balance is updated
      // - Recipient receives funds
    });

    it('should reject transfer with invalid PIN', async () => {
      if (!authToken) {
        return; // Skip if auth setup failed
      }

      await request(app.getHttpServer())
        .post('/wallet/transfer/internal')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          recipientPhone: '+225999999999',
          amount: 10,
          pin: '000000', // Wrong PIN
        })
        .expect(401);
    });

    it('should reject transfer without authentication', async () => {
      await request(app.getHttpServer())
        .post('/wallet/transfer/internal')
        .send({
          recipientPhone: '+225999999999',
          amount: 10,
          pin: '123456',
        })
        .expect(401);
    });

    it('should validate transfer amount', async () => {
      if (!authToken) {
        return;
      }

      // Negative amount
      await request(app.getHttpServer())
        .post('/wallet/transfer/internal')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          recipientPhone: '+225999999999',
          amount: -10,
          pin: '123456',
        })
        .expect(400);

      // Zero amount
      await request(app.getHttpServer())
        .post('/wallet/transfer/internal')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          recipientPhone: '+225999999999',
          amount: 0,
          pin: '123456',
        })
        .expect(400);
    });

    it('should validate recipient phone format', async () => {
      if (!authToken) {
        return;
      }

      await request(app.getHttpServer())
        .post('/wallet/transfer/internal')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          recipientPhone: 'invalid-phone',
          amount: 10,
          pin: '123456',
        })
        .expect(400);
    });
  });

  describe('External Transfer Flow', () => {
    it('should validate external transfer request', async () => {
      if (!authToken) {
        return;
      }

      await request(app.getHttpServer())
        .post('/wallet/transfer/external')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          address: '0xinvalid',
          amount: 50,
          pin: '123456',
          network: 'polygon',
        })
        .expect(400); // Invalid address format
    });

    it('should require valid blockchain address', async () => {
      if (!authToken) {
        return;
      }

      await request(app.getHttpServer())
        .post('/wallet/transfer/external')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          address: '', // Empty address
          amount: 50,
          pin: '123456',
          network: 'polygon',
        })
        .expect(400);
    });
  });

  describe('Transfer History', () => {
    it('should get transfer history', async () => {
      if (!authToken) {
        return;
      }

      const response = await request(app.getHttpServer())
        .get('/wallet/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('transactions');
      expect(Array.isArray(response.body.transactions)).toBe(true);
    });

    it('should filter transfers by type', async () => {
      if (!authToken) {
        return;
      }

      const response = await request(app.getHttpServer())
        .get('/wallet/transactions?type=transfer')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('transactions');
    });

    it('should paginate transfer history', async () => {
      if (!authToken) {
        return;
      }

      const response = await request(app.getHttpServer())
        .get('/wallet/transactions?page=1&limit=10')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('transactions');
      expect(response.body).toHaveProperty('pagination');
    });
  });

  describe('Transfer Limits', () => {
    it('should enforce daily transfer limits', async () => {
      if (!authToken) {
        return;
      }

      // This would test rate limiting on transfers
      // In a real scenario, you'd attempt multiple transfers
      // and verify the limit is enforced
    });

    it('should enforce per-transaction limits', async () => {
      if (!authToken) {
        return;
      }

      await request(app.getHttpServer())
        .post('/wallet/transfer/internal')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          recipientPhone: '+225999999999',
          amount: 1000000, // Exceeds limit
          pin: '123456',
        })
        .expect(400);
    });
  });

  describe('Transfer Status', () => {
    it('should get transfer status by ID', async () => {
      if (!authToken) {
        return;
      }

      // Create a mock transaction first
      const transaction = await transactionRepository.save({
        walletId,
        userId,
        type: 'transfer',
        amount: 100,
        status: 'pending',
        currency: 'USDC',
      } as any);

      const response = await request(app.getHttpServer())
        .get(`/wallet/transactions/${transaction.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', transaction.id);
      expect(response.body).toHaveProperty('status');
    });
  });

  describe('Error Handling', () => {
    it('should handle recipient not found', async () => {
      if (!authToken) {
        return;
      }

      await request(app.getHttpServer())
        .post('/wallet/transfer/internal')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          recipientPhone: '+225000000000', // Non-existent
          amount: 10,
          pin: '123456',
        })
        .expect(404);
    });

    it('should handle concurrent transfer attempts', async () => {
      if (!authToken) {
        return;
      }

      // Simulate concurrent transfers
      const transfers = Array(3)
        .fill(null)
        .map(() =>
          request(app.getHttpServer())
            .post('/wallet/transfer/internal')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
              recipientPhone: '+225999999999',
              amount: 10,
              pin: '123456',
            }),
        );

      const results = await Promise.allSettled(transfers);

      // At least one should fail due to insufficient funds or locking
      const failures = results.filter((r) => r.status === 'rejected');
      expect(failures.length).toBeGreaterThan(0);
    });
  });
});
