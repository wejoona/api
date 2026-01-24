import { Provider } from '@nestjs/common';
import { ReferralRepository, REFERRAL_REPOSITORY } from './referral.repository';
import {
  ReferralStatsRepository,
  REFERRAL_STATS_REPOSITORY,
} from './referral-stats.repository';

export * from './referral.repository';
export * from './referral-stats.repository';

export const Repositories: Provider[] = [
  ReferralRepository,
  {
    provide: REFERRAL_REPOSITORY,
    useExisting: ReferralRepository,
  },
  ReferralStatsRepository,
  {
    provide: REFERRAL_STATS_REPOSITORY,
    useExisting: ReferralStatsRepository,
  },
];
