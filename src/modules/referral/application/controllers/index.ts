import { Type } from '@nestjs/common';
import { ReferralController } from './referral.controller';

export * from './referral.controller';

export const Controllers: Type[] = [ReferralController];
