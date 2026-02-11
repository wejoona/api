import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard, AuthenticatedRequest } from '../../../../common/guards';
import { BulkPaymentService } from '../services/bulk-payment.service';
import { CreateBulkPaymentDto } from '../dto/create-bulk-payment.dto';
import {
  BulkPaymentResponseDto,
  BulkPaymentListResponseDto,
  FailedReportResponseDto,
} from '../dto/bulk-payment-response.dto';

import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
@ApiTags('Bulk Payments')
@Controller('bulk-payments')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BulkPaymentController {
  constructor(private readonly bulkPaymentService: BulkPaymentService) {}

  @Get('batches')
  async getBatches(
    @Request() req: AuthenticatedRequest,
  ): Promise<BulkPaymentListResponseDto> {
    return this.bulkPaymentService.getBatches(req.user.walletId);
  }

  @Post('batches')
  async createBatch(
    @Body() dto: CreateBulkPaymentDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<BulkPaymentResponseDto> {
    return this.bulkPaymentService.createBatch(req.user.walletId, dto);
  }

  @Get('batches/:id')
  async getBatch(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<BulkPaymentResponseDto> {
    return this.bulkPaymentService.getBatch(id, req.user.walletId);
  }

  @Get('batches/:id/failed-report')
  async getFailedReport(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<FailedReportResponseDto> {
    return this.bulkPaymentService.getFailedReport(id, req.user.walletId);
  }
}
