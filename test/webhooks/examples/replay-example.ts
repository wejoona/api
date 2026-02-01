import { WebhookReplay } from '../replay/webhook-replay';
import { MockWebhookServer } from '../server/mock-webhook-server';
import { circleWebhookFixtures } from '../fixtures/circle-webhooks';
import { yellowCardWebhookFixtures } from '../fixtures/yellowcard-webhooks';
import { twilioWebhookFixtures } from '../fixtures/twilio-webhooks';

/**
 * Webhook Replay Example
 *
 * Demonstrates how to record and replay webhooks for testing.
 * Run this example with: ts-node test/webhooks/examples/replay-example.ts
 */

async function main() {
  const replay = new WebhookReplay();
  const server = new MockWebhookServer();

  console.log('Starting mock webhook server...');
  await server.start(3006);

  try {
    // ============================================
    // Example 1: Record Individual Webhooks
    // ============================================
    console.log('\n--- Example 1: Recording Individual Webhooks ---');

    await replay.record(
      'circle-transfer-complete',
      circleWebhookFixtures.transferComplete,
      'circle',
      { description: 'Circle transfer complete event' },
    );

    await replay.record(
      'yc-payment-complete-orange',
      yellowCardWebhookFixtures.paymentCompleteOrangeMoney,
      'yellowcard',
      { description: 'Yellow Card payment via Orange Money' },
    );

    await replay.record(
      'twilio-sms-delivered',
      twilioWebhookFixtures.deliveredIvoryCoast,
      'twilio',
      { description: 'SMS delivered to Ivory Coast number' },
    );

    const recordings = await replay.list();
    console.log(`Recorded ${recordings.length} webhooks:`, recordings);

    // ============================================
    // Example 2: Replay Individual Webhooks
    // ============================================
    console.log('\n--- Example 2: Replaying Individual Webhooks ---');

    const result1 = await replay.replayOne(
      'circle-transfer-complete',
      server,
      'http://localhost:3000/webhooks/circle',
    );
    console.log(
      'Circle webhook replayed:',
      result1.success ? 'Success' : 'Failed',
    );

    // ============================================
    // Example 3: Record a Scenario
    // ============================================
    console.log('\n--- Example 3: Recording a Scenario ---');

    await replay.recordScenario(
      'deposit-flow',
      [
        {
          name: 'yc-payment-awaiting',
          payload: yellowCardWebhookFixtures.paymentAwaitingPayment,
          provider: 'yellowcard',
          delayMs: 0,
        },
        {
          name: 'yc-payment-complete',
          payload: yellowCardWebhookFixtures.paymentCompleteOrangeMoney,
          provider: 'yellowcard',
          delayMs: 5000, // User pays after 5 seconds
        },
        {
          name: 'circle-transfer-complete',
          payload: circleWebhookFixtures.transferComplete,
          provider: 'circle',
          delayMs: 2000, // Transfer completes 2 seconds later
        },
        {
          name: 'twilio-deposit-confirmation',
          payload: twilioWebhookFixtures.depositConfirmation,
          provider: 'twilio',
          delayMs: 1000, // SMS sent 1 second after transfer
        },
      ],
      { description: 'Complete deposit flow from payment to confirmation' },
    );

    console.log('Scenario "deposit-flow" recorded');

    // ============================================
    // Example 4: Record Withdrawal Scenario
    // ============================================
    console.log('\n--- Example 4: Recording Withdrawal Scenario ---');

    await replay.recordScenario(
      'withdrawal-flow',
      [
        {
          name: 'yc-payout-processing',
          payload: yellowCardWebhookFixtures.payoutProcessing,
          provider: 'yellowcard',
          delayMs: 0,
        },
        {
          name: 'yc-payout-complete',
          payload: yellowCardWebhookFixtures.payoutCompleteOrangeMoney,
          provider: 'yellowcard',
          delayMs: 10000, // Payout takes 10 seconds
        },
        {
          name: 'twilio-withdrawal-alert',
          payload: twilioWebhookFixtures.withdrawalAlert,
          provider: 'twilio',
          delayMs: 1000,
        },
      ],
      { description: 'Complete withdrawal flow' },
    );

    const scenarios = await replay.listScenarios();
    console.log('Recorded scenarios:', scenarios);

    // ============================================
    // Example 5: Replay a Scenario
    // ============================================
    console.log('\n--- Example 5: Replaying a Scenario ---');

    console.log(
      'Replaying "deposit-flow" scenario (this will take ~8 seconds)...',
    );
    const scenarioResults = await replay.replayScenario(
      'deposit-flow',
      server,
      'http://localhost:3000',
    );

    console.log('Scenario replay complete:');
    scenarioResults.forEach((result, index) => {
      console.log(
        `  ${index + 1}. ${result.success ? '✓' : '✗'} (${result.attempts} attempts)`,
      );
    });

    // ============================================
    // Example 6: Export as Test Fixtures
    // ============================================
    console.log('\n--- Example 6: Exporting Fixtures ---');

    await replay.exportAsFixture(
      ['circle-transfer-complete', 'yc-payment-complete-orange'],
      '/tmp/webhook-fixtures.json',
    );

    console.log('Exported fixtures to /tmp/webhook-fixtures.json');

    // ============================================
    // Example 7: Replay with Custom Delays
    // ============================================
    console.log('\n--- Example 7: Replay Sequence with Custom Delays ---');

    const sequenceResults = await replay.replaySequence(
      [
        'yc-payment-complete-orange',
        'circle-transfer-complete',
        'twilio-sms-delivered',
      ],
      server,
      'http://localhost:3000/webhooks/payment',
      500, // 500ms delay between webhooks
    );

    console.log(`Replayed ${sequenceResults.length} webhooks in sequence`);

    // ============================================
    // Cleanup
    // ============================================
    console.log('\n--- Cleanup ---');

    // Optionally delete recordings
    // await replay.delete('circle-transfer-complete');
    // console.log('Deleted test recording');
  } catch (error) {
    console.error('Error during replay example:', error);
  } finally {
    console.log('\nStopping mock server...');
    await server.stop();
    console.log('Done!');
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { main };
