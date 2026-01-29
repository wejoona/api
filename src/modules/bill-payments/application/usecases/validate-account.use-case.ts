import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { BillProviderRepository } from '../../infrastructure/repositories';
import { BillAdapterService } from '../services/bill-adapter.service';
import {
  AccountValidationResult,
  AccountValidationRequest,
} from '../../domain/types';

export interface ValidateAccountInput {
  providerId: string;
  accountNumber: string;
  meterNumber?: string;
}

@Injectable()
export class ValidateAccountUseCase {
  private readonly logger = new Logger(ValidateAccountUseCase.name);

  constructor(
    private readonly providerRepository: BillProviderRepository,
    private readonly adapterService: BillAdapterService,
  ) {}

  async execute(input: ValidateAccountInput): Promise<AccountValidationResult> {
    this.logger.debug(
      `Validating account: provider=${input.providerId}, account=${input.accountNumber}`,
    );

    // Get provider
    const providerData = await this.providerRepository.findByIdWithConfig(
      input.providerId,
    );
    if (!providerData) {
      throw new NotFoundException('Bill provider not found');
    }

    const { provider } = providerData;

    if (!provider.isActive) {
      throw new BadRequestException(
        'This bill provider is currently unavailable',
      );
    }

    // Validate account number format if pattern is specified
    if (provider.accountNumberPattern) {
      const pattern = new RegExp(provider.accountNumberPattern);
      if (!pattern.test(input.accountNumber)) {
        return {
          isValid: false,
          accountNumber: input.accountNumber,
          message: `Invalid ${provider.accountNumberLabel.toLowerCase()} format`,
        };
      }
    }

    // Validate account number length if specified
    if (
      provider.accountNumberLength &&
      input.accountNumber.length !== provider.accountNumberLength
    ) {
      return {
        isValid: false,
        accountNumber: input.accountNumber,
        message: `${provider.accountNumberLabel} must be ${provider.accountNumberLength} characters`,
      };
    }

    // Check if meter number is required but not provided
    if (provider.requiresMeterNumber && !input.meterNumber) {
      return {
        isValid: false,
        accountNumber: input.accountNumber,
        message: 'Meter number is required for this provider',
      };
    }

    // If provider doesn't support validation, return success with no customer name
    if (!provider.supportsValidation) {
      this.logger.debug(
        `Provider ${provider.shortName} doesn't support validation`,
      );
      return {
        isValid: true,
        accountNumber: input.accountNumber,
        meterNumber: input.meterNumber,
        message: 'Account will be validated during payment',
      };
    }

    // Get adapter and validate
    const adapter = this.adapterService.getAdapter(providerData.adapterType);

    const request: AccountValidationRequest = {
      providerId: input.providerId,
      accountNumber: input.accountNumber,
      meterNumber: input.meterNumber,
    };

    const result = await adapter.validateAccount(request);

    this.logger.log(
      `Account validation result: provider=${provider.shortName}, account=${input.accountNumber}, valid=${result.isValid}`,
    );

    return result;
  }
}
