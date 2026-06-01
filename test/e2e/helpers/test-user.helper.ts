import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';

export interface TestUser {
  id?: string;
  phone: string;
  accessToken?: string;
  refreshToken?: string;
  walletId?: string;
}

/**
 * Helper class for creating and managing test users
 */
export class TestUserHelper {
  constructor(private readonly app: INestApplication) {}

  /**
   * Create a user and automatically verify OTP
   * Returns user with access token
   */
  async createUser(phone: string): Promise<TestUser> {
    // Request OTP
    await request(this.app.getHttpServer())
      .post('/auth/register')
      .send({ phone, countryCode: 'CI' })
      .expect(201);

    // In test environment, we can use a hardcoded OTP or bypass verification
    // For now, we'll use a test OTP that should be configured in the app
    const verifyResponse = await request(this.app.getHttpServer())
      .post('/auth/verify-otp')
      .send({ phone, otp: '123456' }) // Test OTP
      .expect(200);

    const { accessToken, refreshToken, user } = verifyResponse.body;
    const walletId = await this.ensureWallet(accessToken, user.id);

    return {
      id: user.id,
      phone,
      accessToken,
      refreshToken,
      walletId,
    };
  }

  /**
   * Create multiple test users
   */
  async createUsers(
    count: number,
    phonePrefix = '+22507',
  ): Promise<TestUser[]> {
    const users: TestUser[] = [];

    for (let i = 0; i < count; i++) {
      // Generate unique phone numbers
      const phone = `${phonePrefix}${String(i).padStart(8, '0')}`;
      const user = await this.createUser(phone);
      users.push(user);
    }

    return users;
  }

  /**
   * Login an existing user
   */
  async loginUser(phone: string): Promise<TestUser> {
    // Request login OTP
    await request(this.app.getHttpServer())
      .post('/auth/login')
      .send({ phone })
      .expect(200);

    // Verify OTP
    const verifyResponse = await request(this.app.getHttpServer())
      .post('/auth/verify-otp')
      .send({ phone, otp: '123456' })
      .expect(200);

    const { accessToken, refreshToken, user } = verifyResponse.body;
    const walletId = await this.ensureWallet(accessToken, user.id);

    return {
      id: user.id,
      phone,
      accessToken,
      refreshToken,
      walletId,
    };
  }

  /**
   * Get user profile
   */
  async getUserProfile(accessToken: string) {
    const response = await request(this.app.getHttpServer())
      .get('/user/profile')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    return response.body;
  }

  /**
   * Update user profile
   */
  async updateProfile(
    accessToken: string,
    updates: {
      username?: string;
      firstName?: string;
      lastName?: string;
      email?: string;
    },
  ) {
    const response = await request(this.app.getHttpServer())
      .put('/user/profile')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(updates)
      .expect(200);

    return response.body;
  }

  /**
   * Set transaction PIN for user
   */
  async setPin(accessToken: string, pin: string) {
    const response = await request(this.app.getHttpServer())
      .post('/wallet/pin/set')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ pin, confirmPin: pin })
      .expect(200);

    return response.body;
  }

  /**
   * Verify PIN and get PIN token
   */
  async verifyPin(accessToken: string, pin: string): Promise<string> {
    const response = await request(this.app.getHttpServer())
      .post('/wallet/pin/verify')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ pin })
      .expect(200);

    return response.body.pinToken;
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string) {
    const response = await request(this.app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken })
      .expect(200);

    return response.body;
  }

  /**
   * Logout user
   */
  async logout(accessToken: string, refreshToken: string) {
    await request(this.app.getHttpServer())
      .post('/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ refreshToken })
      .expect(200);
  }

  private async ensureWallet(accessToken: string, userId: string): Promise<string> {
    await request(this.app.getHttpServer())
      .post('/wallet/create')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect((response) => {
        if (![200, 201, 409].includes(response.status)) {
          throw new Error(`Expected wallet creation success, got ${response.status}`);
        }
      });

    const dataSource = this.app.get(DataSource);
    await dataSource.query(
      `UPDATE auth.users SET kyc_status = 'approved' WHERE id = $1`,
      [userId],
    );
    const result = await dataSource.query(
      `UPDATE wallets
       SET status = 'active', kyc_status = 'approved', balance = 1000
       WHERE user_id = $1
       RETURNING id`,
      [userId],
    );

    return result[0]?.id;
  }
}
