import { Provider } from '@nestjs/common';
export * from './get-user-notifications.usecase';
export * from './mark-notification-read.usecase';
export * from './mark-all-notifications-read.usecase';
export * from './register-device-token.usecase';
export * from './unregister-device-token.usecase';
export * from './get-unread-count.usecase';
export declare const UseCases: Provider[];
