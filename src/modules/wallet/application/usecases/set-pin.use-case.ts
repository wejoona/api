import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UserRepository } from '../../../user/infrastructure/repositories';

export interface SetPinInput {
  userId: string;
  pin: string;
  confirmPin: string;
}

export interface SetPinOutput {
  success: boolean;
  message: string;
}

@Injectable()
export class SetPinUseCase {
  // SECURITY: Increased salt rounds for better protection against brute-force
  // Since PINs are only 4-6 digits, higher rounds provide more security
  private readonly SALT_ROUNDS = 12;

  constructor(private readonly userRepository: UserRepository) {}

  async execute(input: SetPinInput): Promise<SetPinOutput> {
    const user = await this.userRepository.findById(input.userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Validate PINs match
    if (input.pin !== input.confirmPin) {
      throw new BadRequestException('PINs do not match');
    }

    // Validate PIN format (4-6 digits)
    if (!/^\d{4,6}$/.test(input.pin)) {
      throw new BadRequestException('PIN must be 4-6 digits');
    }

    // Check for weak PINs
    if (this.isWeakPin(input.pin)) {
      throw new BadRequestException(
        'PIN is too weak. Avoid sequential or repeated digits.',
      );
    }

    // Hash the PIN
    const pinHash = await bcrypt.hash(input.pin, this.SALT_ROUNDS);

    // Set the PIN
    user.setPin(pinHash);
    await this.userRepository.save(user);

    return {
      success: true,
      message: user.pinSetAt
        ? 'PIN updated successfully'
        : 'PIN set successfully',
    };
  }

  private isWeakPin(pin: string): boolean {
    // Check for all same digits (e.g., 1111, 0000)
    if (/^(\d)\1+$/.test(pin)) {
      return true;
    }

    // Check for sequential ascending (e.g., 1234, 2345)
    const digits = pin.split('').map(Number);
    let isAscending = true;
    let isDescending = true;

    for (let i = 1; i < digits.length; i++) {
      if (digits[i] !== digits[i - 1] + 1) {
        isAscending = false;
      }
      if (digits[i] !== digits[i - 1] - 1) {
        isDescending = false;
      }
    }

    if (isAscending || isDescending) {
      return true;
    }

    return false;
  }
}
