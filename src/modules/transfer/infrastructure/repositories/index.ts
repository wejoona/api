import { Provider } from '@nestjs/common';
import { TransferRepository } from './transfer.repository';

export * from './transfer.repository';

export const Repositories: Provider[] = [TransferRepository];
