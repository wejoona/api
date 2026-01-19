import { Injectable, NotFoundException } from '@nestjs/common';
import { UserRepository } from '../../../infrastructure/repositories';
import { OtpService } from '../services';

export interface LoginUserInput {
  phone: string;
}

export interface LoginUserOutput {
  success: boolean;
  otpExpiresIn: number;
}

@Injectable()
export class LoginUserUsecase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly otpService: OtpService,
  ) {}

  async execute(input: LoginUserInput): Promise<LoginUserOutput> {
    // Check if user exists
    const user = await this.userRepository.findByPhone(input.phone);
    if (!user) {
      throw new NotFoundException('User not found. Please register first.');
    }

    // Send OTP
    await this.otpService.sendOtp(input.phone);

    return {
      success: true,
      otpExpiresIn: 300,
    };
  }
}
