import { Injectable } from '@nestjs/common';
import { NotificationPreferences } from '../entities';
import { NotificationPreferencesRepository } from '../../../infrastructure/repositories';

export interface GetNotificationPreferencesInput {
  userId: string;
}

@Injectable()
export class GetNotificationPreferencesUsecase {
  constructor(
    private readonly preferencesRepository: NotificationPreferencesRepository,
  ) {}

  /**
   * Get notification preferences for a user
   * Creates default preferences if none exist
   */
  async execute(
    input: GetNotificationPreferencesInput,
  ): Promise<NotificationPreferences> {
    return this.preferencesRepository.getOrCreate(input.userId);
  }
}
