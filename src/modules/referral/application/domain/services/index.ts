import { Provider } from '@nestjs/common';
import { ReferralService } from './referral.service';

export * from './referral.service';

export const Services: Provider[] = [ReferralService];
