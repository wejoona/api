import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Pulsar from 'pulsar-client';

@Injectable()
export class PulsarService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PulsarService.name);
  private client: Pulsar.Client | null = null;
  private producers = new Map<string, Pulsar.Producer>();
  private consumers = new Map<string, Pulsar.Consumer>();

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    const serviceUrl = this.config.get<string>(
      'PULSAR_URL',
      'pulsar://pulsar.messaging.svc.cluster.local:6650',
    );
    const enabled = this.config.get<string>('PULSAR_ENABLED', 'false');

    if (enabled !== 'true') {
      this.logger.warn('Pulsar messaging disabled (PULSAR_ENABLED != true)');
      return;
    }

    try {
      this.client = new Pulsar.Client({ serviceUrl });
      this.logger.log(`Connected to Pulsar at ${serviceUrl}`);
    } catch (err) {
      this.logger.error(`Failed to connect to Pulsar: ${err.message}`);
    }
  }

  async onModuleDestroy() {
    for (const [topic, consumer] of this.consumers) {
      try {
        await consumer.close();
        this.logger.log(`Closed consumer for ${topic}`);
      } catch (_) {}
    }
    for (const [topic, producer] of this.producers) {
      try {
        await producer.close();
        this.logger.log(`Closed producer for ${topic}`);
      } catch (_) {}
    }
    if (this.client) {
      await this.client.close();
      this.logger.log('Pulsar client closed');
    }
  }

  isEnabled(): boolean {
    return this.client !== null;
  }

  async publish(topic: string, data: Record<string, any>): Promise<void> {
    if (!this.client) return;

    if (!this.producers.has(topic)) {
      const producer = await this.client.createProducer({ topic });
      this.producers.set(topic, producer);
    }

    const producer = this.producers.get(topic)!;
    await producer.send({
      data: Buffer.from(JSON.stringify(data)),
      eventTimestamp: Date.now(),
    });
  }

  async subscribe(
    topic: string,
    subscription: string,
    handler: (msg: Record<string, any>, ack: () => Promise<void>, nack: () => void) => Promise<void>,
  ): Promise<void> {
    if (!this.client) {
      this.logger.warn(`Cannot subscribe to ${topic} — Pulsar not connected`);
      return;
    }

    const consumer = await this.client.subscribe({
      topic,
      subscription,
      subscriptionType: 'Shared',
      nAckRedeliverTimeoutMs: 5000,
      deadLetterPolicy: {
        maxRedeliverCount: 3,
        deadLetterTopic: topic.replace(/\/[^/]+$/, '/dlq.' + topic.split('/').pop()),
      },
    });

    this.consumers.set(topic, consumer);
    this.logger.log(`Subscribed to ${topic} as "${subscription}"`);

    // Consume loop
    (async () => {
      while (true) {
        try {
          const msg = await consumer.receive();
          const data = JSON.parse(msg.getData().toString());
          await handler(
            data,
            () => consumer.acknowledge(msg),
            () => consumer.negativeAcknowledge(msg),
          );
        } catch (err) {
          if (err.message?.includes('Closed')) break;
          this.logger.error(`Consumer error on ${topic}: ${err.message}`);
          await new Promise((r) => setTimeout(r, 1000));
        }
      }
    })();
  }
}
