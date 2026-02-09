import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { VerifyHqService } from './verify-hq.service';

/**
 * VerifyHQ Module
 *
 * Provides the VerifyHQ SDK client as a NestJS service.
 * Import this module wherever VerifyHQ integration is needed.
 */
@Module({
  imports: [ConfigModule],
  providers: [VerifyHqService],
  exports: [VerifyHqService],
})
export class VerifyHqModule {}
