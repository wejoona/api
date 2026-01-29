"use strict";
/**
 * SMS Gateway Interface
 *
 * Generic interface for SMS providers.
 * Currently implemented by MockSmsGateway, but can be swapped for:
 * - Twilio
 * - Africa's Talking
 * - Vonage
 * - AWS SNS
 * - In-house solution
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SMS_GATEWAY = void 0;
// Injection token for the SMS gateway
exports.SMS_GATEWAY = Symbol('SMS_GATEWAY');
