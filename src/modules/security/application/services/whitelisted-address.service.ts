import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { WhitelistedAddress, AddressType } from '../../domain/entities';
import { WhitelistedAddressRepository } from '../../infrastructure/repositories';
import { UserRepository } from '../../../user/infrastructure/repositories';
import { CheckAddressResponse } from '../dto';

export interface CreateWhitelistedAddressInput {
  userId: string;
  address: string;
  label: string;
  addressType?: AddressType;
  network?: string;
}

export interface VerifyAddressInput {
  addressId: string;
  userId: string;
  pin: string;
}

@Injectable()
export class WhitelistedAddressService {
  // Maximum withdrawal amount (in USDC) without 24h delay for new addresses
  private readonly instantWithdrawalLimit: number;

  constructor(
    private readonly addressRepository: WhitelistedAddressRepository,
    private readonly userRepository: UserRepository,
    private readonly configService: ConfigService,
  ) {
    this.instantWithdrawalLimit = this.configService.get<number>(
      'INSTANT_WITHDRAWAL_LIMIT',
      1000,
    );
  }

  async addAddress(
    input: CreateWhitelistedAddressInput,
  ): Promise<WhitelistedAddress> {
    // Check for duplicate
    const existing = await this.addressRepository.findByAddress(
      input.userId,
      input.address,
    );

    if (existing) {
      if (existing.status === 'revoked') {
        // Re-activate revoked address but require verification
        existing.verify();
        return this.addressRepository.save(existing);
      }
      throw new ConflictException('Address is already whitelisted');
    }

    const address = WhitelistedAddress.create({
      userId: input.userId,
      address: input.address,
      label: input.label,
      addressType: input.addressType,
      network: input.network,
    });

    return this.addressRepository.save(address);
  }

  async verifyAddress(input: VerifyAddressInput): Promise<WhitelistedAddress> {
    const address = await this.addressRepository.findById(input.addressId);
    if (!address || address.userId !== input.userId) {
      throw new NotFoundException('Address not found');
    }

    if (address.status === 'active') {
      throw new BadRequestException('Address is already verified');
    }

    // Verify user's PIN
    const user = await this.userRepository.findById(input.userId);
    if (!user || !user.pinHash) {
      throw new BadRequestException('PIN not set');
    }

    if (user.isPinLocked) {
      throw new ForbiddenException(
        'Account is temporarily locked due to too many failed attempts',
      );
    }

    const isValidPin = await bcrypt.compare(input.pin, user.pinHash);
    if (!isValidPin) {
      user.recordFailedPinAttempt();
      await this.userRepository.save(user);
      throw new ForbiddenException('Invalid PIN');
    }

    user.resetPinAttempts();
    await this.userRepository.save(user);

    address.verify();
    return this.addressRepository.save(address);
  }

  async getAddresses(userId: string): Promise<WhitelistedAddress[]> {
    return this.addressRepository.findByUserId(userId);
  }

  async getActiveAddresses(userId: string): Promise<WhitelistedAddress[]> {
    return this.addressRepository.findActiveByUserId(userId);
  }

  async getAddressById(
    addressId: string,
    userId: string,
  ): Promise<WhitelistedAddress> {
    const address = await this.addressRepository.findById(addressId);
    if (!address || address.userId !== userId) {
      throw new NotFoundException('Address not found');
    }
    return address;
  }

  async updateLabel(
    addressId: string,
    userId: string,
    label: string,
  ): Promise<WhitelistedAddress> {
    const address = await this.getAddressById(addressId, userId);
    address.updateLabel(label);
    return this.addressRepository.save(address);
  }

  async revokeAddress(addressId: string, userId: string): Promise<void> {
    const address = await this.getAddressById(addressId, userId);
    address.revoke();
    await this.addressRepository.save(address);
  }

  async deleteAddress(addressId: string, userId: string): Promise<void> {
    const address = await this.getAddressById(addressId, userId);
    await this.addressRepository.delete(address.id);
  }

  /**
   * Check if an address is whitelisted and what restrictions apply
   */
  async checkAddress(
    userId: string,
    address: string,
  ): Promise<CheckAddressResponse> {
    const whitelisted = await this.addressRepository.findActiveByAddress(
      userId,
      address,
    );

    if (!whitelisted) {
      return {
        isWhitelisted: false,
        isNew: true,
        hoursUntilTrusted: 24,
        requiresDelay: true,
        instantLimit: 0, // All withdrawals to non-whitelisted addresses require confirmation
      };
    }

    const isNew = whitelisted.isNewAddress;

    return {
      isWhitelisted: true,
      isNew,
      hoursUntilTrusted: whitelisted.hoursUntilTrusted,
      requiresDelay: isNew,
      instantLimit: isNew
        ? this.instantWithdrawalLimit
        : Number.MAX_SAFE_INTEGER,
    };
  }

  /**
   * Record that an address was used for a transaction
   */
  async recordUsage(userId: string, address: string): Promise<void> {
    const whitelisted = await this.addressRepository.findActiveByAddress(
      userId,
      address,
    );

    if (whitelisted) {
      whitelisted.recordUsage();
      await this.addressRepository.save(whitelisted);
    }
  }

  /**
   * Check if withdrawal amount is allowed for this address
   * Returns true if allowed, or throws an error explaining the restriction
   */
  async validateWithdrawal(
    userId: string,
    address: string,
    amount: number,
  ): Promise<{ allowed: boolean; message?: string }> {
    const check = await this.checkAddress(userId, address);

    if (!check.isWhitelisted) {
      return {
        allowed: false,
        message:
          'This address is not whitelisted. Please add it to your trusted addresses first.',
      };
    }

    if (check.isNew && amount > this.instantWithdrawalLimit) {
      return {
        allowed: false,
        message: `This is a new address. Withdrawals over ${this.instantWithdrawalLimit} USDC require waiting ${check.hoursUntilTrusted} hours or adding the address to your whitelist first.`,
      };
    }

    return { allowed: true };
  }
}
