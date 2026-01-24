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
var BlnkIdentityAdapter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlnkIdentityAdapter = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const blnk_typescript_1 = require("@blnkfinance/blnk-typescript");
let BlnkIdentityAdapter = BlnkIdentityAdapter_1 = class BlnkIdentityAdapter {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(BlnkIdentityAdapter_1.name);
        const blnkUrl = this.configService.get('blnk.url', 'http://localhost:5001');
        const blnkApiKey = this.configService.get('blnk.apiKey', '');
        this.client = (0, blnk_typescript_1.BlnkInit)(blnkApiKey, { baseUrl: blnkUrl });
    }
    async createLedgerIdentity(params) {
        this.logger.log(`Creating ledger identity for: ${params.email ?? 'unknown'}`);
        const response = (await this.client.Identity.create({
            identity_type: params.type,
            first_name: params.firstName,
            last_name: params.lastName,
            email_address: params.email,
            phone_number: params.phone,
            country: params.country,
            category: 'customer',
            street: '',
            state: '',
            post_code: '',
            city: '',
            meta_data: params.metadata,
        }));
        if (!response.data) {
            throw new Error(`Failed to create ledger identity: ${response.message}`);
        }
        return this.mapToIdentityInfo(response.data);
    }
    async getLedgerIdentity(identityId) {
        this.logger.debug(`Getting ledger identity: ${identityId}`);
        const response = (await this.client.Identity.get(identityId));
        if (!response.data) {
            return null;
        }
        return this.mapToIdentityInfo(response.data);
    }
    async updateLedgerIdentity(identityId, params) {
        this.logger.log(`Updating ledger identity: ${identityId}`);
        const existing = await this.getLedgerIdentity(identityId);
        if (!existing) {
            throw new Error(`Ledger identity not found: ${identityId}`);
        }
        const response = (await this.client.Identity.update(identityId, {
            identity_type: params.type ?? existing.type,
            first_name: params.firstName ?? existing.firstName,
            last_name: params.lastName ?? existing.lastName,
            email_address: params.email ?? existing.email,
            phone_number: params.phone ?? existing.phone,
            country: params.country ?? existing.country,
            category: 'customer',
            street: '',
            state: '',
            post_code: '',
            city: '',
            meta_data: params.metadata ?? existing.metadata,
        }));
        if (!response.data) {
            throw new Error(`Failed to update ledger identity: ${response.message}`);
        }
        return this.mapToIdentityInfo(response.data);
    }
    async listLedgerIdentities() {
        this.logger.debug('Listing all ledger identities');
        const response = (await this.client.Identity.list());
        if (!response.data) {
            return [];
        }
        return response.data.map((i) => this.mapToIdentityInfo(i));
    }
    mapToIdentityInfo(identity) {
        return {
            identityId: identity.identity_id,
            type: identity.identity_type,
            firstName: identity.first_name,
            lastName: identity.last_name,
            email: identity.email_address,
            phone: identity.phone_number,
            country: identity.country,
            createdAt: new Date(identity.created_at),
            metadata: identity.meta_data,
        };
    }
};
exports.BlnkIdentityAdapter = BlnkIdentityAdapter;
exports.BlnkIdentityAdapter = BlnkIdentityAdapter = BlnkIdentityAdapter_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], BlnkIdentityAdapter);
//# sourceMappingURL=blnk-identity.adapter.js.map