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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExternalTransferDto = exports.TransferCurrency = exports.BlockchainNetwork = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
var BlockchainNetwork;
(function (BlockchainNetwork) {
    BlockchainNetwork["POLYGON"] = "polygon";
    BlockchainNetwork["ETHEREUM"] = "ethereum";
    BlockchainNetwork["BASE"] = "base";
})(BlockchainNetwork || (exports.BlockchainNetwork = BlockchainNetwork = {}));
var TransferCurrency;
(function (TransferCurrency) {
    TransferCurrency["USD"] = "USD";
    TransferCurrency["USDC"] = "USDC";
})(TransferCurrency || (exports.TransferCurrency = TransferCurrency = {}));
class ExternalTransferDto {
}
exports.ExternalTransferDto = ExternalTransferDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Recipient wallet address (Ethereum/EVM compatible)',
        example: '0x1234567890abcdef1234567890abcdef12345678',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.Matches)(/^0x[a-fA-F0-9]{40}$/, {
        message: 'Must be a valid Ethereum address (0x followed by 40 hex characters)',
    }),
    __metadata("design:type", String)
], ExternalTransferDto.prototype, "toAddress", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Amount in USD to transfer',
        example: 50,
        minimum: 1,
        maximum: 1000000,
    }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1, { message: 'Amount must be at least $1.00' }),
    (0, class_validator_1.Max)(1000000, { message: 'Amount cannot exceed $1,000,000' }),
    __metadata("design:type", Number)
], ExternalTransferDto.prototype, "amount", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Currency (defaults to USD)',
        example: 'USD',
        enum: TransferCurrency,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(TransferCurrency, {
        message: 'Currency must be USD or USDC',
    }),
    __metadata("design:type", String)
], ExternalTransferDto.prototype, "currency", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Blockchain network (defaults to polygon)',
        example: 'polygon',
        enum: BlockchainNetwork,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(BlockchainNetwork, {
        message: 'Network must be one of: polygon, ethereum, base',
    }),
    __metadata("design:type", String)
], ExternalTransferDto.prototype, "network", void 0);
//# sourceMappingURL=external-transfer.dto.js.map