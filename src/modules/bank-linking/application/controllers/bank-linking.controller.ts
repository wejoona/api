import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { PinVerificationGuard } from '@common/guards/pin-verification.guard';
import { IdempotencyInterceptor } from '@common/interceptors';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { BankLinkingService } from '../services/bank-linking.service';
import {
  LinkBankAccountDto,
  VerifyBankAccountDto,
  DepositFromBankDto,
  WithdrawToBankDto,
} from '../dto/link-bank-account.dto';

import { ApiTags } from '@nestjs/swagger';
@ApiTags('Bank Linking')
@Controller()
@UseGuards(JwtAuthGuard)
export class BankLinkingController {
  constructor(private readonly bankLinkingService: BankLinkingService) {}

  /**
   * GET /api/v1/banks - Get available banks
   */
  @Get('banks')
  async getBanks(@Query('country') country?: string) {
    const banks = await this.bankLinkingService.getBanks(country);
    const available = this.bankLinkingService.isBankLinkingEnabled();
    return {
      banks,
      data: banks,
      available,
      status: available ? 'available' : 'unavailable',
      reason: this.bankLinkingService.getUnavailableReason(),
      provider: this.bankLinkingService.getBankLinkingProvider(),
      country: country ?? null,
    };
  }

  /**
   * GET /api/v1/bank-accounts - Get linked bank accounts
   */
  @Get('bank-accounts')
  async getLinkedAccounts(@CurrentUser() user: any) {
    const accounts = await this.bankLinkingService.getLinkedAccounts(
      user.walletId,
    );
    const available = this.bankLinkingService.isBankLinkingEnabled();
    return {
      accounts,
      data: accounts,
      available,
      status: available ? 'available' : 'unavailable',
      reason: this.bankLinkingService.getUnavailableReason(),
      provider: this.bankLinkingService.getBankLinkingProvider(),
    };
  }

  /**
   * GET /api/v1/bank-accounts/:id - Get single bank account
   */
  @Get('bank-accounts/:id')
  async getLinkedAccount(@CurrentUser() user: any, @Param('id') id: string) {
    return this.bankLinkingService.getLinkedAccount(user.walletId, id);
  }

  /**
   * POST /api/v1/bank-accounts - Link new bank account
   */
  @Post('bank-accounts')
  @HttpCode(HttpStatus.CREATED)
  async linkAccount(@CurrentUser() user: any, @Body() dto: LinkBankAccountDto) {
    return this.bankLinkingService.linkBankAccount({
      walletId: user.walletId,
      bankCode: dto.bank_code,
      accountNumber: dto.account_number,
      accountHolderName: dto.account_holder_name,
      countryCode: dto.country_code,
    });
  }

  /**
   * POST /api/v1/bank-accounts/:id/verify - Verify bank account
   */
  @Post('bank-accounts/:id/verify')
  async verifyAccount(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: VerifyBankAccountDto,
  ) {
    return this.bankLinkingService.verifyBankAccount({
      walletId: user.walletId,
      accountId: id,
      otp: dto.otp,
    });
  }

  /**
   * POST /api/v1/bank-accounts/:id/set-primary - Set primary bank account
   */
  @Post('bank-accounts/:id/set-primary')
  async setPrimaryAccount(@CurrentUser() user: any, @Param('id') id: string) {
    await this.bankLinkingService.setPrimaryAccount(user.walletId, id);
    return {
      success: true,
      message: 'Primary account updated',
    };
  }

  /**
   * GET /api/v1/bank-accounts/:id/balance - Get account balance
   */
  @Get('bank-accounts/:id/balance')
  async getBalance(@CurrentUser() user: any, @Param('id') id: string) {
    return this.bankLinkingService.getBalance(user.walletId, id);
  }

  /**
   * POST /api/v1/bank-accounts/:id/deposit - Deposit from bank account
   */
  @Post('bank-accounts/:id/deposit')
  @UseGuards(PinVerificationGuard)
  @UseInterceptors(IdempotencyInterceptor)
  async deposit(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: DepositFromBankDto,
  ) {
    return this.bankLinkingService.deposit({
      walletId: user.walletId,
      accountId: id,
      amount: dto.amount,
      description: dto.description,
    });
  }

  /**
   * POST /api/v1/bank-accounts/:id/withdraw - Withdraw to bank account
   */
  @Post('bank-accounts/:id/withdraw')
  @UseGuards(PinVerificationGuard)
  @UseInterceptors(IdempotencyInterceptor)
  async withdraw(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: WithdrawToBankDto,
  ) {
    return this.bankLinkingService.withdraw({
      walletId: user.walletId,
      accountId: id,
      amount: dto.amount,
      description: dto.description,
    });
  }

  /**
   * DELETE /api/v1/bank-accounts/:id - Unlink bank account
   */
  @Delete('bank-accounts/:id')
  @HttpCode(HttpStatus.OK)
  async unlinkAccount(@CurrentUser() user: any, @Param('id') id: string) {
    await this.bankLinkingService.unlinkAccount(user.walletId, id);
    return {
      success: true,
      message: 'Bank account unlinked successfully',
    };
  }
}
