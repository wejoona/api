// Mock GraphQL models to avoid circular dependency - MUST be before any imports
jest.mock('../models/user.model', () => ({
  UserModel: class UserModel {
    static fromEntity(entity: any) {
      return {
        id: entity.id,
        phone: entity.phone,
        countryCode: entity.countryCode,
        firstName: entity.firstName,
        lastName: entity.lastName,
        email: entity.email,
        displayName: entity.displayName,
        username: entity.username,
        fullName: entity.fullName,
        canTransact: entity.canTransact,
        isPhoneVerified: entity.isPhoneVerified,
      };
    }
  },
}));

jest.mock('../models/wallet.model', () => ({
  WalletModel: class WalletModel {},
}));

jest.mock('../models/transaction.model', () => ({
  TransactionModel: class TransactionModel {},
}));

jest.mock('../models/beneficiary.model', () => ({
  BeneficiaryModel: class BeneficiaryModel {},
}));

import { Test, TestingModule } from '@nestjs/testing';
import { UserRepository } from '@/modules/user/infrastructure/repositories/user.repository';
import { User } from '@/modules/user/application/domain/entities/user.entity';
import { WalletEntity } from '@/modules/wallet/domain/entities/wallet.entity';
import { UserResolver } from './user.resolver';
import { LoaderContext } from '../loaders';

describe('UserResolver', () => {
  let resolver: UserResolver;
  let userRepository: jest.Mocked<UserRepository>;
  let loaders: any;

  beforeEach(async () => {
    // Create mock loaders
    const mockLoaders = {
      user: {
        byId: {
          load: jest.fn(),
        },
        byPhone: {
          load: jest.fn(),
        },
        byUsername: {
          load: jest.fn(),
        },
      },
      wallet: {
        byUserId: {
          load: jest.fn(),
        },
        byId: {
          load: jest.fn(),
        },
      },
      transaction: {
        byWalletId: {
          load: jest.fn(),
        },
      },
      beneficiary: {
        byWalletId: {
          load: jest.fn(),
        },
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserResolver,
        {
          provide: UserRepository,
          useValue: {
            save: jest.fn(),
            findById: jest.fn(),
            findByPhone: jest.fn(),
            findByUsername: jest.fn(),
          },
        },
        {
          provide: LoaderContext,
          useValue: mockLoaders,
        },
      ],
    }).compile();

    resolver = module.get<UserResolver>(UserResolver);
    userRepository = module.get(UserRepository);
    loaders = module.get(LoaderContext);
  });

  describe('getCurrentUser', () => {
    it('should return current user as GraphQL model', async () => {
      const mockUser = User.create({
        phone: '+2250123456789',
        countryCode: 'CI',
      });

      const result = await resolver.getCurrentUser(mockUser);

      expect(result.id).toBe(mockUser.id);
      expect(result.phone).toBe(mockUser.phone);
      expect(result.displayName).toBe(mockUser.displayName);
      expect(result.canTransact).toBe(mockUser.canTransact);
    });

    it('should include computed fields', async () => {
      const mockUser = User.create({
        phone: '+2250123456789',
        countryCode: 'CI',
      });
      mockUser.updateProfile({
        firstName: 'John',
        lastName: 'Doe',
      });

      const result = await resolver.getCurrentUser(mockUser);

      expect(result.fullName).toBe('John Doe');
      expect(result.displayName).toBe('John Doe');
      expect(result.isPhoneVerified).toBe(false);
    });
  });

  describe('user', () => {
    it('should return user by ID using loader', async () => {
      const mockUser = User.create({
        phone: '+2250123456789',
        countryCode: 'CI',
      });

      loaders.user.byId.load.mockResolvedValue(mockUser);

      const result = await resolver.user(mockUser.id);

      expect(loaders.user.byId.load).toHaveBeenCalledWith(mockUser.id);
      expect(result?.id).toBe(mockUser.id);
    });

    it('should return null if user not found', async () => {
      loaders.user.byId.load.mockResolvedValue(null);

      const result = await resolver.user('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('userByPhone', () => {
    it('should return user by phone using loader', async () => {
      const mockUser = User.create({
        phone: '+2250123456789',
        countryCode: 'CI',
      });

      loaders.user.byPhone.load.mockResolvedValue(mockUser);

      const result = await resolver.userByPhone('+2250123456789');

      expect(loaders.user.byPhone.load).toHaveBeenCalledWith('+2250123456789');
      expect(result?.phone).toBe('+2250123456789');
    });
  });

  describe('userByUsername', () => {
    it('should return user by username using loader', async () => {
      const mockUser = User.create({
        phone: '+2250123456789',
        countryCode: 'CI',
      });
      mockUser.setUsername('johndoe');

      loaders.user.byUsername.load.mockResolvedValue(mockUser);

      const result = await resolver.userByUsername('johndoe');

      expect(loaders.user.byUsername.load).toHaveBeenCalledWith('johndoe');
      expect(result?.username).toBe('johndoe');
    });
  });

  describe('updateProfile', () => {
    it('should update user profile', async () => {
      const mockUser = User.create({
        phone: '+2250123456789',
        countryCode: 'CI',
      });

      userRepository.save.mockResolvedValue(mockUser);

      const result = await resolver.updateProfile(
        mockUser,
        'John',
        'Doe',
        'john@example.com',
      );

      expect(userRepository.save).toHaveBeenCalledWith(mockUser);
      expect(result.fullName).toBe('John Doe');
      expect(result.email).toBe('john@example.com');
    });
  });

  describe('setUsername', () => {
    it('should set username', async () => {
      const mockUser = User.create({
        phone: '+2250123456789',
        countryCode: 'CI',
      });

      userRepository.save.mockResolvedValue(mockUser);

      const result = await resolver.setUsername(mockUser, 'johndoe');

      expect(userRepository.save).toHaveBeenCalledWith(mockUser);
      expect(result.username).toBe('johndoe');
    });
  });

  describe('wallet (field resolver)', () => {
    it('should resolve user wallet relation', async () => {
      const mockUser = User.create({
        phone: '+2250123456789',
        countryCode: 'CI',
      });

      const mockWallet = WalletEntity.create({
        userId: mockUser.id,
      });

      loaders.wallet.byUserId.load.mockResolvedValue(mockWallet);

      const userModel = await resolver.getCurrentUser(mockUser);
      const wallet = await resolver.wallet(userModel);

      expect(loaders.wallet.byUserId.load).toHaveBeenCalledWith(mockUser.id);
      expect(wallet?.userId).toBe(mockUser.id);
    });

    it('should return null if wallet not found', async () => {
      const mockUser = User.create({
        phone: '+2250123456789',
        countryCode: 'CI',
      });

      loaders.wallet.byUserId.load.mockResolvedValue(null);

      const userModel = await resolver.getCurrentUser(mockUser);
      const wallet = await resolver.wallet(userModel);

      expect(wallet).toBeNull();
    });
  });

  describe('transactions (field resolver)', () => {
    it('should resolve user transactions through wallet', async () => {
      const mockUser = User.create({
        phone: '+2250123456789',
        countryCode: 'CI',
      });

      const mockWallet = WalletEntity.create({
        userId: mockUser.id,
      });

      loaders.wallet.byUserId.load.mockResolvedValue(mockWallet);
      loaders.transaction.byWalletId.load.mockResolvedValue([]);

      const userModel = await resolver.getCurrentUser(mockUser);
      const transactions = await resolver.transactions(userModel);

      expect(loaders.wallet.byUserId.load).toHaveBeenCalledWith(mockUser.id);
      expect(loaders.transaction.byWalletId.load).toHaveBeenCalledWith(
        mockWallet.id,
      );
      expect(transactions).toEqual([]);
    });

    it('should return empty array if wallet not found', async () => {
      const mockUser = User.create({
        phone: '+2250123456789',
        countryCode: 'CI',
      });

      loaders.wallet.byUserId.load.mockResolvedValue(null);

      const userModel = await resolver.getCurrentUser(mockUser);
      const transactions = await resolver.transactions(userModel);

      expect(transactions).toEqual([]);
    });
  });
});
