import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Service to manage rate limit whitelisting for test accounts.
 * Test phone numbers bypass rate limiting in non-production environments.
 */
@Injectable()
export class RateLimitWhitelistService {
  private readonly logger = new Logger(RateLimitWhitelistService.name);
  private readonly isProduction: boolean;
  private readonly whitelistedPhones: Set<string>;

  constructor(private readonly configService: ConfigService) {
    this.isProduction = this.configService.get('nodeEnv') === 'production';

    // Test phone numbers for development/staging
    // Format: +2250700000000 through +2250700000099
    const testPhones = [];
    for (let i = 0; i < 100; i++) {
      const phoneNumber = `+225070000${i.toString().padStart(4, '0')}`;
      testPhones.push(phoneNumber);
    }

    // Additional test numbers (other countries)
    testPhones.push('+2210700000000'); // Senegal
    testPhones.push('+2230700000000'); // Mali
    testPhones.push('+2260700000000'); // Burkina Faso

    this.whitelistedPhones = new Set(testPhones);

    if (!this.isProduction) {
      this.logger.log(
        `Rate limit whitelist initialized with ${this.whitelistedPhones.size} test phone numbers`,
      );
    }
  }

  /**
   * Check if a phone number is whitelisted and should bypass rate limiting.
   * Whitelist only applies in non-production environments.
   *
   * @param phone - Phone number to check (format: +2250700000000)
   * @returns true if phone should bypass rate limiting
   */
  isWhitelisted(phone: string | undefined): boolean {
    // Whitelist disabled in production for security
    if (this.isProduction) {
      return false;
    }

    if (!phone) {
      return false;
    }

    // Normalize phone number (remove spaces, dashes)
    const normalized = phone.replace(/[\s-]/g, '');

    if (this.whitelistedPhones.has(normalized)) {
      this.logger.debug(`Rate limit bypassed for whitelisted phone: ${phone}`);
      return true;
    }

    return false;
  }

  /**
   * Check if a user should bypass rate limiting based on their phone number.
   *
   * @param user - User object from JWT (must have phone property)
   * @returns true if user should bypass rate limiting
   */
  isUserWhitelisted(user: any): boolean {
    if (!user) {
      return false;
    }

    return this.isWhitelisted(user.phone);
  }

  /**
   * Get list of whitelisted phone numbers (for debugging).
   * Only returns list in non-production environments.
   */
  getWhitelistedPhones(): string[] {
    if (this.isProduction) {
      return [];
    }
    return Array.from(this.whitelistedPhones);
  }
}
