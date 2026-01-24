"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var SmsFactory_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SmsFactory = void 0;
exports.createSmsGateway = createSmsGateway;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const mock_sms_adapter_1 = require("./mock-sms.adapter");
const twilio_sms_adapter_1 = require("./twilio-sms.adapter");
const africas_talking_adapter_1 = require("./africas-talking.adapter");
let SmsFactory = SmsFactory_1 = class SmsFactory {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(SmsFactory_1.name);
    }
    create() {
        const provider = this.configService.get('sms.provider') ||
            'mock';
        this.logger.log(`Creating SMS gateway with provider: ${provider}`);
        switch (provider) {
            case 'twilio':
                return new twilio_sms_adapter_1.TwilioSmsAdapter(this.configService);
            case 'africas_talking':
                return new africas_talking_adapter_1.AfricasTalkingSmsAdapter(this.configService);
            case 'mock':
            default:
                return new mock_sms_adapter_1.MockSmsAdapter();
        }
    }
    getProviderType() {
        return (this.configService.get('sms.provider') ||
            'mock');
    }
    isMockMode() {
        return this.getProviderType() === 'mock';
    }
};
exports.SmsFactory = SmsFactory;
exports.SmsFactory = SmsFactory = SmsFactory_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], SmsFactory);
function createSmsGateway(factory) {
    return factory.create();
}
//# sourceMappingURL=sms.factory.js.map