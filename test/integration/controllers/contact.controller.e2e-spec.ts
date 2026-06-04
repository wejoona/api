/**
 * Contact Controller Integration Tests
 */
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, TEST_USER } from '../setup/test-app';
import { TestData } from '../setup/mock-helpers';
import { ContactController } from '@modules/contacts/application/controllers/contact.controller';
import { ContactService } from '@modules/contacts/application/services/contact.service';
import { UserRepository } from '@modules/user/infrastructure/repositories';

const mockContactService = {
  createContact: jest.fn(),
  getContacts: jest.fn(),
  getFavorites: jest.fn(),
  getRecents: jest.fn(),
  searchContacts: jest.fn(),
  updateContact: jest.fn(),
  deleteContact: jest.fn(),
  syncContacts: jest.fn(),
  inviteContact: jest.fn(),
};

const mockUserRepository = {
  findActiveVerifiedByPhones: jest.fn(),
  findActiveVerifiedByPhoneHashes: jest.fn(),
  hashPhoneForLookup: jest.fn((phone: string) => `hash:${phone}`),
  maskPhoneForLookup: jest.fn((phone: string) => `${phone.slice(0, 6)}****`),
};

describe('ContactController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const result = await createTestApp({
      controllers: [ContactController],
      providers: [
        { provide: ContactService, useValue: mockContactService },
        { provide: UserRepository, useValue: mockUserRepository },
      ],
    });
    app = result.app;
  });

  afterAll(async () => {
    await app?.close();
  });
  beforeEach(() => {
    jest.clearAllMocks();
    mockUserRepository.hashPhoneForLookup.mockImplementation(
      (phone: string) => `hash:${phone}`,
    );
    mockUserRepository.maskPhoneForLookup.mockImplementation(
      (phone: string) => `${phone.slice(0, 6)}****`,
    );
  });

  describe('POST /api/v1/contacts', () => {
    it('should create contact (201)', async () => {
      mockContactService.createContact.mockResolvedValue(TestData.contact());
      await request(app.getHttpServer())
        .post('/api/v1/contacts')
        .send({ name: 'Jane Doe', phone: '+2250701234569' })
        .expect(201);
    });
  });

  describe('GET /api/v1/contacts', () => {
    it('should list contacts (200)', async () => {
      mockContactService.getContacts.mockResolvedValue([TestData.contact()]);
      await request(app.getHttpServer()).get('/api/v1/contacts').expect(200);
    });
  });

  describe('GET /api/v1/contacts/favorites', () => {
    it('should list favorite contacts (200)', async () => {
      mockContactService.getFavorites.mockResolvedValue([
        TestData.contact({ isFavorite: true }),
      ]);
      await request(app.getHttpServer())
        .get('/api/v1/contacts/favorites')
        .expect(200);
    });
  });

  describe('GET /api/v1/contacts/recents', () => {
    it('should list recent contacts (200)', async () => {
      mockContactService.getRecents.mockResolvedValue([TestData.contact()]);
      await request(app.getHttpServer())
        .get('/api/v1/contacts/recents')
        .expect(200);
    });
  });

  describe('GET /api/v1/contacts/search', () => {
    it('should search contacts (200)', async () => {
      mockContactService.searchContacts.mockResolvedValue([TestData.contact()]);
      await request(app.getHttpServer())
        .get('/api/v1/contacts/search')
        .query({ query: 'Jane' })
        .expect(200);
    });
  });

  describe('PUT /api/v1/contacts/:id', () => {
    it('should update contact (200)', async () => {
      mockContactService.updateContact.mockResolvedValue(
        TestData.contact({ name: 'Updated' }),
      );
      await request(app.getHttpServer())
        .put('/api/v1/contacts/550e8400-e29b-41d4-a716-446655440000')
        .send({ name: 'Updated' })
        .expect(200);
    });
  });

  describe('PUT /api/v1/contacts/:id/favorite', () => {
    it('should toggle favorite (200)', async () => {
      mockContactService.getContacts.mockResolvedValue([
        TestData.contact({
          id: '550e8400-e29b-41d4-a716-446655440000',
          isFavorite: false,
        }),
      ]);
      mockContactService.updateContact.mockResolvedValue(
        TestData.contact({ isFavorite: true }),
      );
      await request(app.getHttpServer())
        .put('/api/v1/contacts/550e8400-e29b-41d4-a716-446655440000/favorite')
        .expect(200);
    });
  });

  describe('DELETE /api/v1/contacts/:id', () => {
    it('should delete contact (200)', async () => {
      mockContactService.deleteContact.mockResolvedValue(undefined);
      await request(app.getHttpServer())
        .delete('/api/v1/contacts/550e8400-e29b-41d4-a716-446655440000')
        .expect(204);
    });
  });

  describe('POST /api/v1/contacts/sync', () => {
    it('should sync contacts (200)', async () => {
      const phoneHash = 'a'.repeat(64);
      mockContactService.syncContacts.mockResolvedValue({
        matches: [],
        totalChecked: 1,
        matchesFound: 0,
      });
      await request(app.getHttpServer())
        .post('/api/v1/contacts/sync')
        .send({ phoneHashes: [phoneHash] })
        .expect(200);

      expect(mockContactService.syncContacts).toHaveBeenCalledWith(
        TEST_USER.id,
        [phoneHash],
      );
    });
  });

  describe('POST /api/v1/contacts/check', () => {
    it('should return an empty result without querying users when permission is denied', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/contacts/check')
        .send({ permissionStatus: 'denied' })
        .expect(200)
        .expect(({ body }) => {
          expect(body).toEqual({ totalChecked: 0, registered: [] });
        });

      expect(
        mockUserRepository.findActiveVerifiedByPhoneHashes,
      ).not.toHaveBeenCalled();
    });

    it('should ignore submitted hashes when contact permission is denied', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/contacts/check')
        .send({
          permissionStatus: 'denied',
          phoneHashes: ['a'.repeat(64)],
        })
        .expect(200)
        .expect(({ body }) => {
          expect(body).toEqual({ totalChecked: 0, registered: [] });
        });

      expect(
        mockUserRepository.findActiveVerifiedByPhoneHashes,
      ).not.toHaveBeenCalled();
    });

    it('should ignore submitted hashes when contact permission is unavailable', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/contacts/check')
        .send({
          permissionStatus: 'unavailable',
          phoneHashes: ['b'.repeat(64)],
        })
        .expect(200)
        .expect(({ body }) => {
          expect(body).toEqual({ totalChecked: 0, registered: [] });
        });

      expect(
        mockUserRepository.findActiveVerifiedByPhoneHashes,
      ).not.toHaveBeenCalled();
    });

    it('should return an empty result without querying users for an empty contact batch', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/contacts/check')
        .send({ permissionStatus: 'granted', phoneHashes: [] })
        .expect(200)
        .expect(({ body }) => {
          expect(body).toEqual({ totalChecked: 0, registered: [] });
        });

      expect(
        mockUserRepository.findActiveVerifiedByPhoneHashes,
      ).not.toHaveBeenCalled();
    });

    it('should return no matches for unknown contact hashes', async () => {
      const unknownHash = 'c'.repeat(64);
      mockUserRepository.findActiveVerifiedByPhoneHashes.mockResolvedValue([]);

      await request(app.getHttpServer())
        .post('/api/v1/contacts/check')
        .send({ permissionStatus: 'granted', phoneHashes: [unknownHash] })
        .expect(200)
        .expect(({ body }) => {
          expect(body).toEqual({ totalChecked: 1, registered: [] });
        });

      expect(
        mockUserRepository.findActiveVerifiedByPhoneHashes,
      ).toHaveBeenCalledWith([unknownHash]);
    });

    it('should return only matched users for partial matches', async () => {
      const knownHash = 'd'.repeat(64);
      const unknownHash = 'e'.repeat(64);
      mockUserRepository.hashPhoneForLookup.mockReturnValue(knownHash);
      mockUserRepository.maskPhoneForLookup.mockReturnValue('+22507****72');
      mockUserRepository.findActiveVerifiedByPhoneHashes.mockResolvedValue([
        {
          id: '550e8400-e29b-41d4-a716-446655440088',
          phone: '+2250701234572',
          displayName: 'Partial Match',
          avatarUrl: null,
        },
      ]);

      await request(app.getHttpServer())
        .post('/api/v1/contacts/check')
        .send({
          permissionStatus: 'limited',
          phoneHashes: [knownHash, unknownHash],
        })
        .expect(200)
        .expect(({ body }) => {
          expect(body.totalChecked).toBe(2);
          expect(body.registered).toEqual([
            {
              phoneHash: knownHash,
              maskedPhone: '+22507****72',
              userId: '550e8400-e29b-41d4-a716-446655440088',
              displayName: 'Partial Match',
              avatarUrl: null,
              isKoridoUser: true,
            },
          ]);
        });
    });

    it('should accept large contact batches and query a deduplicated hash set', async () => {
      const hashes = Array.from({ length: 500 }, (_, index) =>
        index.toString(16).padStart(64, '0'),
      );
      const duplicatedHashes = [...hashes, hashes[0]];
      mockUserRepository.findActiveVerifiedByPhoneHashes.mockResolvedValue([]);

      await request(app.getHttpServer())
        .post('/api/v1/contacts/check')
        .send({ permissionStatus: 'granted', phoneHashes: hashes })
        .expect(200)
        .expect(({ body }) => {
          expect(body).toEqual({ totalChecked: 500, registered: [] });
        });

      expect(
        mockUserRepository.findActiveVerifiedByPhoneHashes,
      ).toHaveBeenCalledWith(hashes);

      await request(app.getHttpServer())
        .post('/api/v1/contacts/check')
        .send({ permissionStatus: 'granted', phoneHashes: duplicatedHashes })
        .expect(400);
    });

    it('should check contact hashes against active verified users and exclude self without returning raw phones', async () => {
      const currentUserHash = 'a'.repeat(64);
      const knownUserHash = 'b'.repeat(64);
      mockUserRepository.hashPhoneForLookup.mockImplementation(
        (phone: string) =>
          phone === TEST_USER.phone ? currentUserHash : knownUserHash,
      );
      mockUserRepository.maskPhoneForLookup.mockReturnValue('+22507****71');
      mockUserRepository.findActiveVerifiedByPhoneHashes.mockResolvedValue([
        {
          id: TEST_USER.id,
          phone: TEST_USER.phone,
          displayName: 'Current User',
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440099',
          phone: '+2250701234571',
          displayName: 'Known User',
          avatarUrl: 'https://example.com/avatar.png',
        },
      ]);

      await request(app.getHttpServer())
        .post('/api/v1/contacts/check')
        .send({ phoneHashes: [currentUserHash, knownUserHash] })
        .expect(200)
        .expect(({ body }) => {
          expect(body.totalChecked).toBe(2);
          expect(body.registered).toEqual([
            {
              phoneHash: knownUserHash,
              maskedPhone: '+22507****71',
              userId: '550e8400-e29b-41d4-a716-446655440099',
              displayName: 'Known User',
              avatarUrl: 'https://example.com/avatar.png',
              isKoridoUser: true,
            },
          ]);
          expect(JSON.stringify(body)).not.toContain('+2250701234571');
        });

      expect(
        mockUserRepository.findActiveVerifiedByPhoneHashes,
      ).toHaveBeenCalledWith([currentUserHash, knownUserHash]);
    });

    it('should hash deprecated raw phone inputs before lookup', async () => {
      mockUserRepository.hashPhoneForLookup.mockImplementation(
        (phone: string) => `hashed-${phone}`,
      );
      mockUserRepository.findActiveVerifiedByPhoneHashes.mockResolvedValue([]);

      await request(app.getHttpServer())
        .post('/api/v1/contacts/check')
        .send({ phoneNumbers: ['+2250701234571'] })
        .expect(200)
        .expect(({ body }) => {
          expect(body).toEqual({ totalChecked: 1, registered: [] });
        });

      expect(
        mockUserRepository.findActiveVerifiedByPhoneHashes,
      ).toHaveBeenCalledWith(['hashed-+2250701234571']);
      expect(
        mockUserRepository.findActiveVerifiedByPhones,
      ).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/contacts/invite', () => {
    it('should invite contact (200)', async () => {
      mockContactService.inviteContact.mockResolvedValue({
        success: true,
        message: 'Invitation sent',
      });
      await request(app.getHttpServer())
        .post('/api/v1/contacts/invite')
        .send({ phone: '+2250701234570' })
        .expect(200);

      expect(mockContactService.inviteContact).toHaveBeenCalledWith(
        TEST_USER.id,
        '+2250701234570',
      );
    });
  });
});
