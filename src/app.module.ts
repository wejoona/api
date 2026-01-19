import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { CqrsModule } from '@nestjs/cqrs';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';

import { configuration } from './config';
import { AppController } from './app.controller';
import { AppService } from './app.service';

// Core Modules
import { SharedModule } from './modules/shared/shared.module';
import { UserModule } from './modules/user/user.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { TransactionModule } from './modules/transaction/transaction.module';
import { TransferModule } from './modules/transfer/transfer.module';
import { NotificationModule } from './modules/notification/notification.module';
import { WebhookModule } from './modules/webhook/webhook.module';

// Provider Modules
import { CircleModule } from './modules/providers/circle';
import { YellowCardModule } from './modules/providers/yellowcard';
import { BlnkModule } from './modules/providers/blnk';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),

    // Database
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('database.host'),
        port: configService.get<number>('database.port'),
        database: configService.get<string>('database.name'),
        username: configService.get<string>('database.user'),
        password: configService.get<string>('database.password'),
        autoLoadEntities: true,
        synchronize: configService.get<string>('NODE_ENV') === 'development',
        logging: configService.get<string>('NODE_ENV') === 'development',
      }),
    }),

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),

    // CQRS
    CqrsModule,

    // Event Emitter (for notifications)
    EventEmitterModule.forRoot(),

    // Scheduled tasks (reconciliation, cleanup jobs)
    ScheduleModule.forRoot(),

    // Provider modules (external integrations)
    CircleModule, // Identity, Wallets, Transfers
    YellowCardModule, // On-ramp/Off-ramp for Africa
    BlnkModule, // Ledger/Accounting (source of truth)

    // Core feature modules
    SharedModule,
    UserModule,
    WalletModule,
    TransactionModule,
    TransferModule,
    NotificationModule,
    WebhookModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
