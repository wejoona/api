import { Controller, Get, Query, BadRequestException, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { ExchangeRateService } from '../services/exchange-rate.service';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';

@ApiTags('Exchange Rates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('rates')
export class ExchangeRateController {
  constructor(private readonly rateService: ExchangeRateService) {}

  @Get()
  @ApiOperation({ summary: 'Get all exchange rates' })
  async getRates() {
    return { rates: this.rateService.getAllRates() };
  }

  @Get('convert')
  @ApiOperation({ summary: 'Convert amount between currencies' })
  @ApiQuery({ name: 'amount', type: Number })
  @ApiQuery({ name: 'from', type: String, example: 'XOF' })
  @ApiQuery({ name: 'to', type: String, example: 'USDC' })
  async convert(
    @Query('amount') amount: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      throw new BadRequestException('Invalid amount');
    }
    if (!from || !to) {
      throw new BadRequestException('from and to currencies required');
    }

    return this.rateService.convert(numAmount, from, to);
  }

  @Get('pair')
  @ApiOperation({ summary: 'Get rate for a specific currency pair' })
  @ApiQuery({ name: 'from', type: String, example: 'USD' })
  @ApiQuery({ name: 'to', type: String, example: 'XOF' })
  async getPair(
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    const rate = this.rateService.getRate(from, to);
    if (!rate) {
      throw new BadRequestException(`No rate available for ${from}/${to}`);
    }
    return rate;
  }
}
