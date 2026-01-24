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
var MockPushAdapter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockPushAdapter = void 0;
const common_1 = require("@nestjs/common");
const fs = require("fs");
const path = require("path");
let MockPushAdapter = MockPushAdapter_1 = class MockPushAdapter {
    constructor() {
        this.logger = new common_1.Logger(MockPushAdapter_1.name);
        this.providerName = 'mock';
        this.mockData = this.loadMockData();
        this.logger.warn('Push Gateway running in MOCK mode - notifications will be logged only');
    }
    loadMockData() {
        try {
            const mockDataPath = path.join(__dirname, '../../../../providers/mock-data/push/responses.json');
            const data = fs.readFileSync(mockDataPath, 'utf-8');
            return JSON.parse(data);
        }
        catch {
            return {
                templates: {},
                mockDeliveryStatus: 'sent',
                priorities: { high: [], normal: [] },
            };
        }
    }
    async send(request) {
        const id = `push_mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.logger.log(`
╔══════════════════════════════════════════════════════════════╗
║  🔔 MOCK PUSH NOTIFICATION                                   ║
╠══════════════════════════════════════════════════════════════╣
║  Device: ${request.deviceToken.substring(0, 20).padEnd(42)}║
║  Title: ${request.title.substring(0, 45).padEnd(45)}║
║  Body: ${request.body.substring(0, 46).padEnd(46)}║
║  Priority: ${(request.priority || 'normal').padEnd(42)}║
${request.data ? `║  Data: ${JSON.stringify(request.data).substring(0, 44).padEnd(44)}║\n` : ''}╚══════════════════════════════════════════════════════════════╝
    `);
        return {
            id,
            success: true,
            deviceToken: request.deviceToken,
            provider: this.providerName,
            createdAt: new Date(),
        };
    }
    async sendMulticast(request) {
        const responses = [];
        for (const token of request.deviceTokens) {
            const response = await this.send({
                deviceToken: token,
                title: request.title,
                body: request.body,
                data: request.data,
                imageUrl: request.imageUrl,
                sound: request.sound,
                priority: request.priority,
            });
            responses.push(response);
        }
        return {
            successCount: responses.filter((r) => r.success).length,
            failureCount: responses.filter((r) => !r.success).length,
            responses,
        };
    }
    async subscribeToTopic(deviceToken, topic) {
        this.logger.log(`[MOCK] Device ${deviceToken.substring(0, 20)}... subscribed to topic: ${topic}`);
        return true;
    }
    async unsubscribeFromTopic(deviceToken, topic) {
        this.logger.log(`[MOCK] Device ${deviceToken.substring(0, 20)}... unsubscribed from topic: ${topic}`);
        return true;
    }
    async sendToTopic(topic, title, body, data) {
        const messageId = `push_topic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.logger.log(`
╔══════════════════════════════════════════════════════════════╗
║  🔔 MOCK TOPIC NOTIFICATION                                  ║
╠══════════════════════════════════════════════════════════════╣
║  Topic: ${topic.padEnd(48)}║
║  Title: ${title.substring(0, 45).padEnd(45)}║
║  Body: ${body.substring(0, 46).padEnd(46)}║
${data ? `║  Data: ${JSON.stringify(data).substring(0, 44).padEnd(44)}║\n` : ''}╚══════════════════════════════════════════════════════════════╝
    `);
        return { messageId };
    }
    getTemplate(templateName, variables = {}) {
        const template = this.mockData.templates[templateName];
        if (!template)
            return null;
        let title = template.title;
        let body = template.body;
        for (const [key, value] of Object.entries(variables)) {
            title = title.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
            body = body.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
        }
        return { title, body, data: template.data };
    }
};
exports.MockPushAdapter = MockPushAdapter;
exports.MockPushAdapter = MockPushAdapter = MockPushAdapter_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], MockPushAdapter);
//# sourceMappingURL=mock-push.adapter.js.map