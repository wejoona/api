/**
 * Notification History Repository
 * In-memory implementation (replace with DB in production)
 */

import { Injectable } from '@nestjs/common';
import { NotificationHistoryEntry } from '../../domain/interfaces/notification.types';

@Injectable()
export class NotificationHistoryRepository {
  private readonly history = new Map<string, NotificationHistoryEntry>();

  async findByUserId(
    userId: string,
    options: { offset?: number; limit?: number; category?: string } = {},
  ): Promise<{ entries: NotificationHistoryEntry[]; total: number }> {
    const { offset = 0, limit = 20, category } = options;

    let entries = Array.from(this.history.values())
      .filter(e => e.userId === userId)
      .filter(e => !category || e.category === category)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const total = entries.length;
    entries = entries.slice(offset, offset + limit);

    return { entries, total };
  }

  async findById(id: string): Promise<NotificationHistoryEntry | null> {
    return this.history.get(id) || null;
  }

  async create(entry: NotificationHistoryEntry): Promise<NotificationHistoryEntry> {
    this.history.set(entry.id, entry);
    return entry;
  }

  async markAsRead(notificationId: string, userId: string): Promise<void> {
    const entry = this.history.get(notificationId);
    if (entry && entry.userId === userId) {
      this.history.set(notificationId, {
        ...entry,
        readAt: new Date(),
      });
    }
  }

  async markAllAsRead(userId: string): Promise<void> {
    const now = new Date();
    for (const [id, entry] of this.history.entries()) {
      if (entry.userId === userId && !entry.readAt) {
        this.history.set(id, { ...entry, readAt: now });
      }
    }
  }

  async getUnreadCount(userId: string): Promise<number> {
    return Array.from(this.history.values())
      .filter(e => e.userId === userId && !e.readAt)
      .length;
  }

  async delete(id: string): Promise<void> {
    this.history.delete(id);
  }

  async deleteOlderThan(date: Date): Promise<number> {
    let deleted = 0;
    for (const [id, entry] of this.history.entries()) {
      if (entry.createdAt < date) {
        this.history.delete(id);
        deleted++;
      }
    }
    return deleted;
  }
}
