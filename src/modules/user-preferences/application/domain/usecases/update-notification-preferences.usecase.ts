import { Injectable, Logger } from '@nestjs/common';
import { NotificationPreferences, UpdateNotificationPreferencesProps } from '../entities';
import { NotificationPreferencesRepository } from '../../../infrastructure/repositories';

export interface UpdateNotificationPreferencesInput extends UpdateNotificationPreferencesProps {
  userId: string;
}

@Injectable()
export class UpdateNotificationPreferencesUsecase {
  private readonly logger = new Logger(UpdateNotificationPreferencesUsecase.name);

  constructor(
    private readonly preferencesRepository: NotificationPreferencesRepository,
  ) {}

  /**
   * Update notification preferences for a user
   * Creates default preferences if none exist, then applies updates
   */
  async execute(input: UpdateNotificationPreferencesInput): Promise<NotificationPreferences> {
    const { userId, ...updateProps } = input;

    // Get existing preferences or create new ones
    let preferences = await this.preferencesRepository.getOrCreate(userId);

    // Apply updates
    preferences.update(updateProps);

    // Save and return updated preferences
    preferences = await this.preferencesRepository.save(preferences);

    this.logger.log(`Updated notification preferences for user ${userId}`);

    return preferences;
  }
}
