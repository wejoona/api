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
exports.TwilioSmsAdapter = void 0;
var common_1 = require("@nestjs/common");
var twilio = require("twilio");
var ioredis_1 = require("ioredis");
/**
 * Enhanced Twilio SMS Gateway Adapter
 *
 * Features:
 * - Twilio SDK integration
 * - Rate limiting per phone number
 * - Retry logic with exponential backoff
 * - Multi-language support (French/English)
 * - Delivery status tracking
 * - Character count optimization
 * - Messaging Service SID support
 * - Redis-based rate limiting
 *
 * Configuration:
 * - TWILIO_ACCOUNT_SID: Twilio account SID
 * - TWILIO_AUTH_TOKEN: Twilio auth token
 * - TWILIO_PHONE_NUMBER: From phone number
 * - TWILIO_MESSAGING_SERVICE_SID: (Optional) Messaging service SID
 * - TWILIO_MAX_RETRIES: Max retry attempts (default: 3)
 * - TWILIO_RATE_LIMIT_PER_MINUTE: Max SMS per minute per phone (default: 5)
 * - TWILIO_RATE_LIMIT_PER_HOUR: Max SMS per hour per phone (default: 10)
 */
var TwilioSmsAdapter = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var TwilioSmsAdapter = _classThis = /** @class */ (function () {
        function TwilioSmsAdapter_1(configService) {
            var _this = this;
            this.configService = configService;
            this.logger = new common_1.Logger(TwilioSmsAdapter.name);
            this.providerName = 'twilio';
            // Load configuration
            this.config = this.loadConfig();
            // Initialize Twilio client
            this.twilioClient = twilio(this.config.accountSid, this.config.authToken);
            // Initialize Redis for rate limiting
            this.redis = new ioredis_1.default({
                host: this.configService.get('redis.host'),
                port: this.configService.get('redis.port'),
                password: this.configService.get('redis.password'),
                retryStrategy: function (times) {
                    var delay = Math.min(times * 50, 2000);
                    return delay;
                },
            });
            // Check if using dev mode (bypass Twilio)
            this.useDevMode =
                this.configService.get('otp.useDevOtp', false) ||
                    this.configService.get('nodeEnv') === 'development';
            this.redis.on('error', function (error) {
                _this.logger.error("Redis connection error: ".concat(error.message));
            });
            this.logger.log("Twilio SMS adapter initialized (".concat(this.useDevMode ? 'DEV MODE' : 'PRODUCTION', ")"));
        }
        TwilioSmsAdapter_1.prototype.loadConfig = function () {
            var accountSid = this.configService.get('TWILIO_ACCOUNT_SID');
            var authToken = this.configService.get('TWILIO_AUTH_TOKEN');
            var phoneNumber = this.configService.get('TWILIO_PHONE_NUMBER');
            if (!accountSid || !authToken) {
                this.logger.warn('Twilio credentials not configured. SMS sending will be simulated in dev mode.');
            }
            return {
                accountSid: accountSid || '',
                authToken: authToken || '',
                phoneNumber: phoneNumber || '',
                messagingServiceSid: this.configService.get('TWILIO_MESSAGING_SERVICE_SID'),
                maxRetries: this.configService.get('TWILIO_MAX_RETRIES', 3),
                initialRetryDelayMs: this.configService.get('TWILIO_INITIAL_RETRY_DELAY_MS', 1000),
                maxRetryDelayMs: this.configService.get('TWILIO_MAX_RETRY_DELAY_MS', 10000),
                rateLimit: {
                    maxPerMinute: this.configService.get('TWILIO_RATE_LIMIT_PER_MINUTE', 5),
                    maxPerHour: this.configService.get('TWILIO_RATE_LIMIT_PER_HOUR', 10),
                },
            };
        };
        TwilioSmsAdapter_1.prototype.send = function (request) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            // Dev mode: simulate successful send
                            if (this.useDevMode) {
                                return [2 /*return*/, this.simulateSend(request)];
                            }
                            if (!this.config.accountSid || !this.config.authToken) {
                                throw new Error('Twilio credentials not configured');
                            }
                            // Check rate limits
                            return [4 /*yield*/, this.checkRateLimit(request.to)];
                        case 1:
                            // Check rate limits
                            _a.sent();
                            // Send with retry logic
                            return [2 /*return*/, this.sendWithRetry(request)];
                    }
                });
            });
        };
        TwilioSmsAdapter_1.prototype.sendOtp = function (phone, otp) {
            return __awaiter(this, void 0, void 0, function () {
                var language, message;
                return __generator(this, function (_a) {
                    language = this.detectLanguage(phone);
                    message = this.getOtpMessage(otp, language);
                    return [2 /*return*/, this.send({
                            to: phone,
                            message: message,
                        })];
                });
            });
        };
        TwilioSmsAdapter_1.prototype.getStatus = function (messageId) {
            return __awaiter(this, void 0, void 0, function () {
                var message, error_1, errorMessage;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            // Dev mode: return mock status
                            if (this.useDevMode || messageId.startsWith('DEV_')) {
                                return [2 /*return*/, {
                                        id: messageId,
                                        to: '+2250700000000',
                                        status: 'delivered',
                                        provider: this.providerName,
                                        createdAt: new Date(),
                                    }];
                            }
                            if (!this.config.accountSid || !this.config.authToken) {
                                throw new Error('Twilio credentials not configured');
                            }
                            _a.label = 1;
                        case 1:
                            _a.trys.push([1, 3, , 4]);
                            return [4 /*yield*/, this.twilioClient.messages(messageId).fetch()];
                        case 2:
                            message = _a.sent();
                            return [2 /*return*/, {
                                    id: message.sid,
                                    to: message.to,
                                    status: this.mapTwilioStatus(message.status),
                                    provider: this.providerName,
                                    createdAt: new Date(message.dateCreated),
                                }];
                        case 3:
                            error_1 = _a.sent();
                            errorMessage = error_1 instanceof Error ? error_1.message : 'Unknown error';
                            this.logger.error("Failed to get SMS status from Twilio: ".concat(errorMessage));
                            throw error_1;
                        case 4: return [2 /*return*/];
                    }
                });
            });
        };
        /**
         * Send SMS with exponential backoff retry logic
         */
        TwilioSmsAdapter_1.prototype.sendWithRetry = function (request_1) {
            return __awaiter(this, arguments, void 0, function (request, attempt) {
                var messageOptions, message, error_2, errorMessage, delayMs;
                if (attempt === void 0) { attempt = 1; }
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 3, , 6]);
                            messageOptions = {
                                to: request.to,
                                body: request.message,
                            };
                            // Use Messaging Service SID if configured, otherwise use from number
                            if (this.config.messagingServiceSid) {
                                messageOptions.messagingServiceSid = this.config.messagingServiceSid;
                            }
                            else {
                                messageOptions.from = this.config.phoneNumber;
                            }
                            return [4 /*yield*/, this.twilioClient.messages.create(messageOptions)];
                        case 1:
                            message = _a.sent();
                            this.logger.log("SMS sent successfully to ".concat(request.to, ": ").concat(message.sid, " (attempt ").concat(attempt, ")"));
                            // Increment rate limit counters
                            return [4 /*yield*/, this.incrementRateLimitCounters(request.to)];
                        case 2:
                            // Increment rate limit counters
                            _a.sent();
                            return [2 /*return*/, {
                                    id: message.sid,
                                    to: message.to,
                                    status: this.mapTwilioStatus(message.status),
                                    provider: this.providerName,
                                    createdAt: new Date(message.dateCreated),
                                }];
                        case 3:
                            error_2 = _a.sent();
                            errorMessage = error_2 instanceof Error ? error_2.message : 'Unknown error';
                            this.logger.error("Failed to send SMS via Twilio (attempt ".concat(attempt, "): ").concat(errorMessage));
                            if (!(attempt < this.config.maxRetries && this.isRetryableError(error_2))) return [3 /*break*/, 5];
                            delayMs = this.calculateRetryDelay(attempt);
                            this.logger.log("Retrying SMS send in ".concat(delayMs, "ms (attempt ").concat(attempt + 1, "/").concat(this.config.maxRetries, ")"));
                            return [4 /*yield*/, this.sleep(delayMs)];
                        case 4:
                            _a.sent();
                            return [2 /*return*/, this.sendWithRetry(request, attempt + 1)];
                        case 5: throw error_2;
                        case 6: return [2 /*return*/];
                    }
                });
            });
        };
        /**
         * Check if error is retryable
         */
        TwilioSmsAdapter_1.prototype.isRetryableError = function (error) {
            // Retry on network errors, rate limits, and server errors
            var retryableErrorCodes = [
                20429, // Too many requests
                20500, // Internal server error
                20503, // Service unavailable
                30001, // Queue overflow
                30002, // Account suspended
                30003, // Unreachable destination
                30005, // Unknown destination
                30006, // Landline or unreachable
            ];
            if (error.code && retryableErrorCodes.includes(error.code)) {
                return true;
            }
            // Retry on network errors
            if (error.message &&
                (error.message.includes('ECONNRESET') ||
                    error.message.includes('ETIMEDOUT') ||
                    error.message.includes('ENOTFOUND'))) {
                return true;
            }
            return false;
        };
        /**
         * Calculate exponential backoff delay
         */
        TwilioSmsAdapter_1.prototype.calculateRetryDelay = function (attempt) {
            var delay = this.config.initialRetryDelayMs * Math.pow(2, attempt - 1) +
                Math.random() * 1000; // Add jitter
            return Math.min(delay, this.config.maxRetryDelayMs);
        };
        /**
         * Check rate limits for phone number
         */
        TwilioSmsAdapter_1.prototype.checkRateLimit = function (phone) {
            return __awaiter(this, void 0, void 0, function () {
                var minuteKey, hourKey, _a, minuteCount, hourCount, minute, hour;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            minuteKey = "twilio_rate:".concat(phone, ":minute");
                            hourKey = "twilio_rate:".concat(phone, ":hour");
                            return [4 /*yield*/, Promise.all([
                                    this.redis.get(minuteKey),
                                    this.redis.get(hourKey),
                                ])];
                        case 1:
                            _a = _b.sent(), minuteCount = _a[0], hourCount = _a[1];
                            minute = minuteCount ? parseInt(minuteCount, 10) : 0;
                            hour = hourCount ? parseInt(hourCount, 10) : 0;
                            if (minute >= this.config.rateLimit.maxPerMinute) {
                                throw new Error("Rate limit exceeded: ".concat(this.config.rateLimit.maxPerMinute, " SMS per minute"));
                            }
                            if (hour >= this.config.rateLimit.maxPerHour) {
                                throw new Error("Rate limit exceeded: ".concat(this.config.rateLimit.maxPerHour, " SMS per hour"));
                            }
                            return [2 /*return*/];
                    }
                });
            });
        };
        /**
         * Increment rate limit counters
         */
        TwilioSmsAdapter_1.prototype.incrementRateLimitCounters = function (phone) {
            return __awaiter(this, void 0, void 0, function () {
                var minuteKey, hourKey, pipeline;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            minuteKey = "twilio_rate:".concat(phone, ":minute");
                            hourKey = "twilio_rate:".concat(phone, ":hour");
                            pipeline = this.redis.pipeline();
                            pipeline.incr(minuteKey);
                            pipeline.expire(minuteKey, 60); // 1 minute
                            pipeline.incr(hourKey);
                            pipeline.expire(hourKey, 3600); // 1 hour
                            return [4 /*yield*/, pipeline.exec()];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        };
        /**
         * Detect language from phone number
         */
        TwilioSmsAdapter_1.prototype.detectLanguage = function (phone) {
            // West African country codes (French-speaking)
            var frenchCountryCodes = [
                '+225', // Côte d'Ivoire
                '+221', // Senegal
                '+223', // Mali
                '+226', // Burkina Faso
                '+227', // Niger
                '+228', // Togo
                '+229', // Benin
                '+237', // Cameroon
                '+241', // Gabon
                '+242', // Congo
                '+243', // DRC
            ];
            for (var _i = 0, frenchCountryCodes_1 = frenchCountryCodes; _i < frenchCountryCodes_1.length; _i++) {
                var code = frenchCountryCodes_1[_i];
                if (phone.startsWith(code)) {
                    return 'fr';
                }
            }
            return 'en';
        };
        /**
         * Get optimized OTP message template
         * Character count optimized for SMS (160 chars for single message)
         */
        TwilioSmsAdapter_1.prototype.getOtpMessage = function (otp, language) {
            var templates = {
                fr: "Votre code JoonaPay est: ".concat(otp, ". Valide 5 min. Ne le partagez pas."), // 67 chars
                en: "Your JoonaPay code is: ".concat(otp, ". Valid for 5 min. Don't share it."), // 66 chars
            };
            return templates[language];
        };
        /**
         * Map Twilio status to our standard status
         */
        TwilioSmsAdapter_1.prototype.mapTwilioStatus = function (twilioStatus) {
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
            return statusMap[twilioStatus] || 'queued';
        };
        /**
         * Simulate SMS send in dev mode
         */
        TwilioSmsAdapter_1.prototype.simulateSend = function (request) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            this.logger.debug("[DEV MODE] Simulating SMS send to ".concat(request.to, ": ").concat(request.message));
                            // Simulate network delay
                            return [4 /*yield*/, this.sleep(100)];
                        case 1:
                            // Simulate network delay
                            _a.sent();
                            return [2 /*return*/, {
                                    id: "DEV_".concat(Date.now(), "_").concat(Math.random().toString(36).substring(7)),
                                    to: request.to,
                                    status: 'delivered',
                                    provider: this.providerName,
                                    createdAt: new Date(),
                                }];
                    }
                });
            });
        };
        /**
         * Sleep utility
         */
        TwilioSmsAdapter_1.prototype.sleep = function (ms) {
            return new Promise(function (resolve) { return setTimeout(resolve, ms); });
        };
        /**
         * Cleanup on module destroy
         */
        TwilioSmsAdapter_1.prototype.onModuleDestroy = function () {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!this.redis) return [3 /*break*/, 2];
                            return [4 /*yield*/, this.redis.quit()];
                        case 1:
                            _a.sent();
                            this.logger.log('Redis connection closed for Twilio adapter');
                            _a.label = 2;
                        case 2: return [2 /*return*/];
                    }
                });
            });
        };
        return TwilioSmsAdapter_1;
    }());
    __setFunctionName(_classThis, "TwilioSmsAdapter");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        TwilioSmsAdapter = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return TwilioSmsAdapter = _classThis;
}();
exports.TwilioSmsAdapter = TwilioSmsAdapter;
