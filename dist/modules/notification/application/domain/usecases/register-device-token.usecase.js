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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var RegisterDeviceTokenUseCase_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RegisterDeviceTokenUseCase = void 0;
const common_1 = require("@nestjs/common");
const device_token_repository_1 = require("../../../infrastructure/repositories/device-token.repository");
let RegisterDeviceTokenUseCase = RegisterDeviceTokenUseCase_1 = class RegisterDeviceTokenUseCase {
    constructor(deviceTokenRepository) {
        this.deviceTokenRepository = deviceTokenRepository;
        this.logger = new common_1.Logger(RegisterDeviceTokenUseCase_1.name);
    }
    async execute(params) {
        this.logger.log(`Registering device token for user ${params.userId} on platform ${params.platform}`);
        await this.deviceTokenRepository.upsert(params.userId, params.token, params.platform, params.deviceId, params.deviceName);
        this.logger.log(`Device token registered successfully for user ${params.userId}`);
    }
};
exports.RegisterDeviceTokenUseCase = RegisterDeviceTokenUseCase;
exports.RegisterDeviceTokenUseCase = RegisterDeviceTokenUseCase = RegisterDeviceTokenUseCase_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(device_token_repository_1.DEVICE_TOKEN_REPOSITORY)),
    __metadata("design:paramtypes", [device_token_repository_1.DeviceTokenRepository])
], RegisterDeviceTokenUseCase);
//# sourceMappingURL=register-device-token.usecase.js.map