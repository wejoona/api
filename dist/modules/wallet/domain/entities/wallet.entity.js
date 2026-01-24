"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WalletEntity = void 0;
const uuid_1 = require("uuid");
class WalletEntity {
    constructor(props) {
        this.id = props.id;
        this.userId = props.userId;
        this.yellowCardWalletId = props.yellowCardWalletId;
        this.circleWalletId = props.circleWalletId;
        this.circleWalletAddress = props.circleWalletAddress;
        this.currency = props.currency;
        this.balance = props.balance;
        this.kycStatus = props.kycStatus;
        this.status = props.status;
        this.createdAt = props.createdAt;
        this.updatedAt = props.updatedAt;
    }
    static create(props) {
        const now = new Date();
        return new WalletEntity({
            id: (0, uuid_1.v4)(),
            userId: props.userId,
            yellowCardWalletId: props.yellowCardWalletId || null,
            circleWalletId: null,
            circleWalletAddress: null,
            currency: props.currency || 'USDC',
            balance: 0,
            kycStatus: 'none',
            status: 'active',
            createdAt: now,
            updatedAt: now,
        });
    }
    static reconstitute(props) {
        return new WalletEntity(props);
    }
    linkYellowCard(yellowCardWalletId) {
        this.yellowCardWalletId = yellowCardWalletId;
        this.updatedAt = new Date();
    }
    linkToCircle(circleWalletId, circleWalletAddress) {
        this.circleWalletId = circleWalletId;
        if (circleWalletAddress) {
            this.circleWalletAddress = circleWalletAddress;
        }
        this.updatedAt = new Date();
    }
    setCircleWalletAddress(address) {
        this.circleWalletAddress = address;
        this.updatedAt = new Date();
    }
    linkProvider(providerWalletId) {
        this.linkToCircle(providerWalletId);
    }
    credit(amount) {
        if (amount <= 0) {
            throw new Error('Credit amount must be positive');
        }
        this.balance += amount;
        this.updatedAt = new Date();
    }
    debit(amount) {
        if (amount <= 0) {
            throw new Error('Debit amount must be positive');
        }
        if (this.balance < amount) {
            throw new Error('Insufficient balance');
        }
        this.balance -= amount;
        this.updatedAt = new Date();
    }
    updateKycStatus(status) {
        this.kycStatus = status;
        this.updatedAt = new Date();
    }
    suspend() {
        this.status = 'suspended';
        this.updatedAt = new Date();
    }
    activate() {
        this.status = 'active';
        this.updatedAt = new Date();
    }
    close() {
        this.status = 'closed';
        this.updatedAt = new Date();
    }
    get isActive() {
        return this.status === 'active';
    }
    get isLinkedToYellowCard() {
        return this.yellowCardWalletId !== null;
    }
    get isLinkedToCircle() {
        return this.circleWalletId !== null;
    }
    get isLinkedToProvider() {
        return this.circleWalletId !== null;
    }
    get isKycVerified() {
        return this.kycStatus === 'verified';
    }
    get providerWalletId() {
        return this.circleWalletId;
    }
    get depositAddress() {
        return this.circleWalletAddress;
    }
}
exports.WalletEntity = WalletEntity;
//# sourceMappingURL=wallet.entity.js.map