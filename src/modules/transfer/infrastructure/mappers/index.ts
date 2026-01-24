import { Provider } from '@nestjs/common';
import { TransferMapper } from './transfer.mapper';

export * from './transfer.mapper';

export const Mappers: Provider[] = [TransferMapper];
