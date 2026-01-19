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

export interface SendSmsRequest {
  to: string; // Phone number in international format
  message: string;
  templateId?: string;
  templateData?: Record<string, string>;
}

export interface SmsResponse {
  id: string;
  to: string;
  status: 'queued' | 'sent' | 'delivered' | 'failed';
  provider: string;
  createdAt: Date;
}

export interface ISmsGateway {
  // Provider identification
  readonly providerName: string;

  // Send SMS
  send(request: SendSmsRequest): Promise<SmsResponse>;

  // Send OTP specifically (convenience method)
  sendOtp(phone: string, otp: string): Promise<SmsResponse>;

  // Check delivery status
  getStatus(messageId: string): Promise<SmsResponse>;
}

// Injection token for the SMS gateway
export const SMS_GATEWAY = Symbol('SMS_GATEWAY');
