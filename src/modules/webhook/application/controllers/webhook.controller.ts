import {
  Controller,
  Post,
  Body,
  Headers,
  RawBodyRequest,
  Req,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { Request } from 'express';
import { ProcessWebhookUseCase } from '../usecases';

@ApiTags('Webhooks')
@Controller('webhooks')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(private readonly processWebhookUseCase: ProcessWebhookUseCase) {}

  @Post('payment')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle payment provider webhooks' })
  @ApiHeader({
    name: 'x-webhook-signature',
    description: 'Webhook signature for verification',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Webhook processed successfully',
    schema: {
      example: {
        success: true,
        eventType: 'deposit.completed',
        processed: true,
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid webhook signature',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error processing webhook',
  })
  async handlePaymentWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Body() payload: Record<string, unknown>,
    @Headers('x-webhook-signature') signature: string,
  ) {
    this.logger.log('Received payment webhook');

    // Get raw body for signature verification
    const rawBody = req.rawBody?.toString() || JSON.stringify(payload);

    // Let errors propagate - they will return proper HTTP status codes
    // UnauthorizedException -> 401
    // Other errors -> 500
    return this.processWebhookUseCase.execute({
      payload,
      signature: signature || '',
      rawBody,
    });
  }

  @Post('payment/yellow-card')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Handle Yellow Card webhooks (on-ramp/off-ramp status)',
  })
  @ApiHeader({
    name: 'x-yc-signature',
    description: 'Yellow Card webhook signature',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Webhook processed successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid webhook signature',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error processing webhook',
  })
  async handleYellowCardWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Body() payload: Record<string, unknown>,
    @Headers('x-yc-signature') signature: string,
  ) {
    this.logger.log('Received Yellow Card webhook');

    const rawBody = req.rawBody?.toString() || JSON.stringify(payload);

    // Let errors propagate - they will return proper HTTP status codes
    // UnauthorizedException -> 401
    // Other errors -> 500 (provider will retry)
    return this.processWebhookUseCase.execute({
      payload,
      signature: signature || '',
      rawBody,
      provider: 'yellowcard',
    });
  }

  @Post('circle')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Handle Circle webhooks (transfer status, wallet events)',
  })
  @ApiHeader({
    name: 'x-circle-signature',
    description: 'Circle webhook signature',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Circle webhook processed successfully',
    schema: {
      example: {
        success: true,
        eventType: 'transfer.complete',
        processed: true,
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid webhook signature',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error processing webhook',
  })
  async handleCircleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Body() payload: Record<string, unknown>,
    @Headers('x-circle-signature') signature: string,
  ) {
    this.logger.log('Received Circle webhook');

    const rawBody = req.rawBody?.toString() || JSON.stringify(payload);

    // Let errors propagate - they will return proper HTTP status codes
    // UnauthorizedException -> 401
    // Other errors -> 500 (provider will retry)
    return this.processWebhookUseCase.execute({
      payload,
      signature: signature || '',
      rawBody,
      provider: 'circle',
    });
  }
}
