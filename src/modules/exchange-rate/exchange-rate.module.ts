import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ExchangeRateService } from './application/services/exchange-rate.service';
import { ExchangeRateController } from './application/controllers/exchange-rate.controller';

@Module({
  imports: [HttpModule],
  controllers: [ExchangeRateController],
  providers: [ExchangeRateService],
  exports: [ExchangeRateService],
})
export class ExchangeRateModule {}
