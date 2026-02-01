import { Module } from '@nestjs/common';
import { GraphQLModule as NestGraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'path';

// Resolvers
import { UserResolver } from './resolvers/user.resolver';
import { WalletResolver } from './resolvers/wallet.resolver';
import { TransactionResolver } from './resolvers/transaction.resolver';
import { BeneficiaryResolver } from './resolvers/beneficiary.resolver';

// Loaders
import {
  UserLoader,
  WalletLoader,
  TransactionLoader,
  BeneficiaryLoader,
  LoaderContext,
} from './loaders';

// Import modules that provide repositories
import { UserModule } from '../user/user.module';
import { WalletModule } from '../wallet/wallet.module';
import { TransactionModule } from '../transaction/transaction.module';
import { BeneficiaryModule } from '../beneficiary/beneficiary.module';

@Module({
  imports: [
    NestGraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      sortSchema: true,
      playground: process.env.NODE_ENV !== 'production',
      context: ({ req, res }) => ({ req, res }),
      formatError: (error) => {
        // In production, hide internal error details
        if (process.env.NODE_ENV === 'production') {
          return {
            message: error.message,
            extensions: {
              code: error.extensions?.code,
            },
          };
        }
        return error;
      },
      // Enable introspection in development
      introspection: process.env.NODE_ENV !== 'production',
    }),
    // Import modules that provide repositories
    UserModule,
    WalletModule,
    TransactionModule,
    BeneficiaryModule,
  ],
  providers: [
    // Resolvers
    UserResolver,
    WalletResolver,
    TransactionResolver,
    BeneficiaryResolver,
    // Loaders
    UserLoader,
    WalletLoader,
    TransactionLoader,
    BeneficiaryLoader,
    LoaderContext,
  ],
  exports: [LoaderContext],
})
export class GraphQLModule {}
