import { Provider } from '@nestjs/common';
import {
  DeviceTokenRepository,
  DEVICE_TOKEN_REPOSITORY,
} from './device-token.repository';
import {
  NotificationRepository,
  NOTIFICATION_REPOSITORY,
} from './notification.repository';

export * from './device-token.repository';
export * from './notification.repository';

export const Repositories: Provider[] = [
  DeviceTokenRepository,
  {
    provide: DEVICE_TOKEN_REPOSITORY,
    useExisting: DeviceTokenRepository,
  },
  NotificationRepository,
  {
    provide: NOTIFICATION_REPOSITORY,
    useExisting: NotificationRepository,
  },
];
