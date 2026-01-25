"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SharedModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const gateways_1 = require("./domain/gateways");
const payment_1 = require("./infrastructure/gateways/payment");
const sms_1 = require("./infrastructure/gateways/sms");
const push_1 = require("./infrastructure/gateways/push");
const services_1 = require("./infrastructure/services");
let SharedModule = class SharedModule {
};
exports.SharedModule = SharedModule;
exports.SharedModule = SharedModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        imports: [config_1.ConfigModule],
        providers: [
            services_1.CacheInvalidationService,
            {
                provide: gateways_1.PAYMENT_GATEWAY,
                useClass: payment_1.YellowCardPaymentAdapter,
            },
            sms_1.SmsFactory,
            {
                provide: gateways_1.SMS_GATEWAY,
                useFactory: sms_1.createSmsGateway,
                inject: [sms_1.SmsFactory],
            },
            push_1.PushFactory,
            {
                provide: gateways_1.PUSH_GATEWAY,
                useFactory: push_1.createPushGateway,
                inject: [push_1.PushFactory],
            },
        ],
        exports: [
            gateways_1.PAYMENT_GATEWAY,
            gateways_1.SMS_GATEWAY,
            gateways_1.PUSH_GATEWAY,
            sms_1.SmsFactory,
            push_1.PushFactory,
            services_1.CacheInvalidationService,
        ],
    })
], SharedModule);
//# sourceMappingURL=shared.module.js.map