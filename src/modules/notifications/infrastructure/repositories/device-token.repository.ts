/**
 * Device Token Repository
 * In-memory implementation (replace with DB in production)
 */

import { Injectable } from '@nestjs/common';
import { DeviceToken } from '../../domain/interfaces/notification.types';

@Injectable()
export class DeviceTokenRepository {
  private readonly tokens = new Map<string, DeviceToken>();

  async findByUserId(userId: string): Promise<DeviceToken[]> {
    return Array.from(this.tokens.values()).filter(t => t.userId === userId);
  }

  async findByToken(token: string): Promise<DeviceToken | null> {
    for (const t of this.tokens.values()) {
      if (t.token === token) return t;
    }
    return null;
  }

  async findById(id: string): Promise<DeviceToken | null> {
    return this.tokens.get(id) || null;
  }

  async create(token: DeviceToken): Promise<DeviceToken> {
    this.tokens.set(token.id, token);
    return token;
  }

  async update(id: string, updates: Partial<DeviceToken>): Promise<DeviceToken> {
    const existing = this.tokens.get(id);
    if (!existing) {
      throw new Error(`Token not found: ${id}`);
    }

    const updated: DeviceToken = {
      ...existing,
      ...updates,
    };

    this.tokens.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    this.tokens.delete(id);
  }

  async deleteByUserId(userId: string): Promise<void> {
    for (const [id, token] of this.tokens.entries()) {
      if (token.userId === userId) {
        this.tokens.delete(id);
      }
    }
  }

  async deactivateOldTokens(userId: string, keepTokenId: string): Promise<void> {
    for (const [id, token] of this.tokens.entries()) {
      if (token.userId === userId && id !== keepTokenId) {
        this.tokens.set(id, { ...token, isActive: false });
      }
    }
  }
}
