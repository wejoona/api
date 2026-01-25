import {
  Controller,
  Get,
  Query,
  UseGuards,
  Request,
  Header,
  BadRequestException,
  StreamableFile,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard, AuthenticatedRequest } from '../../../../common/guards';
import { ExportTransactionsUseCase } from '../usecases/export-transactions.use-case';

@ApiTags('Wallet Export')
@Controller('wallet/export')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ExportController {
  constructor(
    private readonly exportTransactionsUseCase: ExportTransactionsUseCase,
  ) {}

  @Get('transactions')
  @ApiOperation({ summary: 'Export transaction history' })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'Start date for export (ISO 8601 format)',
    example: '2026-01-01',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'End date for export (ISO 8601 format)',
    example: '2026-01-31',
  })
  @ApiQuery({
    name: 'format',
    required: false,
    enum: ['csv', 'json'],
    description: 'Export format',
    example: 'csv',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns transaction export in requested format',
    content: {
      'text/csv': {
        schema: {
          type: 'string',
          example: 'Date,Type,Description,Amount,Currency,Status,Reference,Completed At\n2026-01-18T12:00:00.000Z,deposit,Deposit (On-ramp),16.45,USD,completed,yc_dep_1234567890,2026-01-18T12:05:00.000Z',
        },
      },
      'application/json': {
        schema: {
          example: {
            walletId: '123e4567-e89b-12d3-a456-426614174000',
            exportDate: '2026-01-18T12:00:00.000Z',
            startDate: null,
            endDate: null,
            totalTransactions: 1,
            transactions: [
              {
                id: '123e4567-e89b-12d3-a456-426614174000',
                date: '2026-01-18T12:00:00.000Z',
                type: 'deposit',
                amount: 16.45,
                currency: 'USD',
                status: 'completed',
                reference: 'yc_dep_1234567890',
                description: 'Deposit (On-ramp)',
                completedAt: '2026-01-18T12:05:00.000Z',
              },
            ],
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid date format or parameters',
  })
  @ApiResponse({
    status: 404,
    description: 'Wallet not found',
  })
  async exportTransactions(
    @Request() req: AuthenticatedRequest,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('format') format: 'csv' | 'json' = 'csv',
  ) {
    // Validate and parse dates
    let parsedStartDate: Date | undefined;
    let parsedEndDate: Date | undefined;

    if (startDate) {
      parsedStartDate = this.parseDate(startDate);
      if (!parsedStartDate) {
        throw new BadRequestException('Invalid startDate format. Use ISO 8601 format (e.g., 2026-01-01)');
      }
    }

    if (endDate) {
      parsedEndDate = this.parseDate(endDate);
      if (!parsedEndDate) {
        throw new BadRequestException('Invalid endDate format. Use ISO 8601 format (e.g., 2026-01-31)');
      }
    }

    // Validate date range
    if (parsedStartDate && parsedEndDate && parsedStartDate > parsedEndDate) {
      throw new BadRequestException('startDate must be before endDate');
    }

    // Execute export
    const result = await this.exportTransactionsUseCase.execute({
      userId: req.user.id,
      startDate: parsedStartDate,
      endDate: parsedEndDate,
      format,
    });

    // Set response headers based on format
    if (format === 'csv') {
      // Return CSV as downloadable file
      const buffer = Buffer.from(result.data as string, 'utf-8');
      return new StreamableFile(buffer, {
        type: result.contentType,
        disposition: `attachment; filename="${result.filename}"`,
      });
    } else {
      // Return JSON directly
      return result.data;
    }
  }

  /**
   * Parse date string in various formats (ISO 8601, YYYY-MM-DD, etc.)
   */
  private parseDate(dateStr: string): Date | null {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        return null;
      }
      return date;
    } catch {
      return null;
    }
  }
}
