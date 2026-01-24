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
var MockSmsAdapter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockSmsAdapter = void 0;
const common_1 = require("@nestjs/common");
const fs = require("fs");
const path = require("path");
let MockSmsAdapter = MockSmsAdapter_1 = class MockSmsAdapter {
    constructor() {
        this.logger = new common_1.Logger(MockSmsAdapter_1.name);
        this.providerName = 'mock';
        this.mockData = this.loadMockData();
        this.logger.warn('SMS Gateway running in MOCK mode - messages will be logged only');
    }
    loadMockData() {
        try {
            const mockDataPath = path.join(__dirname, '../../../../providers/mock-data/sms/responses.json');
            const data = fs.readFileSync(mockDataPath, 'utf-8');
            return JSON.parse(data);
        }
        catch {
            return {
                templates: {
                    otp: 'Your JoonaPay verification code is: {otp}. Valid for 5 minutes.',
                },
                mockDeliveryStatus: 'sent',
                mockDeliveryStatuses: ['queued', 'sent', 'delivered', 'failed'],
                mockDeliveryDelay: 0,
            };
        }
    }
    send(request) {
        const id = `sms_mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.logger.log(`
╔══════════════════════════════════════════════════════════════╗
║  📱 MOCK SMS                                                  ║
╠══════════════════════════════════════════════════════════════╣
║  To: ${request.to.padEnd(54)}║
║  Message: ${request.message.substring(0, 48).padEnd(48)}║
${request.message.length > 48 ? `║           ${request.message.substring(48, 96).padEnd(48)}║\n` : ''}╚══════════════════════════════════════════════════════════════╝
    `);
        return Promise.resolve({
            id,
            to: request.to,
            status: this.mockData.mockDeliveryStatus,
            provider: this.providerName,
            createdAt: new Date(),
        });
    }
    async sendOtp(phone, otp) {
        const template = this.mockData.templates.otp || this.mockData.templates.otp_fr;
        const message = template
            ? template.replace('{otp}', otp)
            : `Your verification code is: ${otp}. Valid for 5 minutes.`;
        return this.send({
            to: phone,
            message,
        });
    }
    getStatus(messageId) {
        return Promise.resolve({
            id: messageId,
            to: 'unknown',
            status: 'delivered',
            provider: this.providerName,
            createdAt: new Date(),
        });
    }
    getTemplate(templateName, variables = {}) {
        let template = this.mockData.templates[templateName] || '';
        for (const [key, value] of Object.entries(variables)) {
            template = template.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
        }
        return template;
    }
};
exports.MockSmsAdapter = MockSmsAdapter;
exports.MockSmsAdapter = MockSmsAdapter = MockSmsAdapter_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], MockSmsAdapter);
//# sourceMappingURL=mock-sms.adapter.js.map