import { NotificationEventListener } from '../event-listeners/notification-event.listener';
import { NotificationService } from './notification.service';

describe('notification fallback behavior', () => {
  it('creates in-app transfer notifications when push delivery fails first', async () => {
    const pushNotificationService = {
      sendTransactionNotification: jest
        .fn()
        .mockRejectedValue(new Error('FCM unavailable')),
    };
    const notificationService = {
      sendToUser: jest.fn().mockResolvedValue({
        notificationId: 'notification-1',
        pushSent: false,
        devicesNotified: 0,
      }),
    };
    const listener = new NotificationEventListener(
      pushNotificationService as any,
      notificationService as any,
    );

    await expect(
      listener.handleTransferReceived({
        userId: 'user-1',
        senderId: 'user-2',
        senderName: 'Ama',
        amount: 25,
        currency: 'USDC',
        transactionId: 'transaction-1',
      }),
    ).resolves.toBeUndefined();

    expect(pushNotificationService.sendTransactionNotification).toHaveBeenCalled();
    expect(notificationService.sendToUser).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        type: 'transfer_received',
        referenceId: 'transaction-1',
      }),
    );
  });

  it('returns a persisted in-app notification when push gateway throws', async () => {
    const pushGateway = {
      send: jest.fn().mockRejectedValue(new Error('gateway down')),
      sendMulticast: jest.fn(),
    };
    const deviceTokenRepository = {
      findActiveByUserId: jest.fn().mockResolvedValue([
        {
          token: 'fcm-token-1',
        },
      ]),
      deactivateToken: jest.fn(),
    };
    const notificationRepository = {
      create: jest.fn().mockResolvedValue({ id: 'notification-1' }),
      markAsSent: jest.fn(),
      markAsFailed: jest.fn(),
    };
    const service = new NotificationService(
      pushGateway as any,
      deviceTokenRepository as any,
      notificationRepository as any,
    );

    await expect(
      service.sendToUser({
        userId: 'user-1',
        type: 'transfer_received',
        title: 'Money Received',
        body: 'You received 25 USDC',
      }),
    ).resolves.toEqual({
      notificationId: 'notification-1',
      pushSent: false,
      devicesNotified: 0,
    });

    expect(notificationRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        type: 'transfer_received',
      }),
    );
    expect(notificationRepository.markAsFailed).toHaveBeenCalledWith(
      'notification-1',
    );
  });
});
