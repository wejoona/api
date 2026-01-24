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
exports.ApplyReferralCodeRequest = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class ApplyReferralCodeRequest {
}
exports.ApplyReferralCodeRequest = ApplyReferralCodeRequest;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'The referral code to apply',
        example: 'ABC12345',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(6, 20),
    (0, class_validator_1.Matches)(/^[A-Z0-9]+$/, {
        message: 'Referral code must be alphanumeric uppercase',
    }),
    __metadata("design:type", String)
], ApplyReferralCodeRequest.prototype, "code", void 0);
//# sourceMappingURL=apply-referral-code.request.js.map