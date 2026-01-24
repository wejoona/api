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
var TwilioSmsAdapter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TwilioSmsAdapter = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
let TwilioSmsAdapter = TwilioSmsAdapter_1 = class TwilioSmsAdapter {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(TwilioSmsAdapter_1.name);
        this.providerName = 'twilio';
        this.accountSid =
            this.configService.get('TWILIO_ACCOUNT_SID') || '';
        this.authToken = this.configService.get('TWILIO_AUTH_TOKEN') || '';
        this.fromNumber =
            this.configService.get('TWILIO_PHONE_NUMBER') ||
                this.configService.get('sms.senderId') ||
                'JoonaPay';
        this.baseUrl = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}`;
        if (!this.accountSid || !this.authToken) {
            this.logger.warn('Twilio credentials not configured. SMS sending will fail.');
        }
        else {
            this.logger.log('Twilio SMS adapter initialized');
        }
    }
    async send(request) {
        if (!this.accountSid || !this.authToken) {
            throw new Error('Twilio credentials not configured');
        }
        try {
            const formData = new URLSearchParams();
            formData.append('To', request.to);
            formData.append('From', this.fromNumber);
            formData.append('Body', request.message);
            const response = await fetch(`${this.baseUrl}/Messages.json`, {
                method: 'POST',
                headers: {
                    Authorization: 'Basic ' +
                        Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64'),
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: formData.toString(),
            });
            if (!response.ok) {
                const errorData = (await response.json());
                throw new Error(`Twilio API error: ${errorData.message || response.statusText}`);
            }
            const result = (await response.json());
            this.logger.log(`SMS sent successfully to ${request.to}: ${result.sid}`);
            return {
                id: result.sid,
                to: result.to,
                status: this.mapTwilioStatus(result.status),
                provider: this.providerName,
                createdAt: new Date(result.date_created),
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to send SMS via Twilio: ${errorMessage}`);
            throw error;
        }
    }
    async sendOtp(phone, otp) {
        return this.send({
            to: phone,
            message: `Your JoonaPay verification code is: ${otp}. Valid for 5 minutes. Do not share this code.`,
        });
    }
    async getStatus(messageId) {
        if (!this.accountSid || !this.authToken) {
            throw new Error('Twilio credentials not configured');
        }
        try {
            const response = await fetch(`${this.baseUrl}/Messages/${messageId}.json`, {
                headers: {
                    Authorization: 'Basic ' +
                        Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64'),
                },
            });
            if (!response.ok) {
                throw new Error(`Failed to get message status: ${response.statusText}`);
            }
            const result = (await response.json());
            return {
                id: result.sid,
                to: result.to,
                status: this.mapTwilioStatus(result.status),
                provider: this.providerName,
                createdAt: new Date(result.date_created),
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to get SMS status from Twilio: ${errorMessage}`);
            throw error;
        }
    }
    mapTwilioStatus(twilioStatus) {
        const statusMap = {
            queued: 'queued',
            sending: 'queued',
            sent: 'sent',
            delivered: 'delivered',
            undelivered: 'failed',
            failed: 'failed',
        };
        return statusMap[twilioStatus] || 'queued';
    }
};
exports.TwilioSmsAdapter = TwilioSmsAdapter;
exports.TwilioSmsAdapter = TwilioSmsAdapter = TwilioSmsAdapter_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], TwilioSmsAdapter);
//# sourceMappingURL=twilio-sms.adapter.js.map