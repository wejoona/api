import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// ORM Entities
import { ApiKeyOrmEntity } from './infrastructure/orm-entities';

// Repositories
import { ApiKeyRepository } from './domain/repositories';
import { TypeOrmApiKeyRepository } from './infrastructure/repositories';

// Services
import { ApiKeyService } from './application/services';

// Controllers
import { ApiKeyController } from './application/controllers';

// Guards
import { ApiKeyAuthGuard } from './application/guards';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([ApiKeyOrmEntity])],
  controllers: [ApiKeyController],
  providers: [
    ApiKeyService,
    ApiKeyAuthGuard,
    {
      provide: ApiKeyRepository,
      useClass: TypeOrmApiKeyRepository,
    },
  ],
  exports: [ApiKeyService, ApiKeyAuthGuard, ApiKeyRepository],
})
export class ApiKeysModule {}
