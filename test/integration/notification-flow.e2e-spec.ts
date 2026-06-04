import request from 'supertest';
import {
  IntegrationTestSetup,
  TestUser,
  TestUserFactory,
} from './setup';
import { IsNull } from 'typeorm';
import { NotificationOrmEntity } from '../../src/modules/notification/infrastructure/orm-entities/notification.orm-entity';

describe('Notification Flow (Integration)', () => {
  let setup: IntegrationTestSetup;
  let userFactory: TestUserFactory;
  let user: TestUser;

  jest.setTimeout(120000);

  beforeAll(async () => {
    setup = new IntegrationTestSetup();
    await setup.init();
    userFactory = new TestUserFactory(setup.getApp());
    user = await userFactory.createUser('+2250700000801');
  });

  afterAll(async () => {
    await setup?.teardown();
  });

  async function seedNotification(params: {
    title: string;
    status?: 'delivered' | 'read';
    readAt?: Date | null;
  }): Promise<string> {
    const repository = setup
      .getDataSource()
      .getRepository(NotificationOrmEntity);
    const notification = repository.create({
      userId: user.id,
      type: 'transfer_received',
      status: params.status ?? 'delivered',
      title: params.title,
      body: 'You received 50.00 USDC.',
      data: {
        transactionId: '33333333-3333-4333-8333-333333333333',
      },
      referenceType: 'transaction',
      referenceId: '33333333-3333-4333-8333-333333333333',
      sentAt: new Date(),
      deliveredAt: new Date(),
      readAt: params.readAt ?? null,
    });

    const saved = await repository.save(notification);
    return saved.id;
  }

  it('marks one notification and then all notifications as read against persisted state', async () => {
    const firstUnreadId = await seedNotification({ title: 'First unread' });
    const secondUnreadId = await seedNotification({ title: 'Second unread' });
    const alreadyReadId = await seedNotification({
      title: 'Already read',
      status: 'read',
      readAt: new Date(),
    });
    const notificationRepository = setup
      .getDataSource()
      .getRepository(NotificationOrmEntity);

    await expect(
      notificationRepository.count({
        where: { userId: user.id, readAt: IsNull() },
      }),
    ).resolves.toBe(2);

    const unreadResponse = await request(setup.getApp().getHttpServer())
      .get('/notifications/unread-count')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .expect(200);

    expect(unreadResponse.body).toEqual({ count: 2 });

    await request(setup.getApp().getHttpServer())
      .put(`/notifications/${firstUnreadId}/read`)
      .set('Authorization', `Bearer ${user.accessToken}`)
      .expect(204);

    await request(setup.getApp().getHttpServer())
      .get('/notifications')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .expect(200)
      .expect(({ body }) => {
        const payload = body;
        const byId = new Map(
          payload.notifications.map((notification: any) => [
            notification.id,
            notification,
          ]),
        );

        expect(payload.unreadCount).toBe(1);
        expect(byId.get(firstUnreadId)).toEqual(
          expect.objectContaining({
            status: 'read',
            readAt: expect.any(String),
            isUnread: false,
            presentationType: 'transfer',
            severity: 'success',
            action: 'open_transaction',
          }),
        );
        expect(byId.get(secondUnreadId)).toEqual(
          expect.objectContaining({
            status: 'delivered',
            readAt: null,
            isUnread: true,
          }),
        );
        expect(byId.get(alreadyReadId)).toEqual(
          expect.objectContaining({
            status: 'read',
            isUnread: false,
          }),
        );
      });

    await request(setup.getApp().getHttpServer())
      .put('/notifications/read-all')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .expect(204);

    await request(setup.getApp().getHttpServer())
      .get('/notifications/unread/count')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual({ count: 0 });
      });

    const unreadCount = await setup
      .getDataSource()
      .getRepository(NotificationOrmEntity)
      .count({ where: { userId: user.id, readAt: IsNull() } });
    expect(unreadCount).toBe(0);
  });
});
