"use strict";
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TwilioWebhookService = void 0;
var common_1 = require("@nestjs/common");
var ioredis_1 = require("ioredis");
/**
 * Twilio Webhook Service
 *
 * Processes Twilio SMS delivery status callbacks
 * Stores delivery status in Redis for tracking
 * Emits events for other parts of the system
 */
var TwilioWebhookService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var TwilioWebhookService = _classThis = /** @class */ (function () {
        function TwilioWebhookService_1(eventEmitter, configService) {
            var _this = this;
            this.eventEmitter = eventEmitter;
            this.configService = configService;
            this.logger = new common_1.Logger(TwilioWebhookService.name);
            // Initialize Redis for status tracking
            this.redis = new ioredis_1.default({
                host: this.configService.get('redis.host'),
                port: this.configService.get('redis.port'),
                password: this.configService.get('redis.password'),
                retryStrategy: function (times) {
                    var delay = Math.min(times * 50, 2000);
                    return delay;
                },
            });
            this.redis.on('error', function (error) {
                _this.logger.error("Redis connection error: ".concat(error.message));
            });
        }
        /**
         * Handle SMS status callback from Twilio
         */
        TwilioWebhookService_1.prototype.handleStatusCallback = function (update) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            this.logger.log("Processing SMS status update: ".concat(update.messageSid, " -> ").concat(update.status));
                            // Store status in Redis
                            return [4 /*yield*/, this.storeDeliveryStatus(update)];
                        case 1:
                            // Store status in Redis
                            _a.sent();
                            // Log delivery failures
                            if (update.status === 'failed' || update.status === 'undelivered') {
                                this.logger.warn("SMS delivery failed: ".concat(update.messageSid, " to ").concat(update.to) +
                                    (update.errorCode ? " - Error ".concat(update.errorCode, ": ").concat(update.errorMessage) : ''));
                            }
                            // Emit event for other services
                            this.eventEmitter.emit('sms.status.updated', {
                                messageSid: update.messageSid,
                                status: this.mapTwilioStatus(update.status),
                                to: update.to,
                                errorCode: update.errorCode,
                                errorMessage: update.errorMessage,
                                timestamp: new Date(),
                            });
                            // Track metrics
                            return [4 /*yield*/, this.trackDeliveryMetrics(update)];
                        case 2:
                            // Track metrics
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        };
        /**
         * Store delivery status in Redis
         */
        TwilioWebhookService_1.prototype.storeDeliveryStatus = function (update) {
            return __awaiter(this, void 0, void 0, function () {
                var key, data;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            key = "sms_delivery:".concat(update.messageSid);
                            data = {
                                status: update.status,
                                to: update.to,
                                from: update.from,
                                errorCode: update.errorCode,
                                errorMessage: update.errorMessage,
                                updatedAt: new Date().toISOString(),
                            };
                            // Store for 7 days
                            return [4 /*yield*/, this.redis.setex(key, 604800, JSON.stringify(data))];
                        case 1:
                            // Store for 7 days
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        };
        /**
         * Track delivery metrics
         */
        TwilioWebhookService_1.prototype.trackDeliveryMetrics = function (update) {
            return __awaiter(this, void 0, void 0, function () {
                var date, statusKey, totalKey, pipeline, countryCode, countryKey;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            date = new Date().toISOString().split('T')[0];
                            statusKey = "sms_metrics:".concat(date, ":").concat(update.status);
                            totalKey = "sms_metrics:".concat(date, ":total");
                            pipeline = this.redis.pipeline();
                            pipeline.incr(statusKey);
                            pipeline.expire(statusKey, 2592000); // 30 days
                            pipeline.incr(totalKey);
                            pipeline.expire(totalKey, 2592000); // 30 days
                            countryCode = this.extractCountryCode(update.to);
                            if (countryCode) {
                                countryKey = "sms_metrics:".concat(date, ":country:").concat(countryCode);
                                pipeline.incr(countryKey);
                                pipeline.expire(countryKey, 2592000);
                            }
                            return [4 /*yield*/, pipeline.exec()];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        };
        /**
         * Get delivery status for a message
         */
        TwilioWebhookService_1.prototype.getDeliveryStatus = function (messageSid) {
            return __awaiter(this, void 0, void 0, function () {
                var key, data;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            key = "sms_delivery:".concat(messageSid);
                            return [4 /*yield*/, this.redis.get(key)];
                        case 1:
                            data = _a.sent();
                            if (!data) {
                                return [2 /*return*/, null];
                            }
                            return [2 /*return*/, JSON.parse(data)];
                    }
                });
            });
        };
        /**
         * Get delivery metrics for a date
         */
        TwilioWebhookService_1.prototype.getMetrics = function (date) {
            return __awaiter(this, void 0, void 0, function () {
                var keys, values;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            keys = [
                                "sms_metrics:".concat(date, ":total"),
                                "sms_metrics:".concat(date, ":queued"),
                                "sms_metrics:".concat(date, ":sent"),
                                "sms_metrics:".concat(date, ":delivered"),
                                "sms_metrics:".concat(date, ":failed"),
                                "sms_metrics:".concat(date, ":undelivered"),
                            ];
                            return [4 /*yield*/, (_a = this.redis).mget.apply(_a, keys)];
                        case 1:
                            values = _b.sent();
                            return [2 /*return*/, {
                                    total: parseInt(values[0] || '0', 10),
                                    queued: parseInt(values[1] || '0', 10),
                                    sent: parseInt(values[2] || '0', 10),
                                    delivered: parseInt(values[3] || '0', 10),
                                    failed: parseInt(values[4] || '0', 10),
                                    undelivered: parseInt(values[5] || '0', 10),
                                }];
                    }
                });
            });
        };
        /**
         * Map Twilio status to standard status
         */
        TwilioWebhookService_1.prototype.mapTwilioStatus = function (twilioStatus) {
            var statusMap = {
                queued: 'queued',
                accepted: 'queued',
                scheduled: 'queued',
                sending: 'queued',
                sent: 'sent',
                delivered: 'delivered',
                undelivered: 'failed',
                failed: 'failed',
                canceled: 'failed',
            };
            return statusMap[twilioStatus.toLowerCase()] || 'queued';
        };
        /**
         * Extract country code from phone number
         */
        TwilioWebhookService_1.prototype.extractCountryCode = function (phone) {
            // Extract country code from international format
            var match = phone.match(/^\+(\d{1,3})/);
            return match ? match[1] : null;
        };
        /**
         * Cleanup on module destroy
         */
        TwilioWebhookService_1.prototype.onModuleDestroy = function () {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!this.redis) return [3 /*break*/, 2];
                            return [4 /*yield*/, this.redis.quit()];
                        case 1:
                            _a.sent();
                            this.logger.log('Redis connection closed for Twilio webhook service');
                            _a.label = 2;
                        case 2: return [2 /*return*/];
                    }
                });
            });
        };
        return TwilioWebhookService_1;
    }());
    __setFunctionName(_classThis, "TwilioWebhookService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        TwilioWebhookService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return TwilioWebhookService = _classThis;
}();
exports.TwilioWebhookService = TwilioWebhookService;
