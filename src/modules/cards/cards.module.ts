import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// ORM Entities
import { CardOrmEntity } from './infrastructure/orm-entities/card.orm-entity';

// Repositories
import { CardRepository } from './domain/repositories/card.repository';
import { TypeOrmCardRepository } from './infrastructure/repositories/typeorm-card.repository';

// Services
import { CardService } from './application/services/card.service';

// Controllers
import { CardController } from './application/controllers/card.controller';

// Other modules
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CardOrmEntity]),
    forwardRef(() => WalletModule),
  ],
  controllers: [CardController],
  providers: [
    CardService,
    {
      provide: CardRepository,
      useClass: TypeOrmCardRepository,
    },
  ],
  exports: [CardRepository, CardService],
})
export class CardsModule {}
