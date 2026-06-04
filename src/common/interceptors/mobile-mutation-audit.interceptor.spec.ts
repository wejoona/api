import { CallHandler, ExecutionContext } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { MobileMutationAuditInterceptor } from './mobile-mutation-audit.interceptor';
import { AuditService } from '@/modules/admin/application/services/audit.service';

describe('MobileMutationAuditInterceptor', () => {
  let auditService: jest.Mocked<Pick<AuditService, 'log'>>;
  let interceptor: MobileMutationAuditInterceptor;

  beforeEach(() => {
    auditService = {
      log: jest.fn().mockResolvedValue({}),
    };
    interceptor = new MobileMutationAuditInterceptor(
      auditService as unknown as AuditService,
    );
  });

  function contextFor(request: Record<string, any>): ExecutionContext {
    return {
      getType: () => 'http',
      getClass: () => ({ name: 'WalletController' }),
      getHandler: () => ({ name: 'externalTransfer' }),
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;
  }

  async function flushAudit(): Promise<void> {
    await new Promise((resolve) => setImmediate(resolve));
  }

  it('logs successful mobile mutations with structured support details', async () => {
    const request = {
      method: 'POST',
      originalUrl: '/api/v1/wallet/transfer/external',
      body: {
        amount: 25,
        currency: 'USDC',
        toAddress: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        pin: '1234',
        otp: '123456',
        refreshToken: 'refresh-token-secret',
      },
      params: {},
      query: {},
      headers: {
        'user-agent': 'Jest',
        'x-forwarded-for': '203.0.113.25, 10.0.0.1',
      },
      user: {
        id: 'user-123',
        role: 'user',
      },
      correlationId: 'corr-123',
    };
    const handler: CallHandler = {
      handle: () =>
        of({
          transactionId: 'tx-123',
          walletId: 'wallet-123',
          status: 'pending',
          toAddress: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        }),
    };

    await new Promise<void>((resolve, reject) => {
      interceptor.intercept(contextFor(request), handler).subscribe({
        next: () => resolve(),
        error: reject,
      });
    });
    await flushAudit();

    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 'user-123',
        actorType: 'user',
        action: 'wallet.post',
        resourceType: 'wallet',
        resourceId: 'tx-123',
        ipAddress: '203.0.113.25',
        userAgent: 'Jest',
        details: expect.objectContaining({
          success: true,
          method: 'POST',
          path: '/api/v1/wallet/transfer/external',
          controller: 'WalletController',
          handler: 'externalTransfer',
          correlationId: 'corr-123',
          body: expect.objectContaining({
            amount: 25,
            currency: 'USDC',
            toAddress: '0xaaaa...aaaa',
            pin: '[redacted]',
            otp: '[redacted]',
            refreshToken: '[redacted]',
          }),
          result: expect.objectContaining({
            transactionId: 'tx-123',
            walletId: 'wallet-123',
            status: 'pending',
          }),
        }),
      }),
    );

    const serialized = JSON.stringify(auditService.log.mock.calls[0][0]);
    expect(serialized).not.toContain('1234');
    expect(serialized).not.toContain('123456');
    expect(serialized).not.toContain('refresh-token-secret');
    expect(serialized).not.toContain(
      '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    );
  });

  it('logs failed mobile mutations without leaking notification tokens', async () => {
    const request = {
      method: 'POST',
      originalUrl: '/api/v1/notifications/push/token',
      body: {
        token: 'fcm-token-secret',
        platform: 'ios',
        deviceId: 'device-123',
      },
      params: {},
      query: {},
      headers: {},
      user: { id: 'user-123' },
    };
    const handler: CallHandler = {
      handle: () =>
        throwError(() =>
          Object.assign(new Error('Bad token'), { status: 400 }),
        ),
    };

    await new Promise<void>((resolve) => {
      interceptor.intercept(contextFor(request), handler).subscribe({
        error: () => resolve(),
      });
    });
    await flushAudit();

    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'notifications.post',
        details: expect.objectContaining({
          success: false,
          body: expect.objectContaining({
            token: '[redacted]',
            platform: 'ios',
            deviceId: 'device-123',
          }),
          error: expect.objectContaining({
            statusCode: 400,
            message: 'Bad token',
          }),
        }),
      }),
    );

    expect(JSON.stringify(auditService.log.mock.calls[0][0])).not.toContain(
      'fcm-token-secret',
    );
  });

  it('skips reads and non-mobile operational routes', async () => {
    const readHandler: CallHandler = { handle: () => of({ ok: true }) };

    interceptor
      .intercept(
        contextFor({
          method: 'GET',
          originalUrl: '/api/v1/wallet',
          headers: {},
        }),
        readHandler,
      )
      .subscribe();

    interceptor
      .intercept(
        contextFor({
          method: 'POST',
          originalUrl: '/api/v1/admin/users',
          headers: {},
        }),
        readHandler,
      )
      .subscribe();

    await flushAudit();

    expect(auditService.log).not.toHaveBeenCalled();
  });
});
