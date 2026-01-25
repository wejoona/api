import { Provider } from '@nestjs/common';
import { BalanceMonitorHandlerService } from './balance-monitor-handler.service';
import { NotificationService } from './notification.service';
import { PushNotificationService } from './push-notification.service';

export * from './balance-monitor-handler.service';
export * from './notification.service';
export * from './push-notification.service';

export const Services: Provider[] = [
  NotificationService,
  BalanceMonitorHandlerService,
  PushNotificationService,
];
