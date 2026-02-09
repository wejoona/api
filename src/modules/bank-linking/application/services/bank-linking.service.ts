import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { LinkedBankAccountRepository } from '../../domain/repositories/linked-bank-account.repository';
import { BankRepository } from '../../domain/repositories/bank.repository';
import {
  LinkedBankAccount,
  BankVerificationMethod,
  BankAccountStatus,
} from '../../domain/entities/linked-bank-account.entity';
import { Bank } from '../../domain/entities/bank.entity';

export interface LinkBankAccountParams {
  walletId: string;
  bankCode: string;
  accountNumber: string;
  accountHolderName: string;
  countryCode?: string;
}

export interface VerifyBankAccountParams {
  walletId: string;
  accountId: string;
  otp: string;
}

export interface DepositParams {
  walletId: string;
  accountId: string;
  amount: number;
  description?: string;
}

export interface WithdrawParams {
  walletId: string;
  accountId: string;
  amount: number;
  description?: string;
}

export interface BankAccountResponse {
  id: string;
  wallet_id: string;
  bank_code: string;
  bank_name: string;
  bank_logo_url: string | null;
  account_number_masked: string;
  account_holder_name: string;
  status: BankAccountStatus;
  is_verified: boolean;
  is_primary: boolean;
  country_code: string;
  currency: string;
  available_balance: number | null;
  last_balance_check_at: Date | null;
  last_verified_at: Date | null;
  supports_balance_check: boolean;
  supports_direct_debit: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface BankResponse {
  code: string;
  name: string;
  logo_url: string | null;
  country: string;
  verification_methods: BankVerificationMethod[];
  supports_balance_check: boolean;
  supports_direct_debit: boolean;
}

@Injectable()
export class BankLinkingService {
  private readonly logger = new Logger(BankLinkingService.name);
  private readonly maxAccountsPerWallet = 5;
  private readonly encryptionKey: string;

  constructor(
    private readonly linkedBankAccountRepository: LinkedBankAccountRepository,
    private readonly bankRepository: BankRepository,
  ) {
    // In production, load from environment variable or secrets manager
    this.encryptionKey =
      process.env.BANK_ACCOUNT_ENCRYPTION_KEY ||
      'default-key-change-in-production-32';
  }

  /**
   * Get all available banks.
   */
  async getBanks(countryCode?: string): Promise<BankResponse[]> {
    let banks: Bank[];

    if (countryCode) {
      banks = await this.bankRepository.findByCountry(countryCode);
    } else {
      banks = await this.bankRepository.findActive();
    }

    return banks.map(this.toBankResponse);
  }

  /**
   * Link a new bank account.
   */
  async linkBankAccount(
    params: LinkBankAccountParams,
  ): Promise<BankAccountResponse> {
    const {
      walletId,
      bankCode,
      accountNumber,
      accountHolderName,
      countryCode,
    } = params;

    // Check if account limit reached
    const count =
      await this.linkedBankAccountRepository.countByWalletId(walletId);
    if (count >= this.maxAccountsPerWallet) {
      throw new ConflictException(
        `Maximum number of bank accounts (${this.maxAccountsPerWallet}) reached`,
      );
    }

    // Get bank details
    const bank = await this.bankRepository.findByCode(bankCode);
    if (!bank) {
      throw new BadRequestException('Invalid bank code');
    }

    if (!bank.isActive) {
      throw new BadRequestException('Bank is not currently supported');
    }

    // Encrypt account number
    const accountNumberEncrypted = this.encryptAccountNumber(accountNumber);
    const accountNumberMasked = this.maskAccountNumber(accountNumber);

    // Create linked account
    const linkedAccount = LinkedBankAccount.create({
      walletId,
      bankCode: bank.code,
      bankName: bank.name,
      bankLogoUrl: bank.logoUrl,
      accountNumberEncrypted,
      accountNumberMasked,
      accountHolderName,
      countryCode: countryCode || bank.country,
      supportsBalanceCheck: bank.supportsBalanceCheck,
      supportsDirectDebit: bank.supportsDirectDebit,
    });

    const saved = await this.linkedBankAccountRepository.save(linkedAccount);

    this.logger.log(
      `Linked bank account ${saved.id} for wallet ${walletId}: ${bank.name}`,
    );

    // PROVIDER_INTEGRATION: Initiate MoMo/Wave OTP verification

    return this.toResponse(saved);
  }

  /**
   * Verify a bank account.
   */
  async verifyBankAccount(
    params: VerifyBankAccountParams,
  ): Promise<BankAccountResponse> {
    const { walletId, accountId, otp } = params;

    const account = await this.getAccountForWallet(walletId, accountId);

    if (account.isVerified) {
      throw new BadRequestException('Account is already verified');
    }

    // PROVIDER_INTEGRATION: Verify OTP with MoMo/Wave API
    // For now, accept "123456" as valid OTP (matching mobile mock)
    if (otp !== '123456') {
      throw new BadRequestException('Invalid OTP code');
    }

    account.verify(BankVerificationMethod.OTP);
    const saved = await this.linkedBankAccountRepository.save(account);

    this.logger.log(`Verified bank account ${accountId}`);

    return this.toResponse(saved);
  }

  /**
   * Get all linked accounts for a wallet.
   */
  async getLinkedAccounts(walletId: string): Promise<BankAccountResponse[]> {
    const accounts =
      await this.linkedBankAccountRepository.findByWalletId(walletId);
    return accounts.map(this.toResponse);
  }

  /**
   * Get a single linked account.
   */
  async getLinkedAccount(
    walletId: string,
    accountId: string,
  ): Promise<BankAccountResponse> {
    const account = await this.getAccountForWallet(walletId, accountId);
    return this.toResponse(account);
  }

  /**
   * Set an account as primary.
   */
  async setPrimaryAccount(
    walletId: string,
    accountId: string,
  ): Promise<BankAccountResponse> {
    const account = await this.getAccountForWallet(walletId, accountId);

    if (!account.isVerified) {
      throw new BadRequestException(
        'Only verified accounts can be set as primary',
      );
    }

    // Unset all primary accounts for wallet
    await this.linkedBankAccountRepository.unsetAllPrimaryForWallet(walletId);

    // Set this account as primary
    account.setPrimary();
    const saved = await this.linkedBankAccountRepository.save(account);

    this.logger.log(
      `Set bank account ${accountId} as primary for wallet ${walletId}`,
    );

    return this.toResponse(saved);
  }

  /**
   * Get account balance.
   */
  async getBalance(
    walletId: string,
    accountId: string,
  ): Promise<{ balance: number; currency: string; updated_at: Date }> {
    const account = await this.getAccountForWallet(walletId, accountId);

    if (!account.canCheckBalance()) {
      throw new BadRequestException(
        'Balance check not supported for this account',
      );
    }

    // PROVIDER_INTEGRATION: Fetch balance from linked MoMo/Wave account
    // For now, return mock balance
    const balance = 500000;
    account.updateBalance(balance);
    await this.linkedBankAccountRepository.save(account);

    return {
      balance,
      currency: account.currency,
      updated_at: new Date(),
    };
  }

  /**
   * Deposit from bank account to wallet.
   */
  async deposit(params: DepositParams): Promise<{
    transaction_id: string;
    amount: number;
    status: string;
    created_at: Date;
  }> {
    const { walletId, accountId, amount, description } = params;

    const account = await this.getAccountForWallet(walletId, accountId);

    if (!account.canDeposit()) {
      throw new BadRequestException(
        'Account not verified or not eligible for deposits',
      );
    }

    if (amount <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }

    // PROVIDER_INTEGRATION: Initiate deposit via MoMo/Wave collection API
    const transactionId = `tx-${Date.now()}`;

    this.logger.log(
      `Initiated deposit of ${amount} from bank account ${accountId} to wallet ${walletId}`,
    );

    return {
      transaction_id: transactionId,
      amount,
      status: 'completed',
      created_at: new Date(),
    };
  }

  /**
   * Withdraw from wallet to bank account.
   */
  async withdraw(params: WithdrawParams): Promise<{
    transaction_id: string;
    amount: number;
    status: string;
    estimated_completion: Date;
    created_at: Date;
  }> {
    const { walletId, accountId, amount, description } = params;

    const account = await this.getAccountForWallet(walletId, accountId);

    if (!account.canWithdraw()) {
      throw new BadRequestException(
        'Account not verified or withdrawals not supported',
      );
    }

    if (amount <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }

    // PROVIDER_INTEGRATION: Initiate withdrawal via MoMo/Wave disbursement API
    const transactionId = `tx-${Date.now()}`;
    const estimatedCompletion = new Date();
    estimatedCompletion.setHours(estimatedCompletion.getHours() + 2);

    this.logger.log(
      `Initiated withdrawal of ${amount} from wallet ${walletId} to bank account ${accountId}`,
    );

    return {
      transaction_id: transactionId,
      amount,
      status: 'pending',
      estimated_completion: estimatedCompletion,
      created_at: new Date(),
    };
  }

  /**
   * Unlink a bank account.
   */
  async unlinkAccount(walletId: string, accountId: string): Promise<void> {
    const account = await this.getAccountForWallet(walletId, accountId);
    await this.linkedBankAccountRepository.delete(account.id);
    this.logger.log(
      `Unlinked bank account ${accountId} from wallet ${walletId}`,
    );
  }

  /**
   * Helper: Get account and verify ownership.
   */
  private async getAccountForWallet(
    walletId: string,
    accountId: string,
  ): Promise<LinkedBankAccount> {
    const account = await this.linkedBankAccountRepository.findById(accountId);

    if (!account) {
      throw new NotFoundException('Bank account not found');
    }

    if (account.walletId !== walletId) {
      throw new ForbiddenException(
        'Bank account does not belong to this wallet',
      );
    }

    return account;
  }

  /**
   * Encrypt account number.
   */
  private encryptAccountNumber(accountNumber: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
      'aes-256-cbc',
      Buffer.from(this.encryptionKey.padEnd(32, '0')),
      iv,
    );
    let encrypted = cipher.update(accountNumber, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypt account number.
   */
  private decryptAccountNumber(encryptedAccountNumber: string): string {
    const [ivHex, encrypted] = encryptedAccountNumber.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      Buffer.from(this.encryptionKey.padEnd(32, '0')),
      iv,
    );
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  /**
   * Mask account number.
   */
  private maskAccountNumber(accountNumber: string): string {
    if (accountNumber.length <= 4) {
      return accountNumber;
    }
    return `****${accountNumber.slice(-4)}`;
  }

  private toResponse(account: LinkedBankAccount): BankAccountResponse {
    return {
      id: account.id,
      wallet_id: account.walletId,
      bank_code: account.bankCode,
      bank_name: account.bankName,
      bank_logo_url: account.bankLogoUrl,
      account_number_masked: account.accountNumberMasked,
      account_holder_name: account.accountHolderName,
      status: account.status,
      is_verified: account.isVerified,
      is_primary: account.isPrimary,
      country_code: account.countryCode,
      currency: account.currency,
      available_balance: account.availableBalance,
      last_balance_check_at: account.lastBalanceCheckAt,
      last_verified_at: account.lastVerifiedAt,
      supports_balance_check: account.supportsBalanceCheck,
      supports_direct_debit: account.supportsDirectDebit,
      created_at: account.createdAt,
      updated_at: account.updatedAt,
    };
  }

  private toBankResponse(bank: Bank): BankResponse {
    return {
      code: bank.code,
      name: bank.name,
      logo_url: bank.logoUrl,
      country: bank.country,
      verification_methods: bank.verificationMethods,
      supports_balance_check: bank.supportsBalanceCheck,
      supports_direct_debit: bank.supportsDirectDebit,
    };
  }
}
