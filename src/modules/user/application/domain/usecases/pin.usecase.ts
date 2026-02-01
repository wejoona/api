import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  Inject,
  UnauthorizedException,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { UserRepository } from '../../../infrastructure/repositories';
import { OtpService } from '../services';

// ============================================
// SET PIN
// ============================================

export interface SetPinInput {
  userId: string;
  pinHash: string; // Client-side SHA256 hash
}

export interface SetPinOutput {
  success: boolean;
  message: string;
}

@Injectable()
export class SetPinUsecase {
  // SECURITY: High salt rounds since we're hashing an already-hashed PIN
  private readonly SALT_ROUNDS = 12;

  constructor(private readonly userRepository: UserRepository) {}

  async execute(input: SetPinInput): Promise<SetPinOutput> {
    const user = await this.userRepository.findById(input.userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if user already has a PIN set
    if (user.hasPin) {
      throw new BadRequestException(
        'PIN already set. Use change PIN endpoint to update.',
      );
    }

    // Validate PIN hash format (should be SHA256 from client)
    if (!/^[a-f0-9]{64}$/i.test(input.pinHash)) {
      throw new BadRequestException('Invalid PIN hash format');
    }

    // Hash the client-provided hash again for double security
    const serverPinHash = await bcrypt.hash(input.pinHash, this.SALT_ROUNDS);

    // Set the PIN
    user.setPin(serverPinHash);
    await this.userRepository.save(user);

    return {
      success: true,
      message: 'PIN set successfully',
    };
  }
}

// ============================================
// CHANGE PIN
// ============================================

export interface ChangePinInput {
  userId: string;
  oldPinHash: string; // Client-side SHA256 hash
  newPinHash: string; // Client-side SHA256 hash
}

export interface ChangePinOutput {
  success: boolean;
  message: string;
}

@Injectable()
export class ChangePinUsecase {
  private readonly SALT_ROUNDS = 12;

  constructor(private readonly userRepository: UserRepository) {}

  async execute(input: ChangePinInput): Promise<ChangePinOutput> {
    const user = await this.userRepository.findById(input.userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if user has a PIN set
    if (!user.hasPin) {
      throw new BadRequestException('PIN not set. Use set PIN endpoint first.');
    }

    // Check if PIN is locked
    if (user.isPinLocked) {
      throw new ForbiddenException({
        message: 'PIN is locked due to too many failed attempts',
        lockedUntil: user.pinLockedUntil,
      });
    }

    // Verify old PIN
    const isOldPinValid = await bcrypt.compare(input.oldPinHash, user.pinHash);

    if (!isOldPinValid) {
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
        message: 'Invalid old PIN',
        remainingAttempts,
      });
    }

    // Validate new PIN hash format
    if (!/^[a-f0-9]{64}$/i.test(input.newPinHash)) {
      throw new BadRequestException('Invalid new PIN hash format');
    }

    // Ensure new PIN is different from old PIN
    if (input.oldPinHash === input.newPinHash) {
      throw new BadRequestException('New PIN must be different from old PIN');
    }

    // Hash the new PIN
    const serverPinHash = await bcrypt.hash(input.newPinHash, this.SALT_ROUNDS);

    // Update the PIN
    user.setPin(serverPinHash);
    await this.userRepository.save(user);

    return {
      success: true,
      message: 'PIN changed successfully',
    };
  }
}

// ============================================
// VERIFY PIN
// ============================================

export interface VerifyPinInput {
  userId: string;
  pinHash: string; // Client-side SHA256 hash
}

export interface VerifyPinOutput {
  verified: boolean;
  pinToken: string;
  expiresIn: number;
}

@Injectable()
export class VerifyPinUsecase {
  // PIN token validity: 5 minutes
  private readonly PIN_TOKEN_TTL = 5 * 60;

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
    const isValid = await bcrypt.compare(input.pinHash, user.pinHash);

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

    // Generate PIN verification token for subsequent sensitive operations
    const pinToken = crypto.randomBytes(32).toString('hex');
    const cacheKey = `pin_token:${input.userId}:${pinToken}`;

    await this.cacheManager.set(
      cacheKey,
      { verified: true, timestamp: Date.now() },
      this.PIN_TOKEN_TTL,
    );

    return {
      verified: true,
      pinToken,
      expiresIn: this.PIN_TOKEN_TTL,
    };
  }
}

// ============================================
// RESET PIN
// ============================================

export interface ResetPinInput {
  userId: string;
  otp: string;
  newPinHash: string; // Client-side SHA256 hash
}

export interface ResetPinOutput {
  success: boolean;
  message: string;
}

@Injectable()
export class ResetPinUsecase {
  private readonly SALT_ROUNDS = 12;

  constructor(
    private readonly userRepository: UserRepository,
    private readonly otpService: OtpService,
  ) {}

  async execute(input: ResetPinInput): Promise<ResetPinOutput> {
    const user = await this.userRepository.findById(input.userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify OTP
    const isOtpValid = await this.otpService.verifyOtp(user.phone, input.otp);

    if (!isOtpValid) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    // Validate new PIN hash format
    if (!/^[a-f0-9]{64}$/i.test(input.newPinHash)) {
      throw new BadRequestException('Invalid PIN hash format');
    }

    // Hash the new PIN
    const serverPinHash = await bcrypt.hash(input.newPinHash, this.SALT_ROUNDS);

    // Set the new PIN and clear any lockout
    user.setPin(serverPinHash);
    await this.userRepository.save(user);

    return {
      success: true,
      message: 'PIN reset successfully',
    };
  }
}
