import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';

// Controller
import { BillPaymentController } from './application/controllers/bill-payment.controller';

// Proxy client
import { BillPayClientService } from './infrastructure/services/bill-pay-client.service';

@Module({
  imports: [
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 3,
    }),
    ConfigModule,
  ],
  providers: [BillPayClientService],
  controllers: [BillPaymentController],
  exports: [BillPayClientService],
})
export class BillPaymentsModule {}
