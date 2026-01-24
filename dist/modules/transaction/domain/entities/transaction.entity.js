"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionEntity = void 0;
const uuid_1 = require("uuid");
class TransactionEntity {
    constructor(props) {
        this.id = props.id;
        this.walletId = props.walletId;
        this.type = props.type;
        this.amount = props.amount;
        this.currency = props.currency;
        this.status = props.status;
        this.yellowCardRef = props.yellowCardRef;
        this.recipientAddress = props.recipientAddress;
        this.recipientPhone = props.recipientPhone;
        this.recipientWalletId = props.recipientWalletId;
        this.metadata = props.metadata;
        this.failureReason = props.failureReason;
        this.createdAt = props.createdAt;
        this.completedAt = props.completedAt;
    }
    static createDeposit(props) {
        return new TransactionEntity({
            id: (0, uuid_1.v4)(),
            walletId: props.walletId,
            type: 'deposit',
            amount: props.amount,
            currency: props.currency || 'USD',
            status: 'pending',
            yellowCardRef: props.yellowCardRef || null,
            recipientAddress: null,
            recipientPhone: null,
            recipientWalletId: null,
            metadata: props.metadata || null,
            failureReason: null,
            createdAt: new Date(),
            completedAt: null,
        });
    }
    static createInternalTransfer(props) {
        return new TransactionEntity({
            id: (0, uuid_1.v4)(),
            walletId: props.walletId,
            type: 'transfer_internal',
            amount: props.amount,
            currency: props.currency || 'USD',
            status: 'pending',
            yellowCardRef: null,
            recipientAddress: null,
            recipientPhone: props.recipientPhone,
            recipientWalletId: props.recipientWalletId,
            metadata: props.metadata || null,
            failureReason: null,
            createdAt: new Date(),
            completedAt: null,
        });
    }
    static createExternalTransfer(props) {
        return new TransactionEntity({
            id: (0, uuid_1.v4)(),
            walletId: props.walletId,
            type: 'transfer_external',
            amount: props.amount,
            currency: props.currency || 'USD',
            status: 'pending',
            yellowCardRef: props.yellowCardRef || null,
            recipientAddress: props.recipientAddress,
            recipientPhone: null,
            recipientWalletId: null,
            metadata: props.metadata || null,
            failureReason: null,
            createdAt: new Date(),
            completedAt: null,
        });
    }
    static reconstitute(props) {
        return new TransactionEntity(props);
    }
    markProcessing() {
        this.status = 'processing';
    }
    updateStatus(status) {
        this.status = status;
        if (status === 'completed' ||
            status === 'failed' ||
            status === 'cancelled') {
            this.completedAt = new Date();
        }
    }
    complete() {
        this.status = 'completed';
        this.completedAt = new Date();
    }
    fail(reason) {
        this.status = 'failed';
        this.failureReason = reason;
        this.completedAt = new Date();
    }
    cancel() {
        this.status = 'cancelled';
        this.completedAt = new Date();
    }
    setYellowCardRef(ref) {
        this.yellowCardRef = ref;
    }
    setProviderRef(ref) {
        this.setYellowCardRef(ref);
    }
    get providerRef() {
        return this.yellowCardRef;
    }
    addMetadata(key, value) {
        if (!this.metadata) {
            this.metadata = {};
        }
        this.metadata[key] = value;
    }
    get isPending() {
        return this.status === 'pending';
    }
    get isCompleted() {
        return this.status === 'completed';
    }
    get isFailed() {
        return this.status === 'failed';
    }
    get isDeposit() {
        return this.type === 'deposit';
    }
    get isTransfer() {
        return (this.type === 'transfer_internal' || this.type === 'transfer_external');
    }
}
exports.TransactionEntity = TransactionEntity;
//# sourceMappingURL=transaction.entity.js.map