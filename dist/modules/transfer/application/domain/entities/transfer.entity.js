"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransferEntity = void 0;
const uuid_1 = require("uuid");
id;
string;
reference;
string;
type;
TransferType;
status;
TransferStatus;
senderId;
string;
senderWalletId;
string;
senderPhone;
string | null;
recipientId;
string | null;
recipientWalletId;
string | null;
recipientPhone;
string | null;
recipientAddress;
string | null;
recipientBlockchain;
string | null;
amount;
number;
fee;
number;
currency;
string;
note;
string | null;
providerTransferId;
string | null;
providerName;
string | null;
ledgerTransactionId;
string | null;
txHash;
string | null;
errorMessage;
string | null;
metadata;
(Record) | null;
createdAt;
Date;
updatedAt;
Date;
completedAt;
Date | null;
senderId;
string;
senderWalletId;
string;
senderPhone ?  : string;
recipientId;
string;
recipientWalletId;
string;
recipientPhone;
string;
amount;
number;
fee ?  : number;
currency ?  : string;
note ?  : string;
metadata ?  : Record;
senderId;
string;
senderWalletId;
string;
recipientAddress;
string;
recipientBlockchain ?  : string;
amount;
number;
fee ?  : number;
currency ?  : string;
note ?  : string;
metadata ?  : Record;
class TransferEntity {
    constructor(props) {
        this.id = props.id;
        this.reference = props.reference;
        this.type = props.type;
        this.status = props.status;
        this.senderId = props.senderId;
        this.senderWalletId = props.senderWalletId;
        this.senderPhone = props.senderPhone;
        this.recipientId = props.recipientId;
        this.recipientWalletId = props.recipientWalletId;
        this.recipientPhone = props.recipientPhone;
        this.recipientAddress = props.recipientAddress;
        this.recipientBlockchain = props.recipientBlockchain;
        this.amount = props.amount;
        this.fee = props.fee;
        this.currency = props.currency;
        this.note = props.note;
        this.providerTransferId = props.providerTransferId;
        this.providerName = props.providerName;
        this.ledgerTransactionId = props.ledgerTransactionId;
        this.txHash = props.txHash;
        this.errorMessage = props.errorMessage;
        this.metadata = props.metadata;
        this.createdAt = props.createdAt;
        this.updatedAt = props.updatedAt;
        this.completedAt = props.completedAt;
    }
    static createInternal(props) {
        const now = new Date();
        const reference = TransferEntity.generateReference('INT');
        return new TransferEntity({
            id: (0, uuid_1.v4)(),
            reference,
            type: 'internal',
            status: 'pending',
            senderId: props.senderId,
            senderWalletId: props.senderWalletId,
            senderPhone: props.senderPhone || null,
            recipientId: props.recipientId,
            recipientWalletId: props.recipientWalletId,
            recipientPhone: props.recipientPhone,
            recipientAddress: null,
            recipientBlockchain: null,
            amount: props.amount,
            fee: props.fee || 0,
            currency: props.currency || 'USDC',
            note: props.note || null,
            providerTransferId: null,
            providerName: null,
            ledgerTransactionId: null,
            txHash: null,
            errorMessage: null,
            metadata: props.metadata || null,
            createdAt: now,
            updatedAt: now,
            completedAt: null,
        });
    }
    static createExternal(props) {
        const now = new Date();
        const reference = TransferEntity.generateReference('EXT');
        return new TransferEntity({
            id: (0, uuid_1.v4)(),
            reference,
            type: 'external',
            status: 'pending',
            senderId: props.senderId,
            senderWalletId: props.senderWalletId,
            senderPhone: null,
            recipientId: null,
            recipientWalletId: null,
            recipientPhone: null,
            recipientAddress: props.recipientAddress,
            recipientBlockchain: props.recipientBlockchain || 'polygon',
            amount: props.amount,
            fee: props.fee || 0,
            currency: props.currency || 'USDC',
            note: props.note || null,
            providerTransferId: null,
            providerName: null,
            ledgerTransactionId: null,
            txHash: null,
            errorMessage: null,
            metadata: props.metadata || null,
            createdAt: now,
            updatedAt: now,
            completedAt: null,
        });
    }
    static reconstitute(props) {
        return new TransferEntity(props);
    }
    static generateReference(prefix) {
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = Math.random().toString(36).substring(2, 8).toUpperCase();
        return `${prefix}-${timestamp}-${random}`;
    }
    markProcessing() {
        if (this.status !== 'pending') {
            throw new Error(`Cannot mark as processing from ${this.status} status`);
        }
        this.status = 'processing';
        this.updatedAt = new Date();
    }
    complete(txHash) {
        if (this.status !== 'processing' && this.status !== 'pending') {
            throw new Error(`Cannot complete transfer from ${this.status} status`);
        }
        this.status = 'completed';
        this.completedAt = new Date();
        this.updatedAt = new Date();
        if (txHash) {
            this.txHash = txHash;
        }
    }
    fail(errorMessage) {
        if (this.status === 'completed') {
            throw new Error('Cannot fail a completed transfer');
        }
        this.status = 'failed';
        this.errorMessage = errorMessage;
        this.completedAt = new Date();
        this.updatedAt = new Date();
    }
    cancel() {
        if (this.status === 'completed' || this.status === 'processing') {
            throw new Error(`Cannot cancel transfer in ${this.status} status`);
        }
        this.status = 'cancelled';
        this.completedAt = new Date();
        this.updatedAt = new Date();
    }
    refund() {
        if (this.status !== 'completed') {
            throw new Error('Can only refund completed transfers');
        }
        this.status = 'refunded';
        this.updatedAt = new Date();
    }
    setProviderInfo(providerTransferId, providerName) {
        this.providerTransferId = providerTransferId;
        this.providerName = providerName;
        this.updatedAt = new Date();
    }
    setLedgerTransactionId(ledgerTransactionId) {
        this.ledgerTransactionId = ledgerTransactionId;
        this.updatedAt = new Date();
    }
    setTxHash(txHash) {
        this.txHash = txHash;
        this.updatedAt = new Date();
    }
    addMetadata(key, value) {
        if (!this.metadata) {
            this.metadata = {};
        }
        this.metadata[key] = value;
        this.updatedAt = new Date();
    }
    get isPending() {
        return this.status === 'pending';
    }
    get isProcessing() {
        return this.status === 'processing';
    }
    get isCompleted() {
        return this.status === 'completed';
    }
    get isFailed() {
        return this.status === 'failed';
    }
    get isCancelled() {
        return this.status === 'cancelled';
    }
    get isRefunded() {
        return this.status === 'refunded';
    }
    get isInternal() {
        return this.type === 'internal';
    }
    get isExternal() {
        return this.type === 'external';
    }
    get totalAmount() {
        return this.amount + this.fee;
    }
    get canBeCancelled() {
        return this.status === 'pending';
    }
    get canBeRefunded() {
        return this.status === 'completed';
    }
}
exports.TransferEntity = TransferEntity;
//# sourceMappingURL=transfer.entity.js.map