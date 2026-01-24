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
var AfricasTalkingSmsAdapter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AfricasTalkingSmsAdapter = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
let AfricasTalkingSmsAdapter = AfricasTalkingSmsAdapter_1 = class AfricasTalkingSmsAdapter {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(AfricasTalkingSmsAdapter_1.name);
        this.providerName = 'africas_talking';
        this.username = this.configService.get('AT_USERNAME') || '';
        this.apiKey = this.configService.get('AT_API_KEY') || '';
        this.senderId =
            this.configService.get('sms.senderId') || 'JoonaPay';
        const useSandbox = this.configService.get('NODE_ENV') !== 'production';
        this.baseUrl = useSandbox
            ? 'https://api.sandbox.africastalking.com/version1'
            : 'https://api.africastalking.com/version1';
        if (!this.username || !this.apiKey) {
            this.logger.warn("Africa's Talking credentials not configured. SMS sending will fail.");
        }
        else {
            this.logger.log(`Africa's Talking SMS adapter initialized (${useSandbox ? 'sandbox' : 'production'})`);
        }
    }
    async send(request) {
        if (!this.username || !this.apiKey) {
            throw new Error("Africa's Talking credentials not configured");
        }
        try {
            const formData = new URLSearchParams();
            formData.append('username', this.username);
            formData.append('to', request.to);
            formData.append('message', request.message);
            formData.append('from', this.senderId);
            const response = await fetch(`${this.baseUrl}/messaging`, {
                method: 'POST',
                headers: {
                    apiKey: this.apiKey,
                    'Content-Type': 'application/x-www-form-urlencoded',
                    Accept: 'application/json',
                },
                body: formData.toString(),
            });
            if (!response.ok) {
                throw new Error(`Africa's Talking API error: ${response.statusText}`);
            }
            const result = (await response.json());
            const recipient = result.SMSMessageData.Recipients[0];
            if (!recipient) {
                throw new Error('No recipient data in response');
            }
            this.logger.log(`SMS sent successfully to ${request.to}: ${recipient.messageId}`);
            return {
                id: recipient.messageId,
                to: recipient.number,
                status: this.mapATStatus(recipient.status),
                provider: this.providerName,
                createdAt: new Date(),
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to send SMS via Africa's Talking: ${errorMessage}`);
            throw error;
        }
    }
    async sendOtp(phone, otp) {
        return this.send({
            to: phone,
            message: `Votre code de verification JoonaPay est: ${otp}. Valide pendant 5 minutes. Ne partagez pas ce code.`,
        });
    }
    async getStatus(messageId) {
        this.logger.warn(`Status check for ${messageId} - AT uses webhooks for delivery reports`);
        return {
            id: messageId,
            to: 'unknown',
            status: 'sent',
            provider: this.providerName,
            createdAt: new Date(),
        };
    }
    mapATStatus(atStatus) {
        const statusMap = {
            Success: 'sent',
            Sent: 'sent',
            Queued: 'queued',
            Buffered: 'queued',
            Rejected: 'failed',
            Failed: 'failed',
        };
        return statusMap[atStatus] || 'queued';
    }
};
exports.AfricasTalkingSmsAdapter = AfricasTalkingSmsAdapter;
exports.AfricasTalkingSmsAdapter = AfricasTalkingSmsAdapter = AfricasTalkingSmsAdapter_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], AfricasTalkingSmsAdapter);
//# sourceMappingURL=africas-talking.adapter.js.map