import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UserRepository } from '../../../user/infrastructure/repositories';

export interface VerifyPinInput {
  userId: string;
  pin: string;
}

export interface VerifyPinOutput {
  valid: boolean;
  message: string;
  remainingAttempts?: number;
  lockedUntil?: Date;
}

@Injectable()
export class VerifyPinUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(input: VerifyPinInput): Promise<VerifyPinOutput> {
    const user = await this.userRepository.findById(input.userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if user has a PIN set
    if (!user.hasPin) {
      throw new BadRequestException('PIN not set. Please set your PIN first.');
    }

    // Check if PIN is locked
    if (user.isPinLocked) {
      throw new ForbiddenException({
        message: 'PIN is locked due to too many failed attempts',
        lockedUntil: user.pinLockedUntil,
      });
    }

    // Verify the PIN
    const isValid = await bcrypt.compare(input.pin, user.pinHash!);

    if (!isValid) {
      // Record failed attempt
      user.recordFailedPinAttempt();
      await this.userRepository.save(user);

      const remainingAttempts = Math.max(0, 5 - user.pinAttempts);

      if (user.isPinLocked) {
        throw new ForbiddenException({
          message: 'PIN is locked due to too many failed attempts',
          lockedUntil: user.pinLockedUntil,
        });
      }

      throw new BadRequestException({
        message: 'Invalid PIN',
        remainingAttempts,
      });
    }

    // Reset attempts on successful verification
    user.resetPinAttempts();
    await this.userRepository.save(user);

    return {
      valid: true,
      message: 'PIN verified successfully',
    };
  }
}
