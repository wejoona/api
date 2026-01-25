"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const swagger_1 = require("@nestjs/swagger");
const helmet_1 = require("helmet");
const express_1 = require("express");
const app_module_1 = require("./app.module");
const interceptors_1 = require("./common/interceptors");
const metrics_service_1 = require("./modules/metrics/metrics.service");
async function bootstrap() {
    const logger = new common_1.Logger('Bootstrap');
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    const configService = app.get(config_1.ConfigService);
    const port = configService.get('port') || 3000;
    const apiPrefix = configService.get('apiPrefix') || 'api/v1';
    const nodeEnv = configService.get('nodeEnv') || 'development';
    app.use((0, helmet_1.default)({
        contentSecurityPolicy: nodeEnv === 'production',
        crossOriginEmbedderPolicy: nodeEnv === 'production',
        hsts: {
            maxAge: 31536000,
            includeSubDomains: true,
            preload: true,
        },
    }));
    app.use((0, express_1.json)({ limit: '10kb' }));
    app.use((0, express_1.urlencoded)({ extended: true, limit: '10kb' }));
    const allowedOrigins = configService
        .get('ALLOWED_ORIGINS', 'http://localhost:3001,http://localhost:8080')
        .split(',')
        .map((origin) => origin.trim());
    app.enableCors({
        origin: nodeEnv === 'production' ? allowedOrigins : true,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Idempotency-Key'],
        exposedHeaders: ['X-Idempotency-Key'],
        maxAge: 86400,
    });
    app.setGlobalPrefix(apiPrefix);
    const metricsService = app.get(metrics_service_1.MetricsService);
    app.useGlobalInterceptors(new interceptors_1.LoggingInterceptor(), new interceptors_1.MetricsInterceptor(metricsService));
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
            enableImplicitConversion: true,
        },
    }));
    if (nodeEnv !== 'production') {
        const config = new swagger_1.DocumentBuilder()
            .setTitle('USDC Wallet API')
            .setDescription(`
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
        `)
            .setVersion('1.0')
            .addBearerAuth()
            .addTag('Authentication', 'User registration and login via phone OTP')
            .addTag('User', 'User profile management')
            .addTag('Wallet', 'Wallet balance, deposits, transfers, and KYC')
            .addTag('Transactions', 'Transaction history and status tracking')
            .addTag('Webhooks', 'Payment provider webhook endpoints')
            .build();
        const document = swagger_1.SwaggerModule.createDocument(app, config);
        swagger_1.SwaggerModule.setup('docs', app, document);
        logger.log(`Swagger documentation: http://localhost:${port}/docs`);
    }
    else {
        logger.log('Swagger documentation disabled in production');
    }
    await app.listen(port);
    logger.log(`Application running on: http://localhost:${port}/${apiPrefix}`);
    logger.log(`Health check: http://localhost:${port}/${apiPrefix}/health`);
}
void bootstrap();
//# sourceMappingURL=main.js.map