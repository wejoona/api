"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationModule = void 0;
const common_1 = require("@nestjs/common");
const cqrs_1 = require("@nestjs/cqrs");
const repositories_1 = require("./infrastructure/repositories");
const queries_1 = require("./application/queries");
const mappers_1 = require("./infrastructure/mappers");
const usecases_1 = require("./application/domain/usecases");
const controllers_1 = require("./application/controllers");
const commands_1 = require("./application/commands");
const orm_entities_1 = require("./infrastructure/orm-entities");
const typeorm_1 = require("@nestjs/typeorm");
const services_1 = require("./application/domain/services");
const shared_module_1 = require("../shared/shared.module");
const user_preferences_module_1 = require("../user-preferences/user-preferences.module");
const fcm_1 = require("./infrastructure/fcm");
const event_listeners_1 = require("./application/domain/event-listeners");
const adapters_1 = require("./infrastructure/adapters");
let NotificationModule = class NotificationModule {
};
exports.NotificationModule = NotificationModule;
exports.NotificationModule = NotificationModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([...orm_entities_1.OrmEntities, fcm_1.FcmTokenOrmEntity]),
            cqrs_1.CqrsModule,
            shared_module_1.SharedModule,
            user_preferences_module_1.UserPreferencesModule,
        ],
        providers: [
            ...commands_1.CommandHandlers,
            ...queries_1.Queries,
            ...repositories_1.Repositories,
            ...mappers_1.Mappers,
            ...usecases_1.UseCases,
            ...services_1.Services,
            fcm_1.FcmTokenRepository,
            adapters_1.NovuAdapter,
            event_listeners_1.NotificationEventListener,
        ],
        controllers: [...controllers_1.Controllers],
        exports: [...services_1.Services, adapters_1.NovuAdapter],
    })
], NotificationModule);
//# sourceMappingURL=notification.module.js.map