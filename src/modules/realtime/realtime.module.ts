import { Module } from '@nestjs/common';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RealtimeGateway } from './infrastructure/gateways/realtime.gateway';
import { RealtimeController } from './application/controllers/realtime.controller';
import { NotificationService } from './application/services/notification.service';
import { ConnectedClientRepository } from './domain/repositories/connected-client.repository';
import { RedisConnectedClientRepository } from './infrastructure/adapters/redis-connected-client.repository';

@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): JwtModuleOptions => {
        const expiresIn = configService.get<string>('jwt.expiresIn') || '15m';
        return {
          secret: configService.get<string>('jwt.secret') || 'default-secret',
          signOptions: {
            expiresIn: expiresIn as '15m',
          },
        };
      },
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
