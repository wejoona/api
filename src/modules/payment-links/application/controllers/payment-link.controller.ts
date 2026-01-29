import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
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
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary!: 'Create a payment link',
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
    summary!: 'Get my payment links',
    description: 'Returns all payment links created by the current user.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of payment links',
    type: [PaymentLinkResponseDto],
  })
  async getPaymentLinks(
    @CurrentUser() user: UserPayload,
  ): Promise<PaymentLinkResponseDto[]> {
    return this.paymentLinkService.getPaymentLinks(user.id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary!: 'Get payment link by ID',
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
    summary!: 'Get payment link by code (public)',
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

  @Post(':code/pay')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
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
        success: true,
        message: 'Payment completed successfully',
        transferId: '123e4567-e89b-12d3-a456-426614174000',
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
  ): Promise<{ success: boolean; message: string; transferId: string }> {
    return this.paymentLinkService.payPaymentLink(code, user.id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Deactivate payment link',
    description:
      'Deactivate a payment link. It will no longer accept payments but history is preserved.',
  })
  @ApiParam({ name: 'id', description: 'Payment link UUID' })
  @ApiResponse({
    status: 200,
    description: 'Payment link deactivated successfully',
  })
  @ApiResponse({ status: 404, description: 'Payment link not found' })
  async deactivatePaymentLink(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: UserPayload,
  ): Promise<{ success: boolean; message: string }> {
    return this.paymentLinkService.deactivatePaymentLink(id, user.id);
  }
}
