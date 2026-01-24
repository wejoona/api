import { Type } from '@nestjs/common';

export * from './notification.controller';

import { NotificationController } from './notification.controller';

export const Controllers: Type[] = [NotificationController];
