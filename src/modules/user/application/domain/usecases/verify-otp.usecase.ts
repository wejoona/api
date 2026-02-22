import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { User } from '../entities';
import { UserRepository } from '../../../infrastructure/repositories';
import { VerificationFacadeService } from '../../../../verification/application/services/verification-facade.service';
import { KycService } from '../../../../kyc/application/services/kyc.service';
import { SessionService } from '../../../../session/application/services/session.service';

export interface VerifyOtpInput {
  phone: string;
  otp: string;
  ipAddress?: string;
  userAgent?: string;
  deviceId?: string;
}

export interface VerifyOtpOutput {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  kycStatus: string;
}

@Injectable()
export class VerifyOtpUsecase {
  private readonly logger = new Logger(VerifyOtpUsecase.name);
  private readonly refreshSecret: string;
  private readonly refreshExpiresIn: string;
  private readonly accessExpiresIn: string;

  constructor(
    private readonly userRepository: UserRepository,
    private readonly verificationFacade: VerificationFacadeService,
    private readonly jwtService: JwtService,
    private readonly kycService: KycService,
    private readonly configService: ConfigService,
    private readonly sessionService: SessionService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    // Use separate secret for refresh tokens - no fallback for security
    this.refreshSecret = this.configService.get<string>('jwt.refreshSecret');
    if (!this.refreshSecret) {
      throw new Error('JWT_REFRESH_SECRET environment variable is required');
    }
    this.refreshExpiresIn = this.configService.get<string>(
      'jwt.refreshExpiresIn',
      '7d',
    );
    this.accessExpiresIn = this.configService.get<string>(
      'jwt.accessExpiration',
      '15m',
    );
  }

  /**
   * Parse duration string (e.g., '15m', '1h', '7d') to seconds
   */
  private parseExpirationToSeconds(expiration: string): number {
    const match = expiration.match(/^(\d+)([smhd])$/);
    if (!match) return 900; // Default 15 minutes

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 60 * 60;
      case 'd':
        return value * 60 * 60 * 24;
      default:
        return 900;
    }
  }

  async execute(input: VerifyOtpInput): Promise<VerifyOtpOutput> {
    // Verify OTP
    const isValid = await this.verificationFacade.verifyOtp(input.phone, input.otp);
    if (!isValid) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    // Find user
    const user = await this.userRepository.findByPhone(input.phone);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if this is first verification (phone not yet verified)
    const isFirstVerification = !user.isPhoneVerified;

    // Mark phone as verified
    user.verifyPhone();
    const updatedUser = await this.userRepository.save(user);

    // Create KYC record on first phone verification
    // Wallet will be created automatically when KYC is approved
    let kycStatus = 'documents_pending';
    if (isFirstVerification) {
      try {
        this.logger.log(`Creating KYC record for user ${updatedUser.id}`);
        const kyc = await this.kycService.createForUser(updatedUser.id);
        kycStatus = kyc.status;
        this.logger.log(
          `KYC record created for user ${updatedUser.id}: status=${kycStatus}`,
        );
      } catch (error) {
        // Log but don't fail - KYC record can be created later
        this.logger.error(
          `Failed to create KYC record for user ${updatedUser.id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    } else {
      // Get existing KYC status for returning users
      try {
        const existingKyc = await this.kycService.getStatus(updatedUser.id);
        kycStatus = existingKyc.status;
      } catch {
        // Ignore - use default status
      }
    }

    // Generate JWT
    const accessToken = this.jwtService.sign({
      sub: updatedUser.id,
      phone: updatedUser.phone,
    });

    // Generate refresh token with separate secret
    const refreshToken = this.jwtService.sign(
      {
        sub: updatedUser.id,
        type: 'refresh',
      },
      {
        secret: this.refreshSecret,
        expiresIn: this.refreshExpiresIn as `${number}${'s' | 'm' | 'h' | 'd'}`,
      },
    );

    // Create session record
    try {
      await this.sessionService.createSession({
        userId: updatedUser.id,
        deviceId: input.deviceId,
        refreshToken,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        expiresInSeconds: this.parseExpirationToSeconds(this.refreshExpiresIn),
      });
    } catch (error) {
      this.logger.error(`Failed to create session: ${error.message}`);
      // Don't fail login if session creation fails
    }

    // Emit events
    this.eventEmitter.emit('user.verified', {
      userId: updatedUser.id,
      phone: updatedUser.phone,
      isFirstVerification,
      timestamp: new Date(),
    });

    this.eventEmitter.emit('security.login.success', {
      userId: updatedUser.id,
      phone: updatedUser.phone,
      timestamp: new Date(),
    });

    return {
      user: updatedUser,
      accessToken,
      refreshToken,
      expiresIn: this.parseExpirationToSeconds(this.accessExpiresIn),
      kycStatus,
    };
  }
}
