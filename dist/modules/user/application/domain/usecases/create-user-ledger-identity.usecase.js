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
var CreateUserLedgerIdentityUseCase_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateUserLedgerIdentityUseCase = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const interfaces_1 = require("../../../../providers/interfaces");
let CreateUserLedgerIdentityUseCase = CreateUserLedgerIdentityUseCase_1 = class CreateUserLedgerIdentityUseCase {
    constructor(identityProvider, ledgerProvider, eventEmitter) {
        this.identityProvider = identityProvider;
        this.ledgerProvider = ledgerProvider;
        this.eventEmitter = eventEmitter;
        this.logger = new common_1.Logger(CreateUserLedgerIdentityUseCase_1.name);
    }
    async execute(input) {
        this.logger.log(`Creating ledger identity for user: ${input.userId}`);
        const identity = await this.identityProvider.createLedgerIdentity({
            type: 'individual',
            firstName: input.firstName,
            lastName: input.lastName,
            email: input.email,
            phone: input.phone,
            country: input.country,
            metadata: {
                joonapayUserId: input.userId,
                createdAt: new Date().toISOString(),
            },
        });
        this.logger.log(`Created ledger identity: ${identity.identityId}`);
        const balanceId = await this.ledgerProvider.createUserBalance(input.userId, 'USDC');
        this.logger.log(`Created USDC balance: ${balanceId}`);
        this.eventEmitter.emit('user.ledger-identity.created', {
            userId: input.userId,
            identityId: identity.identityId,
            balanceId,
            email: input.email,
            timestamp: new Date().toISOString(),
        });
        return {
            identityId: identity.identityId,
            balanceId,
            userId: input.userId,
        };
    }
};
exports.CreateUserLedgerIdentityUseCase = CreateUserLedgerIdentityUseCase;
exports.CreateUserLedgerIdentityUseCase = CreateUserLedgerIdentityUseCase = CreateUserLedgerIdentityUseCase_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(interfaces_1.LEDGER_IDENTITY_PROVIDER)),
    __param(1, (0, common_1.Inject)(interfaces_1.LEDGER_PROVIDER)),
    __metadata("design:paramtypes", [Object, Object, event_emitter_1.EventEmitter2])
], CreateUserLedgerIdentityUseCase);
//# sourceMappingURL=create-user-ledger-identity.usecase.js.map