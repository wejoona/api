import { Injectable, Logger } from '@nestjs/common';
import { User } from '../entities';
import { UserRepository } from '../../../infrastructure/repositories';
import { OtpService } from '../services';

export interface RegisterUserInput {
  phone: string;
  countryCode?: string;
}

export interface RegisterUserOutput {
  message: string;
  otpExpiresIn: number;
  isNewUser?: boolean; // Only included in non-production for debugging
}

@Injectable()
export class RegisterUserUsecase {
  private readonly logger = new Logger(RegisterUserUsecase.name);

  constructor(
    private readonly userRepository: UserRepository,
    private readonly otpService: OtpService,
  ) {}

  async execute(input: RegisterUserInput): Promise<RegisterUserOutput> {
    // SECURITY: Check if user already exists
    // To prevent account enumeration, we return the same response whether
    // the phone exists or not. If phone exists, we just send login OTP.
    const existingUser = await this.userRepository.findByPhone(input.phone);

    if (existingUser) {
      // User exists - send login OTP instead
      this.logger.debug(`Phone ${input.phone} already registered, sending login OTP`);
      await this.otpService.sendOtp(input.phone);

      // SECURITY: Return same response to prevent enumeration
      return {
        message: 'Verification code sent to your phone',
        otpExpiresIn: 300,
      };
    }

    // Create new user
    const user = User.create({
      phone: input.phone,
      countryCode: input.countryCode,
    });

    // Save user
    await this.userRepository.save(user);

    // Send OTP for verification
    await this.otpService.sendOtp(input.phone);

    this.logger.log(`New user registered: ${input.phone}`);

    // SECURITY: Same response as existing user to prevent enumeration
    return {
      message: 'Verification code sent to your phone',
      otpExpiresIn: 300,
    };
  }
}
