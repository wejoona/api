import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { UserRepository } from '../../../user/infrastructure/repositories';

export interface VerifyPinInput {
  userId: string;
  pin: string;
}

export interface VerifyPinOutput {
  valid: boolean;
  message: string;
  pinToken?: string;
  expiresIn?: number;
  remainingAttempts?: number;
  lockedUntil?: Date;
}

@Injectable()
export class VerifyPinUseCase {
  // PIN token validity: 5 minutes
  private readonly PIN_TOKEN_TTL_SECONDS = 5 * 60;
  private readonly PIN_TOKEN_TTL_MS = this.PIN_TOKEN_TTL_SECONDS * 1000;

  constructor(
    private readonly userRepository: UserRepository,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

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
    const isValid = await bcrypt.compare(input.pin, user.pinHash);

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

    // Generate PIN verification token for subsequent transfer operations
    const pinToken = crypto.randomBytes(32).toString('hex');
    const cacheKey = `pin_token:${input.userId}:${pinToken}`;

    await this.cacheManager.set(
      cacheKey,
      { verified: true, timestamp: Date.now() },
      this.PIN_TOKEN_TTL_MS,
    );

    return {
      valid: true,
      message: 'PIN verified successfully',
      pinToken,
      expiresIn: this.PIN_TOKEN_TTL_SECONDS,
    };
  }
}
