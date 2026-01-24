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
const config_2 = require("./config");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
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
                    logging: configService.get('NODE_ENV') === 'development',
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