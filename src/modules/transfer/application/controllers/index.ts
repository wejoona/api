import { Type } from '@nestjs/common';
import { TransferController } from './transfer.controller';

export * from './transfer.controller';

export const Controllers: Type[] = [TransferController];
