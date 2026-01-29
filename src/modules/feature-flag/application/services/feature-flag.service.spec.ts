import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { FeatureFlagService } from './feature-flag.service';
import { FeatureFlagRepository } from '../../domain/repositories/feature-flag.repository';
import { FeatureFlag } from '../../domain/entities/feature-flag.entity';
import { NotFoundException, ConflictException } from '@nestjs/common';

describe('FeatureFlagService', () => {
  let service: FeatureFlagService;
  let repository: jest.Mocked<FeatureFlagRepository>;
  let cacheManager: any;

  const mockFlag = FeatureFlag.create({
    key: 'test_feature',
    name: 'Test Feature',
    description: 'A test feature',
    isEnabled: true,
    rolloutPercentage: 100,
  });

  beforeEach(async () => {
    const mockRepository = {
      findById: jest.fn(),
      findByKey: jest.fn(),
      findAll: jest.fn(),
      findEnabled: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };

    const mockCache = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeatureFlagService,
        {
          provide: FeatureFlagRepository,
          useValue: mockRepository,
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCache,
        },
      ],
    }).compile();

    service = module.get<FeatureFlagService>(FeatureFlagService);
    repository = module.get(FeatureFlagRepository);
    cacheManager = module.get(CACHE_MANAGER);
  });

  describe('isEnabled', () => {
    it('should return false for non-existent flag', async () => {
      repository.findByKey.mockResolvedValue(null);

      const result = await service.isEnabled('non_existent');

      expect(result).toBe(false);
    });

    it('should return true for enabled flag with 100% rollout', async () => {
      repository.findByKey.mockResolvedValue(mockFlag);

      const result = await service.isEnabled('test_feature', {
        userId: 'user-123',
      });

      expect(result).toBe(true);
    });

    it('should return false for disabled flag', async () => {
      const disabledFlag = FeatureFlag.create({
        key: 'disabled_feature',
        name: 'Disabled Feature',
        isEnabled: false,
      });
      repository.findByKey.mockResolvedValue(disabledFlag);

      const result = await service.isEnabled('disabled_feature', {
        userId: 'user-123',
      });

      expect(result).toBe(false);
    });

    it('should respect user whitelist', async () => {
      const flag = FeatureFlag.create({
        key: 'limited_feature',
        name: 'Limited Feature',
        isEnabled: true,
        rolloutPercentage: 0,
      });
      flag.addEnabledUser('user-123');
      repository.findByKey.mockResolvedValue(flag);

      const result = await service.isEnabled('limited_feature', {
        userId: 'user-123',
      });

      expect(result).toBe(true);
    });

    it('should respect user blacklist', async () => {
      const flag = FeatureFlag.create({
        key: 'blocked_feature',
        name: 'Blocked Feature',
        isEnabled: true,
        rolloutPercentage: 100,
      });
      flag.addDisabledUser('user-123');
      repository.findByKey.mockResolvedValue(flag);

      const result = await service.isEnabled('blocked_feature', {
        userId: 'user-123',
      });

      expect(result).toBe(false);
    });

    it('should respect country restrictions', async () => {
      const flag = FeatureFlag.create({
        key: 'country_feature',
        name: 'Country Feature',
        isEnabled: true,
        rolloutPercentage: 100,
      });
      flag.setCountries(['CIV', 'SEN']);
      repository.findByKey.mockResolvedValue(flag);

      const enabledResult = await service.isEnabled('country_feature', {
        userId: 'user-123',
        countryCode: 'CIV',
      });
      expect(enabledResult).toBe(true);

      const disabledResult = await service.isEnabled('country_feature', {
        userId: 'user-123',
        countryCode: 'USA',
      });
      expect(disabledResult).toBe(false);
    });

    it('should respect platform restrictions', async () => {
      const flag = FeatureFlag.create({
        key: 'platform_feature',
        name: 'Platform Feature',
        isEnabled: true,
        rolloutPercentage: 100,
      });
      flag.setPlatforms(['ios', 'android']);
      repository.findByKey.mockResolvedValue(flag);

      const enabledResult = await service.isEnabled('platform_feature', {
        userId: 'user-123',
        platform: 'ios',
      });
      expect(enabledResult).toBe(true);

      const disabledResult = await service.isEnabled('platform_feature', {
        userId: 'user-123',
        platform: 'web',
      });
      expect(disabledResult).toBe(false);
    });

    it('should respect minimum app version', async () => {
      const flag = FeatureFlag.create({
        key: 'version_feature',
        name: 'Version Feature',
        isEnabled: true,
        rolloutPercentage: 100,
      });
      flag.setMinAppVersion('2.0.0');
      repository.findByKey.mockResolvedValue(flag);

      const enabledResult = await service.isEnabled('version_feature', {
        userId: 'user-123',
        appVersion: '2.1.0',
      });
      expect(enabledResult).toBe(true);

      const disabledResult = await service.isEnabled('version_feature', {
        userId: 'user-123',
        appVersion: '1.9.0',
      });
      expect(disabledResult).toBe(false);
    });

    it('should respect percentage rollout deterministically', async () => {
      const flag = FeatureFlag.create({
        key: 'rollout_feature',
        name: 'Rollout Feature',
        isEnabled: true,
        rolloutPercentage: 50,
      });
      repository.findByKey.mockResolvedValue(flag);

      // Same user should get same result
      const result1 = await service.isEnabled('rollout_feature', {
        userId: 'user-123',
      });
      const result2 = await service.isEnabled('rollout_feature', {
        userId: 'user-123',
      });

      expect(result1).toBe(result2);
    });

    it('should respect time window', async () => {
      const flag = FeatureFlag.create({
        key: 'timed_feature',
        name: 'Timed Feature',
        isEnabled: true,
        rolloutPercentage: 100,
      });
      const futureDate = new Date(Date.now() + 86400000); // Tomorrow
      flag.setTimeWindow(futureDate, null);
      repository.findByKey.mockResolvedValue(flag);

      const result = await service.isEnabled('timed_feature', {
        userId: 'user-123',
      });

      expect(result).toBe(false);
    });
  });

  describe('getAllFlags', () => {
    it('should return all flags', async () => {
      repository.findAll.mockResolvedValue([mockFlag]);

      const result = await service.getAllFlags();

      expect(result).toHaveLength(1);
      expect(result[0].key).toBe('test_feature');
    });
  });

  describe('getEnabledFlags', () => {
    it('should return only enabled flags', async () => {
      repository.findEnabled.mockResolvedValue([mockFlag]);

      const result = await service.getEnabledFlags();

      expect(result).toHaveLength(1);
      expect(result[0].isEnabled).toBe(true);
    });
  });

  describe('getFlag', () => {
    it('should return flag by key', async () => {
      repository.findByKey.mockResolvedValue(mockFlag);

      const result = await service.getFlag('test_feature');

      expect(result.key).toBe('test_feature');
    });

    it('should throw NotFoundException if flag not found', async () => {
      repository.findByKey.mockResolvedValue(null);

      await expect(service.getFlag('non_existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('createFlag', () => {
    it('should create a new flag', async () => {
      repository.findByKey.mockResolvedValue(null);
      repository.save.mockResolvedValue(mockFlag);
      repository.findAll.mockResolvedValue([mockFlag]);

      const result = await service.createFlag(
        'new_feature',
        'New Feature',
        'Description',
      );

      expect(repository.save).toHaveBeenCalled();
      expect(result.key).toBe('test_feature');
    });

    it('should throw ConflictException if flag exists', async () => {
      repository.findByKey.mockResolvedValue(mockFlag);

      await expect(
        service.createFlag('test_feature', 'Test Feature'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('updateFlag', () => {
    it('should update flag properties', async () => {
      repository.findByKey.mockResolvedValue(mockFlag);
      repository.save.mockResolvedValue(mockFlag);
      repository.findAll.mockResolvedValue([mockFlag]);

      await service.updateFlag('test_feature', {
        isEnabled: false,
        rolloutPercentage: 25,
      });

      expect(repository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if flag not found', async () => {
      repository.findByKey.mockResolvedValue(null);

      await expect(
        service.updateFlag('non_existent', { isEnabled: false }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('enableForUser', () => {
    it('should add user to enabled list', async () => {
      repository.findByKey.mockResolvedValue(mockFlag);
      repository.save.mockResolvedValue(mockFlag);
      repository.findAll.mockResolvedValue([mockFlag]);

      await service.enableForUser('test_feature', 'user-123');

      expect(repository.save).toHaveBeenCalled();
    });
  });

  describe('disableForUser', () => {
    it('should add user to disabled list', async () => {
      repository.findByKey.mockResolvedValue(mockFlag);
      repository.save.mockResolvedValue(mockFlag);
      repository.findAll.mockResolvedValue([mockFlag]);

      await service.disableForUser('test_feature', 'user-123');

      expect(repository.save).toHaveBeenCalled();
    });
  });

  describe('removeUserOverride', () => {
    it('should remove user from both lists', async () => {
      repository.findByKey.mockResolvedValue(mockFlag);
      repository.save.mockResolvedValue(mockFlag);
      repository.findAll.mockResolvedValue([mockFlag]);

      await service.removeUserOverride('test_feature', 'user-123');

      expect(repository.save).toHaveBeenCalled();
    });
  });

  describe('deleteFlag', () => {
    it('should delete flag', async () => {
      repository.findByKey.mockResolvedValue(mockFlag);
      repository.delete.mockResolvedValue(undefined);
      repository.findAll.mockResolvedValue([]);

      await service.deleteFlag('test_feature');

      expect(repository.delete).toHaveBeenCalledWith('test_feature');
    });

    it('should throw NotFoundException if flag not found', async () => {
      repository.findByKey.mockResolvedValue(null);

      await expect(service.deleteFlag('non_existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getEnabledFlagsForContext', () => {
    it('should return all flags evaluated for context', async () => {
      const flag1 = FeatureFlag.create({
        key: 'feature1',
        name: 'Feature 1',
        isEnabled: true,
        rolloutPercentage: 100,
      });
      const flag2 = FeatureFlag.create({
        key: 'feature2',
        name: 'Feature 2',
        isEnabled: false,
      });

      repository.findAll.mockResolvedValue([flag1, flag2]);
      await service.refreshCache();

      const result = await service.getEnabledFlagsForContext({
        userId: 'user-123',
      });

      expect(result).toHaveProperty('feature1', true);
      expect(result).toHaveProperty('feature2', false);
    });
  });
});
