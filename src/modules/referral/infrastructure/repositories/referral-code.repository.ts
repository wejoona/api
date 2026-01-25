/**
 * Referral Code Repository
 * In-memory implementation (replace with DB in production)
 */

import { Injectable } from '@nestjs/common';
import { ReferralCode } from '../../domain/interfaces/referral.types';

@Injectable()
export class ReferralCodeRepository {
  private readonly codes = new Map<string, ReferralCode>();

  async findById(id: string): Promise<ReferralCode | null> {
    return this.codes.get(id) || null;
  }

  async findByCode(code: string): Promise<ReferralCode | null> {
    for (const c of this.codes.values()) {
      if (c.code === code) return c;
    }
    return null;
  }

  async findByUserId(userId: string): Promise<ReferralCode | null> {
    for (const c of this.codes.values()) {
      if (c.userId === userId) return c;
    }
    return null;
  }

  async create(code: ReferralCode): Promise<ReferralCode> {
    this.codes.set(code.id, code);
    return code;
  }

  async update(id: string, updates: Partial<ReferralCode>): Promise<ReferralCode> {
    const existing = this.codes.get(id);
    if (!existing) throw new Error(`Code not found: ${id}`);

    const updated = { ...existing, ...updates };
    this.codes.set(id, updated);
    return updated;
  }

  async incrementUsage(id: string): Promise<void> {
    const existing = this.codes.get(id);
    if (existing) {
      this.codes.set(id, { ...existing, usageCount: existing.usageCount + 1 });
    }
  }

  async deactivate(id: string): Promise<void> {
    const existing = this.codes.get(id);
    if (existing) {
      this.codes.set(id, { ...existing, isActive: false });
    }
  }
}
