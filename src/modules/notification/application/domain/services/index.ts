import { Provider } from '@nestjs/common';
import { BalanceMonitorHandlerService } from './balance-monitor-handler.service';

export * from './balance-monitor-handler.service';

export const Services: Provider[] = [BalanceMonitorHandlerService];
