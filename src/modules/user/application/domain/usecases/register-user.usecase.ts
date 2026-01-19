import { Injectable, ConflictException } from '@nestjs/common';
import { User } from '../entities';
import { UserRepository } from '../../../infrastructure/repositories';
import { OtpService } from '../services';

export interface RegisterUserInput {
  phone: string;
  countryCode?: string;
}

export interface RegisterUserOutput {
  user: User;
  otpExpiresIn: number;
}

@Injectable()
export class RegisterUserUsecase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly otpService: OtpService,
  ) {}

  async execute(input: RegisterUserInput): Promise<RegisterUserOutput> {
    // Check if user already exists
    const existingUser = await this.userRepository.findByPhone(input.phone);
    if (existingUser) {
      throw new ConflictException('Phone number already registered');
    }

    // Create new user
    const user = User.create({
      phone: input.phone,
      countryCode: input.countryCode,
    });

    // Save user
    const savedUser = await this.userRepository.save(user);

    // Send OTP for verification
    await this.otpService.sendOtp(input.phone);

    return {
      user: savedUser,
      otpExpiresIn: 300,
    };
  }
}
