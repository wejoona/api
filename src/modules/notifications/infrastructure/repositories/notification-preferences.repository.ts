/**
 * Notification Preferences Repository
 * In-memory implementation (replace with DB in production)
 */

import { Injectable } from '@nestjs/common';
import { NotificationPreferences } from '../../domain/interfaces/notification.types';

@Injectable()
export class NotificationPreferencesRepository {
  private readonly preferences = new Map<string, NotificationPreferences>();

  async findByUserId(userId: string): Promise<NotificationPreferences | null> {
    return this.preferences.get(userId) || null;
  }

  async create(prefs: NotificationPreferences): Promise<NotificationPreferences> {
    this.preferences.set(prefs.userId, prefs);
    return prefs;
  }

  async update(
    userId: string,
    updates: Partial<NotificationPreferences>,
  ): Promise<NotificationPreferences> {
    const existing = this.preferences.get(userId);
    if (!existing) {
      throw new Error(`Preferences not found for user: ${userId}`);
    }

    const updated: NotificationPreferences = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };

    this.preferences.set(userId, updated);
    return updated;
  }

  async delete(userId: string): Promise<void> {
    this.preferences.delete(userId);
  }
}
