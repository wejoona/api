/**
 * Reward Repository
 * In-memory implementation (replace with DB in production)
 */

import { Injectable } from '@nestjs/common';
import {
  Reward,
  RewardStatus,
  RewardType,
} from '../../domain/interfaces/referral.types';

@Injectable()
export class RewardRepository {
  private readonly rewards = new Map<string, Reward>();

  async findById(id: string): Promise<Reward | null> {
    return this.rewards.get(id) || null;
  }

  async findByUserId(userId: string): Promise<Reward[]> {
    return Array.from(this.rewards.values())
      .filter((r) => r.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async findByStatus(status: RewardStatus): Promise<Reward[]> {
    return Array.from(this.rewards.values()).filter((r) => r.status === status);
  }

  async findByType(type: RewardType): Promise<Reward[]> {
    return Array.from(this.rewards.values()).filter((r) => r.type === type);
  }

  async findByReferralId(referralId: string): Promise<Reward[]> {
    return Array.from(this.rewards.values()).filter(
      (r) => r.referralId === referralId,
    );
  }

  async findPendingByUserId(userId: string): Promise<Reward[]> {
    return Array.from(this.rewards.values()).filter(
      (r) => r.userId === userId && r.status === 'pending',
    );
  }

  async findExpired(): Promise<Reward[]> {
    const now = new Date();
    return Array.from(this.rewards.values()).filter(
      (r) => r.status === 'pending' && r.expiresAt && r.expiresAt < now,
    );
  }

  async create(reward: Reward): Promise<Reward> {
    this.rewards.set(reward.id, reward);
    return reward;
  }

  async update(id: string, updates: Partial<Reward>): Promise<Reward> {
    const existing = this.rewards.get(id);
    if (!existing) throw new Error(`Reward not found: ${id}`);

    const updated: Reward = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };
    this.rewards.set(id, updated);
    return updated;
  }

  async updateStatus(id: string, status: RewardStatus): Promise<Reward> {
    return this.update(id, { status });
  }

  async getTotalEarnings(userId: string): Promise<number> {
    const rewards = await this.findByUserId(userId);
    return rewards
      .filter((r) => r.status === 'credited' || r.status === 'claimed')
      .reduce((sum, r) => sum + r.amount, 0);
  }

  async getPendingAmount(userId: string): Promise<number> {
    const rewards = await this.findPendingByUserId(userId);
    return rewards.reduce((sum, r) => sum + r.amount, 0);
  }
}
