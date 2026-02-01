/**
 * EXAMPLE: How to use Correlation ID in Controllers
 *
 * This file demonstrates best practices for using correlation IDs
 * in NestJS controllers.
 */

import { Controller, Get, Post, Body, UseGuards, Logger } from '@nestjs/common';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { CorrelationId } from '../correlation.decorator';

@Controller('wallet')
@UseGuards(JwtAuthGuard)
export class WalletControllerExample {
  private readonly logger = new Logger(WalletControllerExample.name);

  constructor(
    private readonly getBalanceUseCase: any,
    private readonly createTransferUseCase: any,
  ) {}

  /**
   * Example 1: Using @CorrelationId() decorator in controller
   */
  @Get('balance')
  async getBalance(
    @CurrentUser() user: any,
    @CorrelationId() correlationId: string,
  ) {
    // Log with correlation ID
    this.logger.log(`[${correlationId}] Getting balance for user ${user.id}`);

    try {
      const balance = await this.getBalanceUseCase.execute(user.id);

      this.logger.log(
        `[${correlationId}] Successfully retrieved balance for user ${user.id}`,
      );

      return { balance };
    } catch (error) {
      this.logger.error(
        `[${correlationId}] Failed to get balance for user ${user.id}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Example 2: Passing correlation ID to use cases
   */
  @Post('transfer')
  async createTransfer(
    @CurrentUser() user: any,
    @Body() dto: any,
    @CorrelationId() correlationId: string,
  ) {
    this.logger.log(
      `[${correlationId}] Creating transfer from ${user.id} to ${dto.recipientId}`,
    );

    try {
      // Pass correlation ID to use case for downstream tracking
      const transfer = await this.createTransferUseCase.execute(
        dto,
        user.id,
        correlationId,
      );

      this.logger.log(
        `[${correlationId}] Transfer created successfully: ${transfer.id}`,
      );

      return { transfer };
    } catch (error) {
      this.logger.error(
        `[${correlationId}] Transfer failed: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
