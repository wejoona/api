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
var WebhookController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhookController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const usecases_1 = require("../usecases");
let WebhookController = WebhookController_1 = class WebhookController {
    constructor(processWebhookUseCase) {
        this.processWebhookUseCase = processWebhookUseCase;
        this.logger = new common_1.Logger(WebhookController_1.name);
    }
    async handlePaymentWebhook(req, payload, signature) {
        this.logger.log('Received payment webhook');
        const rawBody = req.rawBody?.toString() || JSON.stringify(payload);
        return this.processWebhookUseCase.execute({
            payload,
            signature: signature || '',
            rawBody,
        });
    }
    async handleYellowCardWebhook(req, payload, signature) {
        this.logger.log('Received Yellow Card webhook');
        const rawBody = req.rawBody?.toString() || JSON.stringify(payload);
        return this.processWebhookUseCase.execute({
            payload,
            signature: signature || '',
            rawBody,
            provider: 'yellowcard',
        });
    }
    async handleCircleWebhook(req, payload, signature) {
        this.logger.log('Received Circle webhook');
        const rawBody = req.rawBody?.toString() || JSON.stringify(payload);
        return this.processWebhookUseCase.execute({
            payload,
            signature: signature || '',
            rawBody,
            provider: 'circle',
        });
    }
};
exports.WebhookController = WebhookController;
__decorate([
    (0, common_1.Post)('payment'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Handle payment provider webhooks' }),
    (0, swagger_1.ApiHeader)({
        name: 'x-webhook-signature',
        description: 'Webhook signature for verification',
        required: true,
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Webhook processed successfully',
        schema: {
            example: {
                success: true,
                eventType: 'deposit.completed',
                processed: true,
            },
        },
    }),
    (0, swagger_1.ApiResponse)({
        status: 401,
        description: 'Invalid webhook signature',
    }),
    (0, swagger_1.ApiResponse)({
        status: 500,
        description: 'Internal server error processing webhook',
    }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Headers)('x-webhook-signature')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String]),
    __metadata("design:returntype", Promise)
], WebhookController.prototype, "handlePaymentWebhook", null);
__decorate([
    (0, common_1.Post)('payment/yellow-card'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Handle Yellow Card webhooks (on-ramp/off-ramp status)',
    }),
    (0, swagger_1.ApiHeader)({
        name: 'x-yc-signature',
        description: 'Yellow Card webhook signature',
        required: true,
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Webhook processed successfully',
    }),
    (0, swagger_1.ApiResponse)({
        status: 401,
        description: 'Invalid webhook signature',
    }),
    (0, swagger_1.ApiResponse)({
        status: 500,
        description: 'Internal server error processing webhook',
    }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Headers)('x-yc-signature')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String]),
    __metadata("design:returntype", Promise)
], WebhookController.prototype, "handleYellowCardWebhook", null);
__decorate([
    (0, common_1.Post)('circle'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Handle Circle webhooks (transfer status, wallet events)',
    }),
    (0, swagger_1.ApiHeader)({
        name: 'x-circle-signature',
        description: 'Circle webhook signature',
        required: true,
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Circle webhook processed successfully',
        schema: {
            example: {
                success: true,
                eventType: 'transfer.complete',
                processed: true,
            },
        },
    }),
    (0, swagger_1.ApiResponse)({
        status: 401,
        description: 'Invalid webhook signature',
    }),
    (0, swagger_1.ApiResponse)({
        status: 500,
        description: 'Internal server error processing webhook',
    }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Headers)('x-circle-signature')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String]),
    __metadata("design:returntype", Promise)
], WebhookController.prototype, "handleCircleWebhook", null);
exports.WebhookController = WebhookController = WebhookController_1 = __decorate([
    (0, swagger_1.ApiTags)('Webhooks'),
    (0, common_1.Controller)('webhooks'),
    __metadata("design:paramtypes", [usecases_1.ProcessWebhookUseCase])
], WebhookController);
//# sourceMappingURL=webhook.controller.js.map