import { FeatureSubscription } from '../../domain/entities';
import { FeatureSubscriptionRepository } from '../../domain/repositories';
import { FeatureSubscriptionService } from './feature-subscription.service';

describe('FeatureSubscriptionService', () => {
  let repository: jest.Mocked<FeatureSubscriptionRepository>;
  let service: FeatureSubscriptionService;

  beforeEach(() => {
    repository = {
      findByUserFeatureAndSource: jest.fn(),
      findByUserId: jest.fn(),
      save: jest.fn(async (subscription) => subscription),
    };
    service = new FeatureSubscriptionService(repository);
  });

  it('creates a subscription with feature context', async () => {
    repository.findByUserFeatureAndSource.mockResolvedValue(null);

    const subscription = await service.subscribe('user-1', {
      featureKey: 'virtual_card',
      source: 'cards_screen',
      status: 'subscribed',
      phone: '+2250748805663',
      metadata: { surface: 'cards', countryCode: 'CI' },
    });

    expect(repository.findByUserFeatureAndSource).toHaveBeenCalledWith(
      'user-1',
      'virtual_card',
      'cards_screen',
    );
    expect(repository.save).toHaveBeenCalledTimes(1);
    expect(subscription.featureKey).toBe('virtual_card');
    expect(subscription.source).toBe('cards_screen');
    expect(subscription.isActive).toBe(true);
    expect(subscription.metadata).toEqual({
      surface: 'cards',
      source: 'cards_screen',
      featureName: 'Korido virtual card',
      requestedFeature: 'virtual_card_launch',
      countryCode: 'CI',
    });
  });

  it('normalizes top-level mobile context into metadata', async () => {
    repository.findByUserFeatureAndSource.mockResolvedValue(null);

    const subscription = await service.subscribe('user-1', {
      featureKey: 'budget_controls',
      source: 'budget_view',
      phone: '+2250748805663',
      countryCode: 'CI',
      locale: 'fr-CI',
      platform: 'ios',
      appVersion: '1.0.0',
      metadata: { surface: 'wallet_budget' },
    });

    expect(repository.save).toHaveBeenCalledTimes(1);
    expect(subscription.metadata).toEqual({
      surface: 'wallet_budget',
      source: 'budget_view',
      featureName: 'Budget controls',
      requestedFeature: 'budget_controls_launch',
      countryCode: 'CI',
      locale: 'fr-CI',
      platform: 'ios',
      appVersion: '1.0.0',
    });
  });

  it('updates an existing subscription idempotently', async () => {
    const existing = FeatureSubscription.create({
      id: 'sub-1',
      userId: 'user-1',
      featureKey: 'virtual_card',
      source: 'cards_screen',
      status: 'unsubscribed',
      phone: '+2250000000000',
    });
    repository.findByUserFeatureAndSource.mockResolvedValue(existing);

    const subscription = await service.subscribe('user-1', {
      featureKey: 'virtual_card',
      source: 'cards_screen',
      status: 'subscribed',
      phone: '+2250748805663',
      metadata: { surface: 'cards' },
    });

    expect(repository.save).toHaveBeenCalledWith(existing);
    expect(subscription.id).toBe('sub-1');
    expect(subscription.status).toBe('subscribed');
    expect(subscription.phone).toBe('+2250748805663');
    expect(subscription.metadata).toEqual({
      surface: 'cards',
      source: 'cards_screen',
      featureName: 'Korido virtual card',
      requestedFeature: 'virtual_card_launch',
    });
  });
});
