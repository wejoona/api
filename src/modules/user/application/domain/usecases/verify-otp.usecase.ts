import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '../entities';
import { UserRepository } from '../../../infrastructure/repositories';
import { OtpService } from '../services';
import { CreateWalletUseCase } from '../../../../wallet/application/usecases';

export interface VerifyOtpInput {
  phone: string;
  otp: string;
}

export interface VerifyOtpOutput {
  user: User;
  accessToken: string;
  walletCreated: boolean;
}

@Injectable()
export class VerifyOtpUsecase {
  private readonly logger = new Logger(VerifyOtpUsecase.name);

  constructor(
    private readonly userRepository: UserRepository,
    private readonly otpService: OtpService,
    private readonly jwtService: JwtService,
    private readonly createWalletUseCase: CreateWalletUseCase,
  ) {}

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

    // Auto-create wallet on first phone verification
    let walletCreated = false;
    if (isFirstVerification) {
      try {
        this.logger.log(`Auto-creating wallet for user ${updatedUser.id}`);
        await this.createWalletUseCase.execute({ userId: updatedUser.id });
        walletCreated = true;
        this.logger.log(
          `Wallet created successfully for user ${updatedUser.id}`,
        );
      } catch (error) {
        // Log but don't fail - wallet can be created later
        this.logger.error(
          `Failed to auto-create wallet for user ${updatedUser.id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }

    // Generate JWT
    const accessToken = this.jwtService.sign({
      sub: updatedUser.id,
      phone: updatedUser.phone,
    });

    return {
      user: updatedUser,
      accessToken,
      walletCreated,
    };
  }
}
