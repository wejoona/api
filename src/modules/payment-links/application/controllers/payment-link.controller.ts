import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { PinVerificationGuard } from '../../../../common/guards/pin-verification.guard';
import { IdempotencyInterceptor } from '../../../../common/interceptors';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiHeader,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { PaymentLinkService } from '../services/payment-link.service';
import {
  CreatePaymentLinkDto,
  PayPaymentLinkDto,
  PaymentLinkResponseDto,
} from '../dto';

interface UserPayload {
  id: string;
  phone: string;
}

@ApiTags('Payment Links')
@Controller('payment-links')
export class PaymentLinkController {
  constructor(private readonly paymentLinkService: PaymentLinkService) {}

  @Post()
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a payment link',
    description:
      'Generate a shareable payment link for collecting money. Perfect for invoices, donations, or receiving payments.',
  })
  @ApiResponse({
    status: 201,
    description: 'Payment link created successfully',
    type: PaymentLinkResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid payment link data',
  })
  async createPaymentLink(
    @CurrentUser() user: UserPayload,
    @Body() dto: CreatePaymentLinkDto,
  ): Promise<PaymentLinkResponseDto> {
    return this.paymentLinkService.createPaymentLink(user.id, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get my payment links',
    description:
      'Returns all payment links created by the current user. Supports filtering and pagination.',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['active', 'paid', 'expired', 'cancelled'],
    description: 'Filter by payment link status',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of results to return',
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: Number,
    description: 'Number of results to skip',
  })
  @ApiResponse({
    status: 200,
    description: 'List of payment links',
    schema: {
      properties: {
        links: { type: 'array', items: { type: 'object' } },
        total: { type: 'number' },
      },
    },
  })
  async getPaymentLinks(
    @CurrentUser() user: UserPayload,
    @Query('status') status?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ): Promise<{ links: PaymentLinkResponseDto[]; total: number }> {
    return this.paymentLinkService.getPaymentLinks(user.id, {
      status,
      limit,
      offset,
    });
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get payment link by ID',
    description: 'Returns payment link details including payment history.',
  })
  @ApiParam({ name: 'id', description: 'Payment link UUID' })
  @ApiResponse({
    status: 200,
    description: 'Payment link details',
    type: PaymentLinkResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Payment link not found' })
  async getPaymentLinkById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: UserPayload,
  ): Promise<PaymentLinkResponseDto> {
    return this.paymentLinkService.getPaymentLinkById(id, user.id);
  }

  @Get('code/:code')
  @ApiOperation({
    summary: 'Get payment link by code (public)',
    description:
      'Public endpoint to view payment link details before paying. No authentication required.',
  })
  @ApiParam({
    name: 'code',
    description: 'Short code from payment link URL',
    example: 'ABC123XY',
  })
  @ApiResponse({
    status: 200,
    description: 'Payment link details',
    type: PaymentLinkResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Payment link not found or expired',
  })
  async getPaymentLinkByCode(
    @Param('code') code: string,
  ): Promise<PaymentLinkResponseDto> {
    return this.paymentLinkService.getPaymentLinkByCode(code);
  }

  @Get(':id/refresh')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Refresh payment link status',
    description: 'Refresh payment link status and return updated details.',
  })
  @ApiParam({ name: 'id', description: 'Payment link UUID' })
  @ApiResponse({
    status: 200,
    description: 'Refreshed payment link details',
    type: PaymentLinkResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Payment link not found' })
  async refreshPaymentLink(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: UserPayload,
  ): Promise<PaymentLinkResponseDto> {
    return this.paymentLinkService.refreshPaymentLink(id, user.id);
  }

  @Patch(':id/cancel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cancel payment link',
    description:
      'Cancel a payment link. It will no longer accept payments but history is preserved.',
  })
  @ApiParam({ name: 'id', description: 'Payment link UUID' })
  @ApiResponse({
    status: 200,
    description: 'Payment link cancelled successfully',
  })
  @ApiResponse({ status: 404, description: 'Payment link not found' })
  async cancelPaymentLink(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: UserPayload,
  ): Promise<{ success: boolean; message: string }> {
    return this.paymentLinkService.cancelPaymentLink(id, user.id);
  }

  @Post('code/:code/pay')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @UseGuards(JwtAuthGuard, PinVerificationGuard)
  @UseInterceptors(IdempotencyInterceptor)
  @ApiBearerAuth()
  @ApiHeader({
    name: 'X-Pin-Token',
    description: 'PIN verification token from POST /user/pin/verify',
    required: true,
  })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Pay a payment link',
    description:
      'Process payment for a payment link. Transfers money from payer to link creator.',
  })
  @ApiParam({
    name: 'code',
    description: 'Short code from payment link URL',
    example: 'ABC123XY',
  })
  @ApiResponse({
    status: 200,
    description: 'Payment processed successfully',
    schema: {
      example: {
        transactionId: 'txn_123e4567',
        amount: 25000,
        status: 'completed',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid payment or insufficient balance',
  })
  @ApiResponse({
    status: 404,
    description: 'Payment link not found or inactive',
  })
  async payPaymentLink(
    @Param('code') code: string,
    @CurrentUser() user: UserPayload,
    @Body() dto: PayPaymentLinkDto,
  ): Promise<{
    transactionId: string;
    amount: number;
    amountDecimal: string;
    currency: string;
    status: string;
    supportReference: string;
    ledgerReference: string;
    ledgerTransactionId?: string;
  }> {
    return this.paymentLinkService.payPaymentLink(code, user.id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete payment link',
    description:
      'Delete a payment link. It will no longer accept payments but history is preserved.',
  })
  @ApiParam({ name: 'id', description: 'Payment link UUID' })
  @ApiResponse({
    status: 200,
    description: 'Payment link deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Payment link not found' })
  async deletePaymentLink(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: UserPayload,
  ): Promise<{ success: boolean; message: string }> {
    return this.paymentLinkService.deletePaymentLink(id, user.id);
  }
}
