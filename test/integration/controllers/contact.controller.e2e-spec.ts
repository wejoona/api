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
    it('should check contacts against active verified users and exclude self', async () => {
      mockUserRepository.findActiveVerifiedByPhones.mockResolvedValue([
        {
          id: TEST_USER.id,
          phone: TEST_USER.phone,
          displayName: 'Current User',
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440099',
          phone: '+2250701234571',
          displayName: 'Known User',
        },
      ]);

      await request(app.getHttpServer())
        .post('/api/v1/contacts/check')
        .send({ phoneNumbers: [TEST_USER.phone, '+2250701234571'] })
        .expect(200)
        .expect(({ body }) => {
          expect(body.registered).toEqual([
            {
              phone: '+2250701234571',
              userId: '550e8400-e29b-41d4-a716-446655440099',
              displayName: 'Known User',
            },
          ]);
        });

      expect(
        mockUserRepository.findActiveVerifiedByPhones,
      ).toHaveBeenCalledWith([TEST_USER.phone, '+2250701234571']);
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
