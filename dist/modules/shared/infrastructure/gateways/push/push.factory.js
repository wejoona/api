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
var PushFactory_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PushFactory = void 0;
exports.createPushGateway = createPushGateway;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const mock_push_adapter_1 = require("./mock-push.adapter");
const fcm_push_adapter_1 = require("./fcm-push.adapter");
let PushFactory = PushFactory_1 = class PushFactory {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(PushFactory_1.name);
    }
    create() {
        const useMock = this.configService.get('fcm.useMock') ?? true;
        const projectId = this.configService.get('fcm.projectId');
        const provider = useMock || !projectId ? 'mock' : 'fcm';
        this.logger.log(`Creating Push gateway with provider: ${provider}`);
        switch (provider) {
            case 'fcm':
                return new fcm_push_adapter_1.FcmPushAdapter(this.configService);
            case 'mock':
            default:
                return new mock_push_adapter_1.MockPushAdapter();
        }
    }
    getProviderType() {
        const useMock = this.configService.get('fcm.useMock') ?? true;
        const projectId = this.configService.get('fcm.projectId');
        return useMock || !projectId ? 'mock' : 'fcm';
    }
    isMockMode() {
        return this.getProviderType() === 'mock';
    }
};
exports.PushFactory = PushFactory;
exports.PushFactory = PushFactory = PushFactory_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], PushFactory);
function createPushGateway(factory) {
    return factory.create();
}
//# sourceMappingURL=push.factory.js.map