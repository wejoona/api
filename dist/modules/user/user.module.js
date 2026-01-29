"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const jwt_1 = require("@nestjs/jwt");
const passport_1 = require("@nestjs/passport");
const config_1 = require("@nestjs/config");
const orm_entities_1 = require("./infrastructure/orm-entities");
const repositories_1 = require("./infrastructure/repositories");
const services_1 = require("./application/domain/services");
const usecases_1 = require("./application/domain/usecases");
const controllers_1 = require("./application/controllers");
const dev_controller_1 = require("./application/controllers/dev.controller");
const guards_1 = require("../../common/guards");
const wallet_module_1 = require("../wallet/wallet.module");
const kyc_module_1 = require("../kyc/kyc.module");
const transaction_module_1 = require("../transaction/transaction.module");
let UserModule = class UserModule {
};
exports.UserModule = UserModule;
exports.UserModule = UserModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([orm_entities_1.UserOrmEntity]),
            passport_1.PassportModule.register({ defaultStrategy: 'jwt' }),
            jwt_1.JwtModule.registerAsync({
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: (configService) => {
                    const expiresIn = configService.get('jwt.expiresIn') || '7d';
                    return {
                        secret: configService.get('jwt.secret') || 'fallback-secret',
                        signOptions: {
                            expiresIn: expiresIn,
                        },
                    };
                },
            }),
            (0, common_1.forwardRef)(() => wallet_module_1.WalletModule),
            (0, common_1.forwardRef)(() => kyc_module_1.KycModule),
            (0, common_1.forwardRef)(() => transaction_module_1.TransactionModule),
        ],
        controllers: [
            controllers_1.AuthController,
            controllers_1.UserController,
            ...(process.env.NODE_ENV !== 'production' ? [dev_controller_1.DevController] : []),
        ],
        providers: [
            repositories_1.UserRepository,
            services_1.OtpService,
            usecases_1.RegisterUserUsecase,
            usecases_1.VerifyOtpUsecase,
            usecases_1.LoginUserUsecase,
            usecases_1.UpdateProfileUsecase,
            usecases_1.CreateUserLedgerIdentityUseCase,
            usecases_1.SetupUserBalanceMonitorsUseCase,
            usecases_1.RefreshTokenUsecase,
            usecases_1.LogoutUsecase,
            usecases_1.LogoutAllUsecase,
            usecases_1.UsernameUsecase,
            usecases_1.GetUserLimitsUseCase,
            guards_1.JwtStrategy,
        ],
        exports: [repositories_1.UserRepository, guards_1.JwtStrategy, passport_1.PassportModule],
    })
], UserModule);
//# sourceMappingURL=user.module.js.map