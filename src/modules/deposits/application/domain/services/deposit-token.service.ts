import { Injectable, Logger } from '@nestjs/common';
import { KeyVaultService } from '../../../../shared/infrastructure/services/key-vault.service';

export interface DepositTokenPayload {
  depositId: string;
  userId: string;
  amount: number;
  provider: string;
  phoneNumber: string;
  timestamp: number;
}

const TOKEN_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

@Injectable()
export class DepositTokenService {
  private readonly logger = new Logger(DepositTokenService.name);

  constructor(private readonly keyVault: KeyVaultService) {}

  encrypt(payload: DepositTokenPayload): string {
    const json = JSON.stringify(payload);
    return this.keyVault.encrypt(json);
  }

  decrypt(token: string): DepositTokenPayload | null {
    try {
      const json = this.keyVault.decrypt(token);
      const payload: DepositTokenPayload = JSON.parse(json);
      const age = Date.now() - payload.timestamp;
      if (age > TOKEN_EXPIRY_MS) {
        this.logger.warn(`Deposit token expired: age=${age}ms, depositId=${payload.depositId}`);
        return null;
      }
      return payload;
    } catch (error) {
      this.logger.error(`Failed to decrypt deposit token: ${error.message}`);
      return null;
    }
  }
}
