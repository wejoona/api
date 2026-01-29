import { Provider } from '@nestjs/common';

export * from './get-user-notifications.usecase';
export * from './mark-notification-read.usecase';
export * from './mark-all-notifications-read.usecase';
export * from './register-device-token.usecase';
export * from './unregister-device-token.usecase';
export * from './unregister-all-device-tokens.usecase';
export * from './get-unread-count.usecase';

import { GetUserNotificationsUseCase } from './get-user-notifications.usecase';
import { MarkNotificationReadUseCase } from './mark-notification-read.usecase';
import { MarkAllNotificationsReadUseCase } from './mark-all-notifications-read.usecase';
import { RegisterDeviceTokenUseCase } from './register-device-token.usecase';
import { UnregisterDeviceTokenUseCase } from './unregister-device-token.usecase';
import { UnregisterAllDeviceTokensUseCase } from './unregister-all-device-tokens.usecase';
import { GetUnreadCountUseCase } from './get-unread-count.usecase';

export const UseCases: Provider[] = [
  GetUserNotificationsUseCase,
  MarkNotificationReadUseCase,
  MarkAllNotificationsReadUseCase,
  RegisterDeviceTokenUseCase,
  UnregisterDeviceTokenUseCase,
  UnregisterAllDeviceTokensUseCase,
  GetUnreadCountUseCase,
];
