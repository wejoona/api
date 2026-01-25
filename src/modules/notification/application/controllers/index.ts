import { Type } from '@nestjs/common';

export * from './notification.controller';
export * from './push-notification.controller';

import { NotificationController } from './notification.controller';
import { PushNotificationController } from './push-notification.controller';

export const Controllers: Type[] = [
  NotificationController,
  PushNotificationController,
];
