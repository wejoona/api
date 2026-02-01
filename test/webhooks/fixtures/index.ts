/**
 * Webhook Fixtures - Centralized Export
 *
 * Import all webhook fixtures from a single location.
 */

export * from './circle-webhooks';
export * from './yellowcard-webhooks';
export * from './twilio-webhooks';

// Re-export common fixtures for convenience
import { circleWebhookFixtures } from './circle-webhooks';
import { yellowCardWebhookFixtures } from './yellowcard-webhooks';
import { twilioWebhookFixtures } from './twilio-webhooks';

export const allFixtures = {
  circle: circleWebhookFixtures,
  yellowcard: yellowCardWebhookFixtures,
  twilio: twilioWebhookFixtures,
};
