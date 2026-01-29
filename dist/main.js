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
const shutdown_1 = require("./common/shutdown");
async function bootstrap() {
    const logger = new common_1.Logger('Bootstrap');
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    const configService = app.get(config_1.ConfigService);
    const shutdownService = app.get(shutdown_1.ShutdownService);
    const port = configService.get('port') || 3000;
    const apiPrefix = configService.get('apiPrefix') || 'api';
    const nodeEnv = configService.get('nodeEnv') || 'development';
    app.enableShutdownHooks();
    app.use((req, res, next) => {
        const middleware = new shutdown_1.ShutdownMiddleware(shutdownService);
        middleware.use(req, res, next);
    });
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
        allowedHeaders: [
            'Content-Type',
            'Authorization',
            'X-Requested-With',
            'X-Idempotency-Key',
        ],
        exposedHeaders: ['X-Idempotency-Key'],
        maxAge: 86400,
    });
    app.setGlobalPrefix(apiPrefix);
    app.enableVersioning({
        type: common_1.VersioningType.URI,
        defaultVersion: '1',
    });
    const metricsService = app.get(metrics_service_1.MetricsService);
    app.useGlobalInterceptors(new interceptors_1.LoggingInterceptor(), new interceptors_1.MetricsInterceptor(metricsService), new interceptors_1.VersionHeaderInterceptor());
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
            .setTitle('JoonaPay USDC Wallet API')
            .setDescription(`
        # JoonaPay USDC Wallet API

        **Cross-Border Remittance Platform** | West Africa → USA Corridor

        This API powers a mobile-first USDC wallet enabling seamless money transfers from West Africa (Côte d'Ivoire, Senegal, Mali) to the USA.
        Users experience a simple USD wallet while the underlying infrastructure handles USDC conversions automatically.

        ## 🌍 Regional Context
        - **Currencies:** XOF (CFA Franc) → USD (via USDC)
        - **Mobile Money:** Orange Money, MTN MoMo, Wave
        - **Languages:** French (primary), English
        - **Phone Format:** +225 XX XX XX XX (Côte d'Ivoire)

        ## 🔑 Authentication Flow
        1. **Register:** POST \`/auth/register\` with phone number → Receives OTP
        2. **Verify OTP:** POST \`/auth/verify-otp\` → Returns \`accessToken\` and \`refreshToken\`
        3. **Authenticated Requests:** Include \`Authorization: Bearer {accessToken}\` header
        4. **Refresh Token:** POST \`/auth/refresh\` when access token expires

        ## 💰 Transaction Security
        - **PIN Protection:** High-value transfers require PIN verification
        - **PIN Verification:** POST \`/wallet/pin/verify\` → Returns \`pinToken\`
        - **Protected Operations:** Include \`X-Pin-Token\` header
        - **Idempotency:** Use \`X-Idempotency-Key\` header to prevent duplicate transactions

        ## 📋 KYC Tiers
        | Tier | Daily Limit | Requirements |
        |------|-------------|--------------|
        | **Unverified** | $100 | Phone verification only |
        | **Basic KYC** | $1,000 | ID document + selfie |
        | **Full KYC** | $10,000 | ID + proof of address |

        ## 🔄 Versioning
        API uses URI-based versioning (e.g., \`/api/v1/wallet\`). Current version: **v1**

        ## ⚡ Rate Limits
        - **Authentication:** 5 requests/minute
        - **Transfers:** 10 requests/minute
        - **General:** 100 requests/minute

        ## 📚 Related Resources
        - **Mobile SDK:** Flutter package for mobile integration
        - **Dashboard:** Web portal for admin operations
        - **Support:** https://joonapay.com/support
        `)
            .setVersion('1.0')
            .setContact('JoonaPay Support', 'https://joonapay.com', 'support@joonapay.com')
            .setLicense('Proprietary', 'https://joonapay.com/terms')
            .addServer('http://localhost:3000/api', 'Local Development')
            .addServer('https://api-dev.joonapay.com/api', 'Development')
            .addServer('https://api.joonapay.com/api', 'Production')
            .addBearerAuth({
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'Enter your JWT access token',
        }, 'JWT')
            .addApiKey({
            type: 'apiKey',
            name: 'X-Pin-Token',
            in: 'header',
            description: 'PIN verification token for sensitive operations (obtain from POST /wallet/pin/verify)',
        }, 'PIN')
            .addApiKey({
            type: 'apiKey',
            name: 'X-Idempotency-Key',
            in: 'header',
            description: 'UUID to prevent duplicate transactions (recommended for all mutation operations)',
        }, 'Idempotency')
            .addTag('Authentication', 'User registration, login, and OTP verification')
            .addTag('User', 'User profile management and settings')
            .addTag('Sessions', 'Active session management and device tracking')
            .addTag('devices', 'Device registration and trusted device management')
            .addTag('Wallet', 'Wallet creation, balance, deposits, and withdrawals')
            .addTag('Transfers', 'Internal (P2P) and external (blockchain) transfers')
            .addTag('Transactions', 'Transaction history and status tracking')
            .addTag('Beneficiaries', 'Saved beneficiary management')
            .addTag('Bill Payments', 'Utility bills and service payments')
            .addTag('Merchants', 'Merchant QR payments and business accounts')
            .addTag('Payment Links', 'Payment request links for invoicing')
            .addTag('KYC', 'KYC/identity verification and document upload')
            .addTag('Compliance', 'AML checks and risk assessment')
            .addTag('Security', 'Device security and fraud prevention')
            .addTag('Feature Flags', 'Feature flag configuration and rollout')
            .addTag('Notifications', 'Push notifications and preferences')
            .addTag('Health', 'API health checks and system status')
            .addTag('Webhooks', 'Payment provider webhook endpoints')
            .addTag('Admin', 'Administrative operations and user management')
            .build();
        const document = swagger_1.SwaggerModule.createDocument(app, config, {
            operationIdFactory: (controllerKey, methodKey) => methodKey,
        });
        swagger_1.SwaggerModule.setup('docs', app, document, {
            swaggerOptions: {
                persistAuthorization: true,
                tagsSorter: 'alpha',
                operationsSorter: 'alpha',
                docExpansion: 'none',
                filter: true,
                tryItOutEnabled: true,
            },
            customSiteTitle: 'JoonaPay API Documentation',
            customfavIcon: 'https://joonapay.com/favicon.ico',
            customCss: `
        .swagger-ui .topbar { display: none }
        .swagger-ui .info .title { color: #1a73e8 }
      `,
        });
        logger.log(`Swagger documentation: http://localhost:${port}/docs`);
    }
    else {
        logger.log('Swagger documentation disabled in production');
    }
    await app.listen(port);
    logger.log(`Application running on: http://localhost:${port}/${apiPrefix}`);
    logger.log(`Health check: http://localhost:${port}/${apiPrefix}/health`);
    setupGracefulShutdown(app, shutdownService, logger);
}
function setupGracefulShutdown(app, shutdownService, logger) {
    process.on('SIGTERM', async () => {
        logger.log('SIGTERM signal received: closing HTTP server');
        await shutdownService.shutdown('SIGTERM');
    });
    process.on('SIGINT', async () => {
        logger.log('SIGINT signal received: closing HTTP server');
        await shutdownService.shutdown('SIGINT');
    });
    process.on('uncaughtException', (error) => {
        logger.error('Uncaught Exception:', error);
        shutdownService.shutdown('UNCAUGHT_EXCEPTION').then(() => {
            process.exit(1);
        });
    });
    process.on('unhandledRejection', (reason, promise) => {
        logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
        shutdownService.shutdown('UNHANDLED_REJECTION').then(() => {
            process.exit(1);
        });
    });
    logger.log('Graceful shutdown handlers registered');
}
void bootstrap();
//# sourceMappingURL=main.js.map