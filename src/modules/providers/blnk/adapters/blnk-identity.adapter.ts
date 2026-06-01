import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BlnkInit } from '@blnkfinance/blnk-typescript';
import type { Blnk } from '@blnkfinance/blnk-typescript/dist/src/blnk/endpoints/baseBlnkClient';
import type { IdentityDataResponse } from '@blnkfinance/blnk-typescript/dist/src/types/identity';
import type { ApiResponse } from '@blnkfinance/blnk-typescript/dist/src/types/general';

import {
  ILedgerIdentityProvider,
  CreateLedgerIdentityParams,
  LedgerIdentityInfo,
} from '@modules/providers/interfaces/ledger.interface';

/**
 * Blnk Identity Adapter
 *
 * Provides identity linking for:
 * - Linking JoonaPay users to Blnk balances
 * - Lightweight identity tracking (full KYC is via Circle)
 * - Balance ownership verification
 *
 * Note: This is separate from Circle Identity (KYC) - this is just for
 * linking user IDs to ledger balances for ownership tracking.
 */
@Injectable()
export class BlnkIdentityAdapter implements ILedgerIdentityProvider {
  private readonly logger = new Logger(BlnkIdentityAdapter.name);
  private readonly client: Blnk;

  constructor(private readonly configService: ConfigService) {
    const blnkUrl = this.configService.get<string>(
      'blnk.url',
      'http://localhost:5001',
    );
    const blnkApiKey = this.configService.get<string>('blnk.apiKey', '');
    this.client = BlnkInit(blnkApiKey, { baseUrl: blnkUrl });
  }

  async createLedgerIdentity(
    params: CreateLedgerIdentityParams,
  ): Promise<LedgerIdentityInfo> {
    this.logger.log(
      `Creating ledger identity for: ${params.email ?? 'unknown'}`,
    );

    // SDK requires all fields, so we provide defaults for optional ones
    const response = (await this.client.Identity.create({
      identity_type: params.type,
      // Korido registration is phone-first; legal names arrive during KYC.
      // Blnk requires non-empty individual names, so create a provisional
      // ledger identity and update it once verified profile data is available.
      first_name: params.firstName || 'Korido',
      last_name: params.lastName || 'Customer',
      dob: new Date('1970-01-01'),
      gender: 'other',
      email_address: params.email,
      phone_number: params.phone,
      nationality: params.country || 'CI',
      country: params.country || 'CI',
      // Required fields with defaults
      category: 'customer',
      street: 'Not provided',
      state: 'Not provided',
      post_code: '00000',
      city: 'Not provided',
      meta_data: params.metadata,
    })) as unknown as ApiResponse<
      IdentityDataResponse<Record<string, unknown>>
    >;

    if (!response.data) {
      throw new Error(`Failed to create ledger identity: ${response.message}`);
    }

    return this.mapToIdentityInfo(response.data);
  }

  async getLedgerIdentity(
    identityId: string,
  ): Promise<LedgerIdentityInfo | null> {
    this.logger.debug(`Getting ledger identity: ${identityId}`);

    const response = (await this.client.Identity.get(
      identityId,
    )) as unknown as ApiResponse<IdentityDataResponse<Record<string, unknown>>>;

    if (!response.data) {
      return null;
    }

    return this.mapToIdentityInfo(response.data);
  }

  async updateLedgerIdentity(
    identityId: string,
    params: Partial<CreateLedgerIdentityParams>,
  ): Promise<LedgerIdentityInfo> {
    this.logger.log(`Updating ledger identity: ${identityId}`);

    // First get the existing identity
    const existing = await this.getLedgerIdentity(identityId);
    if (!existing) {
      throw new Error(`Ledger identity not found: ${identityId}`);
    }

    const response = (await this.client.Identity.update(identityId, {
      identity_type: params.type ?? existing.type,
      first_name: params.firstName ?? existing.firstName,
      last_name: params.lastName ?? existing.lastName,
      dob: new Date('1970-01-01'),
      gender: 'other',
      email_address: params.email ?? existing.email,
      phone_number: params.phone ?? existing.phone,
      nationality: params.country ?? existing.country ?? 'CI',
      country: params.country ?? existing.country ?? 'CI',
      // Required fields
      category: 'customer',
      street: 'Not provided',
      state: 'Not provided',
      post_code: '00000',
      city: 'Not provided',
      meta_data: params.metadata ?? existing.metadata,
    })) as unknown as ApiResponse<
      IdentityDataResponse<Record<string, unknown>>
    >;

    if (!response.data) {
      throw new Error(`Failed to update ledger identity: ${response.message}`);
    }

    return this.mapToIdentityInfo(response.data);
  }

  async listLedgerIdentities(): Promise<LedgerIdentityInfo[]> {
    this.logger.debug('Listing all ledger identities');

    const response =
      (await this.client.Identity.list()) as unknown as ApiResponse<
        IdentityDataResponse<Record<string, unknown>>[]
      >;

    if (!response.data) {
      return [];
    }

    return response.data.map((i) => this.mapToIdentityInfo(i));
  }

  // ==========================================
  // Helper Methods
  // ==========================================

  private mapToIdentityInfo(
    identity: IdentityDataResponse<Record<string, unknown>>,
  ): LedgerIdentityInfo {
    return {
      identityId: identity.identity_id,
      type: identity.identity_type as 'individual' | 'organization',
      firstName: identity.first_name,
      lastName: identity.last_name,
      email: identity.email_address,
      phone: identity.phone_number,
      country: identity.country,
      createdAt: new Date(identity.created_at),
      metadata: identity.meta_data,
    };
  }
}
