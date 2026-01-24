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
var WebhookLedgerListener_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhookLedgerListener = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const blnk_ledger_adapter_1 = require("../adapters/blnk-ledger.adapter");
let WebhookLedgerListener = WebhookLedgerListener_1 = class WebhookLedgerListener {
    constructor(blnkLedgerAdapter) {
        this.blnkLedgerAdapter = blnkLedgerAdapter;
        this.logger = new common_1.Logger(WebhookLedgerListener_1.name);
    }
    async handleDepositCompleted(payload) {
        try {
            this.logger.log(`Recording deposit for user ${payload.userId}: ${payload.amount} ${payload.currency} via ${payload.provider}`);
            const amount = BigInt(payload.amount);
            const fee = payload.fee ? BigInt(payload.fee) : BigInt(0);
            const reference = `deposit-${payload.externalId}`;
            const depositParams = {
                userId: payload.userId,
                amount,
                currency: payload.currency,
                reference,
                description: `Deposit via ${payload.provider}`,
                provider: payload.provider,
                externalId: payload.externalId,
                fee,
                metadata: {
                    wallet_id: payload.walletId,
                    event_type: 'webhook.deposit.completed',
                },
            };
            const result = await this.blnkLedgerAdapter.recordDeposit(depositParams);
            this.logger.log(`Deposit recorded successfully: Transaction ${result.transactionId} (${result.status})`);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to record deposit for user ${payload.userId}: ${errorMessage}`, error instanceof Error ? error.stack : undefined);
            throw error;
        }
    }
    async handleTransferCompleted(payload) {
        try {
            this.logger.log(`Committing external transfer ${payload.transferId} via ${payload.provider}`);
            const reference = `transfer-${payload.transferId}`;
            const transaction = await this.blnkLedgerAdapter.getTransactionByReference(reference);
            if (transaction) {
                await this.blnkLedgerAdapter.commitTransaction(transaction.transactionId);
                this.logger.log(`Successfully committed transfer ${payload.transferId} (txn: ${transaction.transactionId})`);
            }
            else {
                this.logger.warn(`No inflight transaction found for transfer ${payload.transferId}. ` +
                    `It may have already been committed or the reference format differs.`);
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to commit transfer ${payload.transferId}: ${errorMessage}`, error instanceof Error ? error.stack : undefined);
        }
    }
    async handleTransferFailed(payload) {
        try {
            this.logger.log(`Voiding failed transfer ${payload.transferId}: ${payload.errorMessage}`);
            const reference = `transfer-${payload.transferId}`;
            const transaction = await this.blnkLedgerAdapter.getTransactionByReference(reference);
            if (transaction) {
                await this.blnkLedgerAdapter.voidTransaction(transaction.transactionId);
                this.logger.log(`Successfully voided failed transfer ${payload.transferId} (txn: ${transaction.transactionId})`);
            }
            else {
                this.logger.warn(`No inflight transaction found for failed transfer ${payload.transferId}. ` +
                    `It may have already been voided or the reference format differs.`);
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to void transfer ${payload.transferId}: ${errorMessage}`, error instanceof Error ? error.stack : undefined);
        }
    }
    async handleDepositCompletedNotification(payload) {
        this.logger.debug(`Deposit notification for user ${payload.userId}: ${payload.amount} ${payload.currency}`);
    }
    async handleDepositFailedNotification(payload) {
        this.logger.debug(`Deposit failed notification for user ${payload.userId}: ${payload.error}`);
    }
};
exports.WebhookLedgerListener = WebhookLedgerListener;
__decorate([
    (0, event_emitter_1.OnEvent)('webhook.deposit.completed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], WebhookLedgerListener.prototype, "handleDepositCompleted", null);
__decorate([
    (0, event_emitter_1.OnEvent)('webhook.transfer.completed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], WebhookLedgerListener.prototype, "handleTransferCompleted", null);
__decorate([
    (0, event_emitter_1.OnEvent)('webhook.transfer.failed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], WebhookLedgerListener.prototype, "handleTransferFailed", null);
__decorate([
    (0, event_emitter_1.OnEvent)('deposit.completed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], WebhookLedgerListener.prototype, "handleDepositCompletedNotification", null);
__decorate([
    (0, event_emitter_1.OnEvent)('deposit.failed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], WebhookLedgerListener.prototype, "handleDepositFailedNotification", null);
exports.WebhookLedgerListener = WebhookLedgerListener = WebhookLedgerListener_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [blnk_ledger_adapter_1.BlnkLedgerAdapter])
], WebhookLedgerListener);
//# sourceMappingURL=webhook-ledger.listener.js.map