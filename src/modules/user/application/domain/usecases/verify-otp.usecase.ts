import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { User } from '../entities';
import { UserRepository } from '../../../infrastructure/repositories';
import { OtpService } from '../services';
import { KycService } from '../../../../kyc/application/services/kyc.service';

export interface VerifyOtpInput {
  phone: string;
  otp: string;
}

export interface VerifyOtpOutput {
  user: User;
  accessToken: string;
  refreshToken: string;
  kycStatus: string;
}

@Injectable()
export class VerifyOtpUsecase {
  private readonly logger = new Logger(VerifyOtpUsecase.name);
  private readonly refreshSecret: string;
  private readonly refreshExpiresIn: string;

  constructor(
    private readonly userRepository: UserRepository,
    private readonly otpService: OtpService,
    private readonly jwtService: JwtService,
    private readonly kycService: KycService,
    private readonly configService: ConfigService,
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
  }

  async execute(input: VerifyOtpInput): Promise<VerifyOtpOutput> {
    // Verify OTP
    const isValid = await this.otpService.verifyOtp(input.phone, input.otp);
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

    return {
      user: updatedUser,
      accessToken,
      refreshToken,
      kycStatus,
    };
  }
}
