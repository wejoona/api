import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RealtimeGateway } from './infrastructure/gateways/realtime.gateway';
import { ConnectedClientRepository } from './domain/repositories/connected-client.repository';
import { RedisConnectedClientRepository } from './infrastructure/adapters/redis-connected-client.repository';
import { NotificationService } from './application/services/notification.service';
import { RealtimeController } from './application/controllers/realtime.controller';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('jwt.secret', config.get<string>('JWT_SECRET')),
      }),
    }),
  ],
  controllers: [RealtimeController],
  providers: [
    RealtimeGateway,
    NotificationService,
    {
      provide: ConnectedClientRepository,
      useClass: RedisConnectedClientRepository,
    },
  ],
  exports: [RealtimeGateway, NotificationService],
})
export class RealtimeModule {}
