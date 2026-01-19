import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('port') || 3000;
  const apiPrefix = configService.get<string>('apiPrefix') || 'api/v1';

  // Enable CORS
  app.enableCors({
    origin: true,
    credentials: true,
  });

  // Global prefix
  app.setGlobalPrefix(apiPrefix);

  // Validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('USDC Wallet API')
    .setDescription(
      `
      JoonaPay USDC Wallet - Cross-Border Remittance Platform

      **Ivory Coast → USA Corridor**

      This API enables money transfers from Ivory Coast to the USA using USDC as the settlement currency.
      Users see a simple USD wallet experience while the underlying infrastructure handles stablecoin conversions automatically.

      ## Features
      - User registration with phone verification (OTP)
      - USD wallet management
      - Deposits via Mobile Money (Orange Money, Wave, MTN)
      - Internal transfers (phone-to-phone)
      - External transfers (to USDC wallet address)
      - KYC verification for higher limits
      - Real-time exchange rates

      ## Authentication
      All authenticated endpoints require a Bearer token in the Authorization header.
      Obtain a token by verifying OTP after registration/login.

      ## Payment Provider
      Currently integrated with Yellow Card for stablecoin infrastructure.
      The API is designed with provider abstraction for easy switching.
      `,
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('Authentication', 'User registration and login via phone OTP')
    .addTag('User', 'User profile management')
    .addTag('Wallet', 'Wallet balance, deposits, transfers, and KYC')
    .addTag('Transactions', 'Transaction history and status tracking')
    .addTag('Webhooks', 'Payment provider webhook endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  await app.listen(port);

  logger.log(`Application running on: http://localhost:${port}/${apiPrefix}`);
  logger.log(`Swagger documentation: http://localhost:${port}/docs`);
  logger.log(`Health check: http://localhost:${port}/${apiPrefix}/health`);
}

void bootstrap();
