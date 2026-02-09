import { Module, forwardRef } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { Repositories } from '@modules/transfer/infrastructure/repositories';
import { TransferRepository } from '@modules/transfer/infrastructure/repositories';
import { TRANSFER_REPOSITORY } from '@modules/transfer/domain/repositories/transfer.repository';
import { Queries } from '@modules/transfer/application/queries';
import { Mappers } from '@modules/transfer/infrastructure/mappers';
import { UseCases } from '@modules/transfer/application/domain/usecases';
import { Controllers } from '@modules/transfer/application/controllers';
import { CommandHandlers } from '@modules/transfer/application/commands';
import { OrmEntities } from '@modules/transfer/infrastructure/orm-entities';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Services } from '@modules/transfer/application/domain/services';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([...OrmEntities]),
    CqrsModule,
    forwardRef(() => WalletModule),
  ],
  providers: [
    ...CommandHandlers,
    ...Queries,
    ...Repositories,
    {
      provide: TRANSFER_REPOSITORY,
      useExisting: TransferRepository,
    },
    ...Mappers,
    ...UseCases,
    ...Services,
  ],
  controllers: [...Controllers],
  exports: [...Repositories, TRANSFER_REPOSITORY],
})
export class TransferModule {}
