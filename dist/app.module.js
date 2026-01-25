"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const throttler_1 = require("@nestjs/throttler");
const cqrs_1 = require("@nestjs/cqrs");
const event_emitter_1 = require("@nestjs/event-emitter");
const schedule_1 = require("@nestjs/schedule");
const cache_manager_1 = require("@nestjs/cache-manager");
const cache_manager_redis_yet_1 = require("cache-manager-redis-yet");
const config_2 = require("./config");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const logger_1 = require("./common/logger");
const shared_module_1 = require("./modules/shared/shared.module");
const user_module_1 = require("./modules/user/user.module");
const wallet_module_1 = require("./modules/wallet/wallet.module");
const transaction_module_1 = require("./modules/transaction/transaction.module");
const transfer_module_1 = require("./modules/transfer/transfer.module");
const notification_module_1 = require("./modules/notification/notification.module");
const webhook_module_1 = require("./modules/webhook/webhook.module");
const referral_module_1 = require("./modules/referral/referral.module");
const admin_1 = require("./modules/admin");
const reports_1 = require("./modules/reports");
const jobs_1 = require("./modules/jobs");
const health_1 = require("./modules/health");
const security_1 = require("./modules/security");
const legal_module_1 = require("./modules/legal/legal.module");
const contacts_module_1 = require("./modules/contacts/contacts.module");
const user_preferences_module_1 = require("./modules/user-preferences/user-preferences.module");
const metrics_1 = require("./modules/metrics");
const kyc_module_1 = require("./modules/kyc/kyc.module");
const upload_module_1 = require("./modules/upload/upload.module");
const liveness_module_1 = require("./modules/liveness/liveness.module");
const merchant_module_1 = require("./modules/merchant/merchant.module");
const bill_payments_module_1 = require("./modules/bill-payments/bill-payments.module");
const monitoring_module_1 = require("./modules/monitoring/monitoring.module");
const compliance_module_1 = require("./modules/compliance/compliance.module");
const circle_1 = require("./modules/providers/circle");
const yellowcard_1 = require("./modules/providers/yellowcard");
const blnk_1 = require("./modules/providers/blnk");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                load: [config_2.configuration],
                validationSchema: config_2.envValidationSchema,
                validationOptions: {
                    abortEarly: false,
                },
            }),
            cache_manager_1.CacheModule.registerAsync({
                isGlobal: true,
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: async (configService) => {
                    const store = await (0, cache_manager_redis_yet_1.redisStore)({
                        socket: {
                            host: configService.get('redis.host'),
                            port: configService.get('redis.port'),
                        },
                        password: configService.get('redis.password'),
                        database: configService.get('redis.db'),
                    });
                    return {
                        store,
                        ttl: 300,
                    };
                },
            }),
            typeorm_1.TypeOrmModule.forRootAsync({
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: (configService) => ({
                    type: 'postgres',
                    host: configService.get('database.host'),
                    port: configService.get('database.port'),
                    database: configService.get('database.name'),
                    username: configService.get('database.user'),
                    password: configService.get('database.password'),
                    autoLoadEntities: true,
                    synchronize: false,
                    logging: true,
                    logger: new logger_1.CustomTypeOrmLogger(),
                    extra: {
                        max: 20,
                        min: 5,
                        idleTimeoutMillis: 30000,
                        connectionTimeoutMillis: 2000,
                    },
                    maxQueryExecutionTime: 1000,
                }),
            }),
            throttler_1.ThrottlerModule.forRootAsync({
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: (configService) => ([
                    {
                        ttl: configService.get('rateLimit.ttl', 60) * 1000,
                        limit: configService.get('rateLimit.limit', 100),
                    },
                ]),
            }),
            cqrs_1.CqrsModule,
            event_emitter_1.EventEmitterModule.forRoot(),
            schedule_1.ScheduleModule.forRoot(),
            circle_1.CircleModule,
            yellowcard_1.YellowCardModule,
            blnk_1.BlnkModule,
            shared_module_1.SharedModule,
            user_module_1.UserModule,
            wallet_module_1.WalletModule,
            transaction_module_1.TransactionModule,
            transfer_module_1.TransferModule,
            notification_module_1.NotificationModule,
            webhook_module_1.WebhookModule,
            referral_module_1.ReferralModule,
            admin_1.AdminModule,
            reports_1.ReportsModule,
            jobs_1.JobsModule,
            health_1.HealthModule,
            metrics_1.MetricsModule,
            security_1.SecurityModule,
            legal_module_1.LegalModule,
            contacts_module_1.ContactsModule,
            user_preferences_module_1.UserPreferencesModule,
            upload_module_1.UploadModule,
            kyc_module_1.KycModule,
            liveness_module_1.LivenessModule,
            merchant_module_1.MerchantModule,
            bill_payments_module_1.BillPaymentsModule,
            monitoring_module_1.MonitoringModule,
            compliance_module_1.ComplianceModule,
        ],
        controllers: [app_controller_1.AppController],
        providers: [
            app_service_1.AppService,
            {
                provide: core_1.APP_GUARD,
                useClass: throttler_1.ThrottlerGuard,
            },
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map