/**
 * Contact Controller Integration Tests
 */
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp } from '../setup/test-app';
import { TestData } from '../setup/mock-helpers';

const mockContactService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findFavorites: jest.fn(),
  findRecents: jest.fn(),
  search: jest.fn(),
  update: jest.fn(),
  toggleFavorite: jest.fn(),
  delete: jest.fn(),
  sync: jest.fn(),
  invite: jest.fn(),
};

import { ContactController } from '@modules/contacts/application/controllers/contact.controller';
import { ContactService } from '@modules/contacts/application/services/contact.service';

describe('ContactController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const result = await createTestApp({
      controllers: [ContactController],
      providers: [
        { provide: ContactService, useValue: mockContactService },
      ],
    });
    app = result.app;
  });

  afterAll(async () => { await app?.close(); });
  beforeEach(() => { jest.clearAllMocks(); });

  describe('POST /api/v1/contacts', () => {
    it('should create contact (201)', async () => {
      mockContactService.create.mockResolvedValue(TestData.contact());
      await request(app.getHttpServer())
        .post('/api/v1/contacts')
        .send({ name: 'Jane Doe', phone: '+2250701234569' })
        .expect(201);
    });
  });

  describe('GET /api/v1/contacts', () => {
    it('should list contacts (200)', async () => {
      mockContactService.findAll.mockResolvedValue({ data: [TestData.contact()], total: 1 });
      await request(app.getHttpServer())
        .get('/api/v1/contacts')
        .expect(200);
    });
  });

  describe('GET /api/v1/contacts/favorites', () => {
    it('should list favorite contacts (200)', async () => {
      mockContactService.findFavorites.mockResolvedValue([TestData.contact({ isFavorite: true })]);
      await request(app.getHttpServer())
        .get('/api/v1/contacts/favorites')
        .expect(200);
    });
  });

  describe('GET /api/v1/contacts/recents', () => {
    it('should list recent contacts (200)', async () => {
      mockContactService.findRecents.mockResolvedValue([TestData.contact()]);
      await request(app.getHttpServer())
        .get('/api/v1/contacts/recents')
        .expect(200);
    });
  });

  describe('GET /api/v1/contacts/search', () => {
    it('should search contacts (200)', async () => {
      mockContactService.search.mockResolvedValue([TestData.contact()]);
      await request(app.getHttpServer())
        .get('/api/v1/contacts/search')
        .query({ q: 'Jane' })
        .expect(200);
    });
  });

  describe('PUT /api/v1/contacts/:id', () => {
    it('should update contact (200)', async () => {
      mockContactService.update.mockResolvedValue(TestData.contact({ name: 'Updated' }));
      await request(app.getHttpServer())
        .put('/api/v1/contacts/550e8400-e29b-41d4-a716-446655440000')
        .send({ name: 'Updated' })
        .expect(200);
    });
  });

  describe('PUT /api/v1/contacts/:id/favorite', () => {
    it('should toggle favorite (200)', async () => {
      mockContactService.toggleFavorite.mockResolvedValue(TestData.contact({ isFavorite: true }));
      await request(app.getHttpServer())
        .put('/api/v1/contacts/550e8400-e29b-41d4-a716-446655440000/favorite')
        .expect(200);
    });
  });

  describe('DELETE /api/v1/contacts/:id', () => {
    it('should delete contact (200)', async () => {
      mockContactService.delete.mockResolvedValue(undefined);
      await request(app.getHttpServer())
        .delete('/api/v1/contacts/550e8400-e29b-41d4-a716-446655440000')
        .expect(200);
    });
  });

  describe('POST /api/v1/contacts/sync', () => {
    it('should sync contacts (200)', async () => {
      mockContactService.sync.mockResolvedValue({ synced: 5, matched: 2 });
      await request(app.getHttpServer())
        .post('/api/v1/contacts/sync')
        .send({ contacts: [{ name: 'A', phone: '+2250701234570' }] })
        .expect(200);
    });
  });

  describe('POST /api/v1/contacts/invite', () => {
    it('should invite contact (200)', async () => {
      mockContactService.invite.mockResolvedValue({ success: true });
      await request(app.getHttpServer())
        .post('/api/v1/contacts/invite')
        .send({ phone: '+2250701234570' })
        .expect(200);
    });
  });
});
