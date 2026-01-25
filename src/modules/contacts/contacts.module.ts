import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// ORM Entities
import { ContactOrmEntity } from './infrastructure/orm-entities';

// Repositories
import { ContactRepository } from './infrastructure/repositories';

// Services
import { ContactService } from './application/services';

// Controllers
import { ContactController } from './application/controllers';

// Other modules
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ContactOrmEntity]),
    forwardRef(() => UserModule),
  ],
  controllers: [ContactController],
  providers: [ContactRepository, ContactService],
  exports: [ContactService, ContactRepository],
})
export class ContactsModule {}
