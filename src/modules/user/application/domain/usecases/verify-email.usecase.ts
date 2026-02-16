import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { UserRepository } from '../../../infrastructure/repositories';

export interface VerifyEmailInput {
  userId: string;
  code: string;
}

export interface VerifyEmailOutput {
  verified: boolean;
  message: string;
}

@Injectable()
export class VerifyEmailUsecase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(input: VerifyEmailInput): Promise<VerifyEmailOutput> {
    const user = await this.userRepository.findById(input.userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.emailVerified) {
      return { verified: true, message: 'Email is already verified' };
    }

    if (!user.email) {
      throw new BadRequestException('No email address set');
    }

    const success = user.verifyEmail(input.code);
    if (!success) {
      throw new BadRequestException('Invalid or expired verification code');
    }

    await this.userRepository.save(user);

    return { verified: true, message: 'Email verified successfully' };
  }
}
