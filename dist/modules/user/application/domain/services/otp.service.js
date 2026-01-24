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
var OtpService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OtpService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const ioredis_1 = require("ioredis");
const crypto = require("crypto");
const sms_gateway_1 = require("../../../../shared/domain/gateways/sms.gateway");
let OtpService = OtpService_1 = class OtpService {
    constructor(configService, smsGateway) {
        this.configService = configService;
        this.smsGateway = smsGateway;
        this.logger = new common_1.Logger(OtpService_1.name);
        this.rateLimitWindow = 3600;
        this.maxOtpRequestsPerHour = 5;
        this.isRedisConnected = false;
        this.redis = new ioredis_1.default({
            host: this.configService.get('redis.host'),
            port: this.configService.get('redis.port'),
            password: this.configService.get('redis.password'),
            retryStrategy: (times) => {
                const delay = Math.min(times * 50, 2000);
                this.logger.warn(`Redis connection retry attempt ${times}, waiting ${delay}ms`);
                return delay;
            },
            maxRetriesPerRequest: 3,
        });
        this.redis.on('connect', () => {
            this.isRedisConnected = true;
            this.logger.log('Redis connected successfully');
        });
        this.redis.on('error', (error) => {
            this.isRedisConnected = false;
            this.logger.error(`Redis connection error: ${error.message}`);
        });
        this.redis.on('close', () => {
            this.isRedisConnected = false;
            this.logger.warn('Redis connection closed');
        });
        this.otpExpiry = this.configService.get('otp.expiresIn') || 300;
        this.otpLength = this.configService.get('otp.length') || 6;
        this.maxAttempts = this.configService.get('otp.maxAttempts') || 3;
        this.logger.log(`OtpService initialized with SMS provider: ${this.smsGateway.providerName}`);
    }
    async onModuleDestroy() {
        if (this.redis) {
            await this.redis.quit();
            this.logger.log('Redis connection closed gracefully');
        }
    }
    ensureConnection() {
        if (!this.isRedisConnected) {
            throw new Error('Redis connection unavailable. Please try again later.');
        }
    }
    async sendOtp(phone) {
        this.ensureConnection();
        const rateLimitKey = `otp_rate:${phone}`;
        const requestCount = await this.redis.get(rateLimitKey);
        if (requestCount && parseInt(requestCount, 10) >= this.maxOtpRequestsPerHour) {
            throw new common_1.BadRequestException('Too many OTP requests. Please try again later.');
        }
        const otp = this.generateOtp();
        const key = this.getKey(phone);
        await this.redis.setex(key, this.otpExpiry, otp);
        await this.redis.setex(`${key}:attempts`, this.otpExpiry, '0');
        const pipeline = this.redis.pipeline();
        pipeline.incr(rateLimitKey);
        pipeline.expire(rateLimitKey, this.rateLimitWindow);
        await pipeline.exec();
        if (this.configService.get('nodeEnv') !== 'production') {
            this.logger.debug(`OTP for ${phone}: ${otp}`);
        }
        try {
            const result = await this.smsGateway.sendOtp(phone, otp);
            this.logger.log(`OTP sent to ${phone} via ${this.smsGateway.providerName}: ${result.id}`);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to send OTP to ${phone}: ${errorMessage}`);
        }
    }
    async verifyOtp(phone, otp) {
        this.ensureConnection();
        const key = this.getKey(phone);
        const attemptsKey = `${key}:attempts`;
        const attempts = await this.redis.get(attemptsKey);
        if (attempts && parseInt(attempts, 10) >= this.maxAttempts) {
            throw new common_1.BadRequestException('Too many failed attempts. Please request a new OTP.');
        }
        const storedOtp = await this.redis.get(key);
        if (!storedOtp) {
            return false;
        }
        const isValid = crypto.timingSafeEqual(Buffer.from(storedOtp), Buffer.from(otp.padEnd(storedOtp.length))) && storedOtp.length === otp.length;
        if (!isValid) {
            await this.redis.incr(attemptsKey);
            return false;
        }
        await this.redis.del(key);
        await this.redis.del(attemptsKey);
        return true;
    }
    async resendOtp(phone) {
        this.ensureConnection();
        const key = this.getKey(phone);
        await this.redis.del(key);
        await this.sendOtp(phone);
    }
    generateOtp() {
        const bytes = crypto.randomBytes(this.otpLength);
        let otp = '';
        for (let i = 0; i < this.otpLength; i++) {
            otp += (bytes[i] % 10).toString();
        }
        return otp;
    }
    getKey(phone) {
        return `otp:${phone}`;
    }
};
exports.OtpService = OtpService;
exports.OtpService = OtpService = OtpService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)(sms_gateway_1.SMS_GATEWAY)),
    __metadata("design:paramtypes", [config_1.ConfigService, Object])
], OtpService);
//# sourceMappingURL=otp.service.js.map