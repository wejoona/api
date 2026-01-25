"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = void 0;
const uuid_1 = require("uuid");
class User {
    constructor(props) {
        this.id = props.id;
        this.phone = props.phone;
        this.phoneVerified = props.phoneVerified;
        this.username = props.username;
        this.firstName = props.firstName;
        this.lastName = props.lastName;
        this.email = props.email;
        this.countryCode = props.countryCode;
        this.kycStatus = props.kycStatus;
        this.kycProviderId = props.kycProviderId;
        this.circleUserId = props.circleUserId;
        this.circleUserToken = props.circleUserToken;
        this.role = props.role;
        this.status = props.status;
        this.suspendedAt = props.suspendedAt;
        this.suspendedReason = props.suspendedReason;
        this.pinHash = props.pinHash;
        this.pinSetAt = props.pinSetAt;
        this.pinAttempts = props.pinAttempts;
        this.pinLockedUntil = props.pinLockedUntil;
        this.createdAt = props.createdAt;
        this.updatedAt = props.updatedAt;
    }
    static create(props) {
        const now = new Date();
        return new User({
            id: (0, uuid_1.v4)(),
            phone: props.phone,
            phoneVerified: false,
            username: null,
            firstName: null,
            lastName: null,
            email: null,
            countryCode: props.countryCode || 'CI',
            kycStatus: 'pending',
            kycProviderId: null,
            circleUserId: null,
            circleUserToken: null,
            role: 'user',
            status: 'active',
            suspendedAt: null,
            suspendedReason: null,
            pinHash: null,
            pinSetAt: null,
            pinAttempts: 0,
            pinLockedUntil: null,
            createdAt: now,
            updatedAt: now,
        });
    }
    static reconstitute(props) {
        return new User(props);
    }
    verifyPhone() {
        this.phoneVerified = true;
        this.updatedAt = new Date();
    }
    updateProfile(props) {
        if (props.username !== undefined)
            this.username = props.username;
        if (props.firstName !== undefined)
            this.firstName = props.firstName;
        if (props.lastName !== undefined)
            this.lastName = props.lastName;
        if (props.email !== undefined)
            this.email = props.email;
        this.updatedAt = new Date();
    }
    setUsername(username) {
        this.username = username;
        this.updatedAt = new Date();
    }
    get displayName() {
        if (this.username)
            return `@${this.username}`;
        if (this.fullName)
            return this.fullName;
        return this.phone;
    }
    submitKyc(kycProviderId) {
        this.kycStatus = 'submitted';
        this.kycProviderId = kycProviderId;
        this.updatedAt = new Date();
    }
    approveKyc() {
        this.kycStatus = 'approved';
        this.updatedAt = new Date();
    }
    rejectKyc() {
        this.kycStatus = 'rejected';
        this.updatedAt = new Date();
    }
    updateKycStatus(status) {
        this.kycStatus = status;
        this.updatedAt = new Date();
    }
    linkToCircle(circleUserId, userToken) {
        this.circleUserId = circleUserId;
        if (userToken) {
            this.circleUserToken = userToken;
        }
        this.updatedAt = new Date();
    }
    updateCircleUserToken(userToken) {
        this.circleUserToken = userToken;
        this.updatedAt = new Date();
    }
    get isLinkedToCircle() {
        return this.circleUserId !== null;
    }
    get fullName() {
        if (!this.firstName && !this.lastName)
            return null;
        return [this.firstName, this.lastName].filter(Boolean).join(' ');
    }
    get isPhoneVerified() {
        return this.phoneVerified;
    }
    get isKycApproved() {
        return this.kycStatus === 'approved';
    }
    get canTransact() {
        return this.phoneVerified;
    }
    get canWithdraw() {
        return this.phoneVerified && this.isKycApproved && this.isActive;
    }
    get isActive() {
        return this.status === 'active';
    }
    get isSuspended() {
        return this.status === 'suspended';
    }
    get isAdmin() {
        return this.role === 'admin' || this.role === 'super_admin';
    }
    get isSuperAdmin() {
        return this.role === 'super_admin';
    }
    suspend(reason) {
        this.status = 'suspended';
        this.suspendedAt = new Date();
        this.suspendedReason = reason;
        this.updatedAt = new Date();
    }
    unsuspend() {
        this.status = 'active';
        this.suspendedAt = null;
        this.suspendedReason = null;
        this.updatedAt = new Date();
    }
    deactivate() {
        this.status = 'deactivated';
        this.updatedAt = new Date();
    }
    setRole(role) {
        this.role = role;
        this.updatedAt = new Date();
    }
    setPin(pinHash) {
        this.pinHash = pinHash;
        this.pinSetAt = new Date();
        this.pinAttempts = 0;
        this.pinLockedUntil = null;
        this.updatedAt = new Date();
    }
    get hasPin() {
        return this.pinHash !== null;
    }
    get isPinLocked() {
        if (!this.pinLockedUntil)
            return false;
        return new Date() < this.pinLockedUntil;
    }
    recordFailedPinAttempt() {
        this.pinAttempts += 1;
        if (this.pinAttempts >= 5) {
            const lockUntil = new Date();
            lockUntil.setMinutes(lockUntil.getMinutes() + 30);
            this.pinLockedUntil = lockUntil;
        }
        this.updatedAt = new Date();
    }
    resetPinAttempts() {
        this.pinAttempts = 0;
        this.pinLockedUntil = null;
        this.updatedAt = new Date();
    }
    clearPin() {
        this.pinHash = null;
        this.pinSetAt = null;
        this.pinAttempts = 0;
        this.pinLockedUntil = null;
        this.updatedAt = new Date();
    }
}
exports.User = User;
//# sourceMappingURL=user.entity.js.map