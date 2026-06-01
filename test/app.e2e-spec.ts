import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import nock from 'nock';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    process.env.YELLOW_CARD_ENABLED = 'true';
    process.env.YELLOW_CARD_USE_MOCK = 'true';
    process.env.BLNK_API_URL = 'http://localhost:3999/blnk';

    nock(process.env.BLNK_API_URL)
      .post('/ledgers')
      .reply(201, { ledger_id: 'mock-ledger-id', name: 'Test Ledger' })
      .persist();

    nock(process.env.BLNK_API_URL)
      .post('/reconciliation/matching-rules')
      .reply(201, {
        rule_id: 'mock-matching-rule-id',
        created_at: new Date().toISOString(),
      })
      .persist();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    nock.cleanAll();
    await app?.close().catch((error) => {
      if (
        !(error instanceof Error) ||
        !error.message.includes('Connection is closed')
      ) {
        throw error;
      }
    });
    await new Promise((resolve) => setTimeout(resolve, 250));
  });

  it('/health (GET)', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect(({ body }) => {
        expect(body.status).toBe('ok');
        expect(body.timestamp).toBeDefined();
      });
  });
});
